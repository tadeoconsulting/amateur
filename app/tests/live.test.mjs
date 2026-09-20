// Pruebas del partido en vivo contra un servidor real: estados, jugadas, estadísticas,
// deshacer, tablas y cierre del torneo. Usá una base DE PRUEBA, no producción.
//
//   TEST_BASE_URL=http://localhost:3000 npm run test:api

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client, RUN, newUser } from "./helpers.mjs";

const payload = (overrides = {}) => ({
  name: "Vivo " + RUN,
  startDate: "2026-10-01",
  location: "Estadio Municipal",
  format: "liga",
  maxTeams: 4,
  status: "inscripcion",
  ...overrides,
});

/**
 * Un torneo de 2 equipos con jugadores reales y su único partido ya creado (sin programar).
 * Devuelve ids de torneo, partido, clubes y de un jugador por club.
 */
async function liveSetup(label) {
  const org = await newUser(`${label}org`, ["ORGANIZADOR"]);
  const clubs = [];
  for (const side of ["local", "visita"]) {
    const owner = await newUser(`${label}${side}`, ["CLUB_OWNER"]);
    const club = await owner.client.post("/api/clubs", { name: `${label} ${side} ${RUN}`, shortName: side.slice(0, 3).toUpperCase() });
    assert.equal(club.status, 201);
    const player = await newUser(`${label}jug${side}`);
    const profile = await owner.client.post(`/api/clubs/${club.data.id}/players`, {
      userId: player.id, position: "Delantero", number: 9,
    });
    assert.equal(profile.status, 201, JSON.stringify(profile.data));
    clubs.push({ id: club.data.id, owner, playerId: profile.data.id });
  }

  const t = await org.client.post("/api/tournaments", payload());
  assert.equal(t.status, 201, JSON.stringify(t.data));
  for (const c of clubs) {
    assert.equal((await org.client.post(`/api/tournaments/${t.data.id}/teams`, { clubId: c.id })).status, 201);
  }
  const fx = await org.client.post(`/api/tournaments/${t.data.id}/fixture`, { mode: "manual" });
  assert.equal(fx.status, 201, JSON.stringify(fx.data));
  const [match] = (await org.client.get(`/api/matches?tournamentId=${t.data.id}`)).data;
  return { org, tournamentId: t.data.id, matchId: match.id, home: clubs.find((c) => c.id === match.homeTeamId), away: clubs.find((c) => c.id === match.awayTeamId) };
}

const getMatch = async (client, id) => (await client.get(`/api/matches/${id}`)).data;
const start = (s) => s.org.client.patch(`/api/matches/${s.matchId}`, { status: "en_curso" });
const event = (s, body) => s.org.client.post(`/api/matches/${s.matchId}/events`, body);
const playerStats = async (client, playerId) => (await client.get(`/api/players/${playerId}`)).data.stats;

describe("estados del partido", () => {
  test("solo programado, en_curso y finalizado; en_vivo no existe", async () => {
    const s = await liveSetup("lvst");
    const bad = async (status) => assert.equal((await s.org.client.patch(`/api/matches/${s.matchId}`, { status })).status, 400, status);
    await bad("en_vivo");
    await bad("jugando");
    await bad("");
    await bad(5);
  });

  test("al empezar guarda la hora de inicio y el marcador arranca 0-0", async () => {
    const s = await liveSetup("lvini");
    const before = await getMatch(s.org.client, s.matchId);
    assert.equal(before.homeScore, null);
    assert.equal(before.startedAt, null);

    const t0 = Date.now();
    const r = await start(s);
    assert.equal(r.status, 200, JSON.stringify(r.data));
    const m = await getMatch(s.org.client, s.matchId);
    assert.equal(m.status, "en_curso");
    assert.equal(m.homeScore, 0);
    assert.equal(m.awayScore, 0);
    const startedAt = Date.parse(m.startedAt);
    assert.ok(Math.abs(startedAt - t0) < 15_000, "startedAt es ahora");

    // Volver a pedirlo no reinicia el cronómetro.
    await start(s);
    assert.equal((await getMatch(s.org.client, s.matchId)).startedAt, m.startedAt);
  });

  test("el partido trae los minutos por tiempo del torneo (para la duración)", async () => {
    const s = await liveSetup("lvdur");
    const m = await getMatch(s.org.client, s.matchId);
    assert.ok("minutesPerHalf" in m.tournament);
  });

  test("transiciones: no se pasa de finalizado a programado; sí se reabre", async () => {
    const s = await liveSetup("lvtr");
    assert.equal((await s.org.client.patch(`/api/matches/${s.matchId}`, { status: "finalizado" })).status, 200);
    const back = await s.org.client.patch(`/api/matches/${s.matchId}`, { status: "programado" });
    assert.equal(back.status, 409);
    assert.match(back.data.error, /finalizado/);
    assert.equal((await s.org.client.patch(`/api/matches/${s.matchId}`, { status: "en_curso" })).status, 200, "reabrir");
  });

  test("terminar un partido sin marcador lo deja en 0-0 (las tablas ignoran los vacíos)", async () => {
    const s = await liveSetup("lvcero");
    await s.org.client.patch(`/api/matches/${s.matchId}`, { status: "finalizado" });
    const m = await getMatch(s.org.client, s.matchId);
    assert.equal(m.homeScore, 0);
    assert.equal(m.awayScore, 0);
    const table = (await s.org.client.get(`/api/tournaments/${s.tournamentId}/standings`)).data;
    assert.ok(table.every((r) => r.played === 1 && r.drawn === 1 && r.points === 1), "el 0-0 cuenta en la tabla");
  });

  test("volver a programado: sin jugadas se puede, con jugadas no", async () => {
    const s = await liveSetup("lvprog");
    await start(s);
    const undo = await s.org.client.patch(`/api/matches/${s.matchId}`, { status: "programado" });
    assert.equal(undo.status, 200);
    const m = await getMatch(s.org.client, s.matchId);
    assert.equal(m.startedAt, null);
    assert.equal(m.homeScore, null);

    await start(s);
    assert.equal((await event(s, { type: "gol", minute: 3, teamId: s.home.id })).status, 201);
    const blocked = await s.org.client.patch(`/api/matches/${s.matchId}`, { status: "programado" });
    assert.equal(blocked.status, 409);
    assert.match(blocked.data.error, /jugadas/);
  });

  test("un partido en juego no se reprograma", async () => {
    const s = await liveSetup("lvrep");
    await start(s);
    assert.equal((await s.org.client.patch(`/api/matches/${s.matchId}`, { time: "20:00" })).status, 409);
  });
});

describe("registrar jugadas", () => {
  test("solo con el partido en juego", async () => {
    const s = await liveSetup("lvsolo");
    const early = await event(s, { type: "gol", minute: 1, teamId: s.home.id });
    assert.equal(early.status, 409);
    assert.match(early.data.error, /inícialo/);

    await start(s);
    assert.equal((await event(s, { type: "gol", minute: 1, teamId: s.home.id })).status, 201);

    await s.org.client.patch(`/api/matches/${s.matchId}`, { status: "finalizado" });
    assert.equal((await event(s, { type: "gol", minute: 90, teamId: s.home.id })).status, 409, "ya terminó");
  });

  test("valida tipo, minuto, equipo, jugador y detalle", async () => {
    const s = await liveSetup("lvval");
    await start(s);
    const bad = async (body, why) => assert.equal((await event(s, body)).status, 400, `${why}: ${JSON.stringify(body)}`);

    await bad({ type: "amarilla", minute: 5, teamId: s.home.id }, "es el nombre de la pantalla, no el de la API");
    await bad({ type: "gol" }, "sin minuto");
    await bad({ type: "gol", minute: -1, teamId: s.home.id }, "minuto negativo");
    await bad({ type: "gol", minute: 201, teamId: s.home.id }, "minuto enorme");
    await bad({ type: "gol", minute: 2.5, teamId: s.home.id }, "minuto decimal");
    await bad({ type: "gol", minute: "5", teamId: s.home.id }, "minuto texto");
    await bad({ type: "gol", minute: 5 }, "un gol necesita equipo");
    await bad({ type: "gol", minute: 5, teamId: "otro-club" }, "equipo que no juega");
    await bad({ type: "tarjeta_amarilla", minute: 5, teamId: "otro-club" }, "equipo que no juega (tarjeta)");
    await bad({ type: "gol", minute: 5, teamId: s.home.id, playerId: s.away.playerId }, "jugador del otro equipo");
    await bad({ type: "gol", minute: 5, teamId: s.home.id, playerId: "no-existe" }, "jugador inexistente");
    await bad({ type: "tarjeta_amarilla", minute: 5, playerId: s.home.playerId }, "jugador sin equipo");
    await bad({ type: "gol", minute: 5, teamId: s.home.id, detail: "x".repeat(201) }, "detalle largo");

    const m = await getMatch(s.org.client, s.matchId);
    assert.equal(m.homeScore, 0, "nada de lo rechazado tocó el marcador");
    assert.equal(m.events.length, 0);
  });

  test("un gol suma al marcador y a los goles del jugador; aparece en goleadores", async () => {
    const s = await liveSetup("lvgol");
    await start(s);
    assert.equal((await event(s, { type: "gol", minute: 10, teamId: s.home.id, playerId: s.home.playerId })).status, 201);
    assert.equal((await event(s, { type: "gol", minute: 30, teamId: s.home.id, playerId: s.home.playerId })).status, 201);
    assert.equal((await event(s, { type: "gol", minute: 40, teamId: s.away.id, playerId: s.away.playerId })).status, 201);

    const m = await getMatch(s.org.client, s.matchId);
    assert.equal(m.homeScore, 2);
    assert.equal(m.awayScore, 1);

    const scorers = (await s.org.client.get(`/api/tournaments/${s.tournamentId}/scorers`)).data;
    assert.deepEqual(scorers.map((x) => [x.playerId, x.goals]), [[s.home.playerId, 2], [s.away.playerId, 1]]);
  });

  test("las tarjetas suman a las estadísticas y no tocan el marcador", async () => {
    const s = await liveSetup("lvtarj");
    await start(s);
    await event(s, { type: "tarjeta_amarilla", minute: 12, teamId: s.home.id, playerId: s.home.playerId });
    await event(s, { type: "tarjeta_amarilla", minute: 50, teamId: s.home.id, playerId: s.home.playerId });
    await event(s, { type: "tarjeta_roja", minute: 60, teamId: s.home.id, playerId: s.home.playerId });

    const [stats] = await playerStats(s.org.client, s.home.playerId);
    assert.equal(stats.yellowCards, 2);
    assert.equal(stats.redCards, 1);
    assert.equal(stats.goals, 0);
    const m = await getMatch(s.org.client, s.matchId);
    assert.equal(m.homeScore, 0);
    assert.equal(m.awayScore, 0);
  });

  test("cambios y penales se guardan en la crónica sin cambiar el marcador", async () => {
    const s = await liveSetup("lvcron");
    await start(s);
    assert.equal((await event(s, { type: "sustitucion", minute: 30, teamId: s.home.id, detail: "Entra 12, sale 9" })).status, 201);
    assert.equal((await event(s, { type: "penal", minute: 44, teamId: s.away.id })).status, 201);
    const m = await getMatch(s.org.client, s.matchId);
    assert.equal(m.homeScore + m.awayScore, 0);
    assert.equal(m.events.length, 2);
    const list = (await s.org.client.get(`/api/matches/${s.matchId}/events`)).data;
    assert.deepEqual(list.map((e) => e.type), ["sustitucion", "penal"]);
    assert.equal(list[0].detail, "Entra 12, sale 9");
  });

  test("las jugadas salen ordenadas por minuto y con el jugador", async () => {
    const s = await liveSetup("lvord");
    await start(s);
    await event(s, { type: "gol", minute: 40, teamId: s.away.id, playerId: s.away.playerId });
    await event(s, { type: "gol", minute: 5, teamId: s.home.id, playerId: s.home.playerId });
    const list = (await s.org.client.get(`/api/matches/${s.matchId}/events`)).data;
    assert.deepEqual(list.map((e) => e.minute), [5, 40]);
    assert.equal(list[0].playerId, s.home.playerId);
    assert.ok(list[0].playerName, "trae el nombre del jugador");
  });

  test("solo el organizador registra jugadas; sin sesión no se puede", async () => {
    const s = await liveSetup("lvperm");
    await start(s);
    const stranger = await newUser("lvextra", ["ORGANIZADOR"]);
    const body = { type: "gol", minute: 5, teamId: s.home.id };
    assert.equal((await stranger.client.post(`/api/matches/${s.matchId}/events`, body)).status, 403);
    assert.equal((await new Client().post(`/api/matches/${s.matchId}/events`, body)).status, 401);
    assert.equal((await stranger.client.patch(`/api/matches/${s.matchId}`, { status: "finalizado" })).status, 403);
  });

  test("goles simultáneos: ninguno se pierde", async () => {
    const s = await liveSetup("lvconc");
    await start(s);
    const goals = Array.from({ length: 6 }, (_, i) => event(s, { type: "gol", minute: i + 1, teamId: s.home.id, playerId: s.home.playerId }));
    for (const r of await Promise.all(goals)) assert.equal(r.status, 201);
    assert.equal((await getMatch(s.org.client, s.matchId)).homeScore, 6);
    assert.equal((await playerStats(s.org.client, s.home.playerId))[0].goals, 6);
  });
});

describe("deshacer una jugada", () => {
  test("borrar un gol revierte el marcador y los goles del jugador", async () => {
    const s = await liveSetup("lvdel");
    await start(s);
    const a = await event(s, { type: "gol", minute: 10, teamId: s.home.id, playerId: s.home.playerId });
    await event(s, { type: "gol", minute: 20, teamId: s.home.id, playerId: s.home.playerId });
    assert.equal((await getMatch(s.org.client, s.matchId)).homeScore, 2);

    const del = await s.org.client.del(`/api/matches/${s.matchId}/events/${a.data.id}`);
    assert.equal(del.status, 200);
    const m = await getMatch(s.org.client, s.matchId);
    assert.equal(m.homeScore, 1);
    assert.equal(m.events.length, 1);
    assert.equal((await playerStats(s.org.client, s.home.playerId))[0].goals, 1);
  });

  test("borrar una tarjeta revierte la estadística", async () => {
    const s = await liveSetup("lvdelc");
    await start(s);
    const y = await event(s, { type: "tarjeta_amarilla", minute: 10, teamId: s.away.id, playerId: s.away.playerId });
    assert.equal((await playerStats(s.org.client, s.away.playerId))[0].yellowCards, 1);
    await s.org.client.del(`/api/matches/${s.matchId}/events/${y.data.id}`);
    assert.equal((await playerStats(s.org.client, s.away.playerId))[0].yellowCards, 0);
  });

  test("no se puede borrar dos veces, ni la jugada de otro partido, ni sin permiso", async () => {
    const s = await liveSetup("lvdel2");
    const other = await liveSetup("lvdel3");
    await start(s);
    await start(other);
    const e = await event(s, { type: "gol", minute: 5, teamId: s.home.id });
    const path = `/api/matches/${s.matchId}/events/${e.data.id}`;

    assert.equal((await new Client().del(path)).status, 401);
    assert.equal((await other.org.client.del(path)).status, 403, "otro organizador");
    // La jugada existe, pero en otro partido: es un 404 en éste.
    const mine = await event(other, { type: "gol", minute: 5, teamId: other.home.id });
    assert.equal((await s.org.client.del(`/api/matches/${s.matchId}/events/${mine.data.id}`)).status, 404);

    assert.equal((await s.org.client.del(path)).status, 200);
    assert.equal((await s.org.client.del(path)).status, 404, "ya no existe");
    assert.equal((await getMatch(s.org.client, s.matchId)).homeScore, 0, "no baja de 0 por borrar dos veces");
  });

  test("con el partido terminado hay que reabrirlo para corregir", async () => {
    const s = await liveSetup("lvdel4");
    await start(s);
    const e = await event(s, { type: "gol", minute: 5, teamId: s.home.id });
    await s.org.client.patch(`/api/matches/${s.matchId}`, { status: "finalizado" });
    const path = `/api/matches/${s.matchId}/events/${e.data.id}`;

    const blocked = await s.org.client.del(path);
    assert.equal(blocked.status, 409);
    assert.match(blocked.data.error, /Reabre/);

    await start(s); // reabrir
    assert.equal((await s.org.client.del(path)).status, 200);
    assert.equal((await getMatch(s.org.client, s.matchId)).homeScore, 0);
  });
});

describe("terminar el partido y el torneo", () => {
  test("al finalizar, la tabla suma los puntos del resultado", async () => {
    const s = await liveSetup("lvtab");
    await start(s);
    await event(s, { type: "gol", minute: 10, teamId: s.home.id });
    await event(s, { type: "gol", minute: 20, teamId: s.home.id });
    await event(s, { type: "gol", minute: 30, teamId: s.away.id });

    // En juego todavía no cuenta.
    const live = (await s.org.client.get(`/api/tournaments/${s.tournamentId}/standings`)).data;
    assert.ok(live.every((r) => r.played === 0), "un partido en juego no está en la tabla");

    assert.equal((await s.org.client.patch(`/api/matches/${s.matchId}`, { status: "finalizado" })).status, 200);
    const table = (await s.org.client.get(`/api/tournaments/${s.tournamentId}/standings`)).data;
    assert.equal(table[0].clubId, s.home.id);
    assert.equal(table[0].points, 3);
    assert.equal(table[0].goalsFor, 2);
    assert.equal(table[1].clubId, s.away.id);
    assert.equal(table[1].points, 0);
  });

  test("al terminar el último partido el torneo pasa a finalizado, y vuelve a en_curso si se reabre", async () => {
    const s = await liveSetup("lvfin");
    const status = async () => (await s.org.client.get(`/api/tournaments/${s.tournamentId}`)).data.status;
    assert.equal(await status(), "en_curso");

    await s.org.client.patch(`/api/matches/${s.matchId}`, { status: "finalizado" });
    assert.equal(await status(), "finalizado");

    await start(s);
    assert.equal(await status(), "en_curso");
  });

  test("con partidos pendientes el torneo sigue en curso", async () => {
    const org = await newUser("lvpend", ["ORGANIZADOR"]);
    const t = await org.client.post("/api/tournaments", payload({ maxTeams: 4 }));
    for (let i = 1; i <= 3; i++) {
      await org.client.post(`/api/tournaments/${t.data.id}/teams`, { newClub: { name: `Pend ${i} ${RUN}`, shortName: `P${i}` } });
    }
    await org.client.post(`/api/tournaments/${t.data.id}/fixture`, { mode: "manual" });
    const matches = (await org.client.get(`/api/matches?tournamentId=${t.data.id}`)).data;
    assert.equal(matches.length, 3);
    await org.client.patch(`/api/matches/${matches[0].id}`, { status: "finalizado" });
    assert.equal((await org.client.get(`/api/tournaments/${t.data.id}`)).data.status, "en_curso");
  });
});

describe("jugadores del club", () => {
  test("la lista trae el nombre dentro de `user`, como espera la app", async () => {
    const s = await liveSetup("lvplay");
    const r = await s.org.client.get(`/api/clubs/${s.home.id}/players`);
    assert.equal(r.status, 200);
    assert.equal(r.data.length, 1);
    const p = r.data[0];
    assert.equal(p.id, s.home.playerId);
    assert.ok(p.user.firstName && p.user.lastName, "user.firstName / user.lastName");
    assert.equal(p.position, "Delantero");
    assert.equal(p.number, 9);
    assert.equal(p.firstName, undefined, "ya no viene plano");
    assert.equal(p.user.birthDate, null, "la fecha de nacimiento solo la ve quien gestiona el club");
  });
});
