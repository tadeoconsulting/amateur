// Pruebas de editar una jugada (especificación 018: PATCH y DELETE /api/matches/:id/events/:eventId) contra un servidor real:
// el minuto se conserva, el jugador se cambia o se asigna, las estadísticas se mueven, y también se corrige con el partido
// finalizado. Incluye a la mesa. Usá una base DE PRUEBA, no producción.
//
//   TEST_BASE_URL=http://localhost:3000 npm run test:api

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client, RUN, newUser, enrollByInvitation } from "./helpers.mjs";

/** El día y la hora de Lima (UTC-5) de hace `minutesAgo` minutos: así la ventana de la mesa ya está abierta. */
function limaNow(minutesAgo = 10) {
  const d = new Date(Date.now() - 5 * 3600_000 - minutesAgo * 60_000).toISOString();
  return { date: d.slice(0, 10), time: d.slice(11, 16) };
}

/**
 * Un torneo de 2 equipos con dos jugadores cada uno y su único partido, programado para ahora (en hora de Lima) y ya en
 * juego. Devuelve los ids y un cliente de mesa asignado al torneo.
 */
async function setup(label) {
  const org = await newUser(`${label}org`, ["ORGANIZADOR"]);
  const clubs = [];
  for (const side of ["local", "visita"]) {
    const owner = await newUser(`${label}${side}`, ["CLUB_OWNER"]);
    const club = await owner.client.post("/api/clubs", { name: `${label} ${side} ${RUN}`, shortName: side.slice(0, 3).toUpperCase() });
    assert.equal(club.status, 201);
    const players = [];
    for (const n of [9, 10]) {
      const p = await newUser(`${label}j${side}${n}`);
      const profile = await owner.client.post(`/api/clubs/${club.data.id}/players`, { userId: p.id, position: "Delantero", number: n });
      assert.equal(profile.status, 201, JSON.stringify(profile.data));
      players.push(profile.data.id);
    }
    clubs.push({ id: club.data.id, owner, players });
  }

  const t = await org.client.post("/api/tournaments", { name: `Jugadas ${RUN}`, startDate: "2026-10-01", location: "Estadio", format: "liga", maxTeams: 4, status: "inscripcion" });
  assert.equal(t.status, 201, JSON.stringify(t.data));
  for (const c of clubs) assert.equal((await enrollByInvitation(org, t.data.id, { client: c.owner.client, clubId: c.id })).status, 200);
  assert.equal((await org.client.post(`/api/tournaments/${t.data.id}/fixture`, { mode: "manual" })).status, 201);
  const [match] = (await org.client.get(`/api/matches?tournamentId=${t.data.id}`)).data;
  const home = clubs.find((c) => c.id === match.homeTeamId);
  const away = clubs.find((c) => c.id === match.awayTeamId);

  // Programado para ahora: la mesa solo entra el día de juego, con la ventana abierta.
  assert.equal((await org.client.patch(`/api/matches/${match.id}`, { ...limaNow(), location: "Cancha" })).status, 200);

  const mesaEmail = `mesa-${label}-${RUN}@test.amateur`;
  const created = await org.client.post(`/api/tournaments/${t.data.id}/mesa`, { email: mesaEmail, firstName: "Mesa", lastName: "Prueba" });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const mesa = new Client();
  assert.equal((await mesa.post("/api/auth/login", { email: mesaEmail, password: created.data.temporaryPassword })).status, 200);

  assert.equal((await org.client.patch(`/api/matches/${match.id}`, { status: "en_curso" })).status, 200);
  return { org, mesa, tournamentId: t.data.id, matchId: match.id, home, away };
}

const url = (s, eventId) => `/api/matches/${s.matchId}/events/${eventId}`;
const goal = async (s, body = {}) => {
  const r = await s.org.client.post(`/api/matches/${s.matchId}/events`, { type: "gol", minute: 12, teamId: s.home.id, playerId: s.home.players[0], ...body });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return r.data;
};
// `stats` es una fila por torneo (y no hay ninguna si el jugador nunca sumó): se suman, con 0 por omisión.
const stats = async (s, playerId) => {
  const rows = (await s.org.client.get(`/api/players/${playerId}`)).data.stats ?? [];
  const sum = (key) => rows.reduce((total, r) => total + (r[key] ?? 0), 0);
  return { goals: sum("goals"), yellowCards: sum("yellowCards"), redCards: sum("redCards") };
};
const match = async (s) => (await s.org.client.get(`/api/matches/${s.matchId}`)).data;
const eventOf = async (s, id) => (await s.org.client.get(`/api/matches/${s.matchId}/events`)).data.find((e) => e.id === id);

describe("cambiar el jugador de un gol", () => {
  test("el minuto se conserva y los goles pasan del jugador anterior al nuevo", async () => {
    const s = await setup("ejg1");
    const e = await goal(s, { minute: 37 });
    const [a, b] = s.home.players;
    assert.equal((await stats(s, a)).goals, 1);

    const r = await s.org.client.patch(url(s, e.id), { playerId: b });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.minute, 37, "el minuto no se pierde");
    assert.equal(r.data.playerId, b);

    assert.equal((await stats(s, a)).goals, 0, "se le quitó al anterior");
    assert.equal((await stats(s, b)).goals, 1, "se le sumó al nuevo");
    const m = await match(s);
    assert.equal(m.homeScore, 1, "el marcador no cambia");
    assert.equal((await eventOf(s, e.id)).minute, 37);
  });

  test("corregir solo el minuto deja al jugador como estaba", async () => {
    const s = await setup("ejg2");
    const e = await goal(s, { minute: 20 });
    const r = await s.org.client.patch(url(s, e.id), { minute: 21 });
    assert.equal(r.status, 200);
    assert.deepEqual([r.data.minute, r.data.playerId], [21, s.home.players[0]]);
    assert.equal((await stats(s, s.home.players[0])).goals, 1, "las estadísticas no se tocan");
  });

  test("se pueden cambiar el minuto y el jugador a la vez", async () => {
    const s = await setup("ejg3");
    const e = await goal(s, { minute: 5 });
    const r = await s.org.client.patch(url(s, e.id), { minute: 6, playerId: s.home.players[1] });
    assert.equal(r.status, 200);
    assert.deepEqual([r.data.minute, r.data.playerId], [6, s.home.players[1]]);
  });

  test("a un gol sin jugador se le asigna uno, y se le puede quitar", async () => {
    const s = await setup("ejg4");
    const e = await goal(s, { playerId: undefined, minute: 44 });
    assert.equal(e.playerId, null);
    const p = s.home.players[0];

    assert.equal((await s.org.client.patch(url(s, e.id), { playerId: p })).status, 200);
    assert.equal((await stats(s, p)).goals, 1, "asignarlo suma");
    assert.equal((await eventOf(s, e.id)).minute, 44);

    const r = await s.org.client.patch(url(s, e.id), { playerId: null });
    assert.equal(r.status, 200);
    assert.equal(r.data.playerId, null);
    assert.equal((await stats(s, p)).goals, 0, "quitarlo resta");
  });

  test("un jugador del otro equipo se rechaza con 400 y no cambia nada", async () => {
    const s = await setup("ejg5");
    const e = await goal(s);
    const r = await s.org.client.patch(url(s, e.id), { playerId: s.away.players[0] });
    assert.equal(r.status, 400);
    assert.match(r.data.error, /no pertenece al equipo/);
    assert.equal((await eventOf(s, e.id)).playerId, s.home.players[0]);
    assert.equal((await stats(s, s.home.players[0])).goals, 1);
  });

  test("cuerpos inválidos dan 400 y una jugada inexistente 404", async () => {
    const s = await setup("ejg6");
    const e = await goal(s);
    for (const body of [{}, { minute: -1 }, { minute: 201 }, { minute: 1.5 }, { playerId: "" }, { playerId: 7 }]) {
      assert.equal((await s.org.client.patch(url(s, e.id), body)).status, 400, JSON.stringify(body));
    }
    assert.equal((await s.org.client.patch(url(s, "no-existe"), { minute: 3 })).status, 404);
  });
});

describe("tarjetas y otras jugadas", () => {
  test("el jugador de una tarjeta amarilla se cambia y la tarjeta se mueve con él", async () => {
    const s = await setup("ejt1");
    const [a, b] = s.home.players;
    const y = await s.org.client.post(`/api/matches/${s.matchId}/events`, { type: "tarjeta_amarilla", minute: 30, teamId: s.home.id, playerId: a });
    assert.equal(y.status, 201);
    assert.equal((await stats(s, a)).yellowCards, 1);

    const r = await s.org.client.patch(url(s, y.data.id), { playerId: b });
    assert.equal(r.status, 200);
    assert.equal(r.data.minute, 30);
    assert.equal((await stats(s, a)).yellowCards, 0);
    assert.equal((await stats(s, b)).yellowCards, 1);
  });

  test("a un cambio no se le cambia el jugador (tiene dos), pero sí el minuto", async () => {
    const s = await setup("ejt2");
    const [a, b] = s.home.players;
    const sub = await s.org.client.post(`/api/matches/${s.matchId}/events`, { type: "sustitucion", minute: 60, teamId: s.home.id, playerId: a, playerInId: b });
    assert.equal(sub.status, 201, JSON.stringify(sub.data));
    const r = await s.org.client.patch(url(s, sub.data.id), { playerId: b });
    assert.equal(r.status, 400);
    assert.match(r.data.error, /gol o de una tarjeta/);
    assert.equal((await s.org.client.patch(url(s, sub.data.id), { minute: 61 })).status, 200);
  });
});

describe("con el partido finalizado", () => {
  test("se corrigen minuto y jugador sin reabrir, y se puede eliminar un gol", async () => {
    const s = await setup("ejf1");
    const e = await goal(s, { minute: 15 });
    assert.equal((await s.org.client.patch(`/api/matches/${s.matchId}`, { status: "finalizado" })).status, 200);

    const r = await s.org.client.patch(url(s, e.id), { minute: 16, playerId: s.home.players[1] });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.deepEqual([r.data.minute, r.data.playerId], [16, s.home.players[1]]);
    assert.equal((await match(s)).status, "finalizado", "no se reabrió");

    const d = await s.org.client.del(url(s, e.id));
    assert.equal(d.status, 200, JSON.stringify(d.data));
    assert.equal((await match(s)).homeScore, 0, "el marcador se corrige");
    assert.equal((await stats(s, s.home.players[1])).goals, 0, "y las estadísticas también");
    assert.equal(await eventOf(s, e.id), undefined);
  });
});

describe("eliminar un gol", () => {
  test("borra todo: la jugada, el marcador y los goles del jugador", async () => {
    const s = await setup("ejd1");
    const e = await goal(s);
    assert.equal((await match(s)).homeScore, 1);
    assert.equal((await s.org.client.del(url(s, e.id))).status, 200);
    assert.equal((await match(s)).homeScore, 0);
    assert.equal((await stats(s, s.home.players[0])).goals, 0);
    assert.equal((await s.org.client.del(url(s, e.id))).status, 404, "borrar dos veces da 404");
  });
});

describe("la mesa", () => {
  test("dentro de su horario corrige el jugador y el minuto de un gol, y lo puede eliminar", async () => {
    const s = await setup("ejm1");
    const e = await goal(s, { minute: 22 });

    const r = await s.mesa.patch(url(s, e.id), { playerId: s.home.players[1] });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.minute, 22, "el minuto se conserva también para la mesa");
    assert.equal((await stats(s, s.home.players[1])).goals, 1);

    assert.equal((await s.mesa.patch(url(s, e.id), { minute: 23 })).status, 200);
    assert.equal((await s.mesa.del(url(s, e.id))).status, 200);
    assert.equal((await match(s)).homeScore, 0);
  });

  test("también con el partido ya finalizado, mientras dure su horario, sin poder reabrirlo", async () => {
    const s = await setup("ejm2");
    const e = await goal(s, { minute: 50 });
    assert.equal((await s.org.client.patch(`/api/matches/${s.matchId}`, { status: "finalizado" })).status, 200);

    assert.equal((await s.mesa.patch(url(s, e.id), { playerId: s.home.players[1] })).status, 200);
    assert.equal((await s.mesa.patch(`/api/matches/${s.matchId}`, { status: "en_curso" })).status, 403, "la mesa no reabre");
  });

  test("otra cuenta (ni mesa del torneo ni organizador) no puede editar jugadas", async () => {
    const s = await setup("ejm3");
    const e = await goal(s);
    const outsider = await newUser("ejm3out", ["ORGANIZADOR"]);
    assert.equal((await outsider.client.patch(url(s, e.id), { minute: 1 })).status, 403);
    assert.equal((await outsider.client.del(url(s, e.id))).status, 403);
    assert.equal((await new Client().patch(url(s, e.id), { minute: 1 })).status, 401);
  });
});
