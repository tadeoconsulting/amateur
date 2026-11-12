// Actualizar un partido que ya se jugó (especificación 019: PATCH /api/matches/:id con `walkover`, `manualEntry` y el
// resultado directo) contra un servidor real: W.O. con ganador y doble, deshacerlo, solo marcador (también un empate de
// eliminación), jugadas a mano sin cronómetro y los permisos de la mesa. Usá una base DE PRUEBA, no producción.
//
//   TEST_BASE_URL=http://localhost:3000 npm run test:api

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client, RUN, newUser, enrollByInvitation } from "./helpers.mjs";

let counter = 0;

/** El día y la hora de Lima (UTC-5) de hace `minutesAgo` minutos: así la ventana de la mesa ya está abierta. */
function limaNow(minutesAgo = 10) {
  const d = new Date(Date.now() - 5 * 3600_000 - minutesAgo * 60_000).toISOString();
  return { date: d.slice(0, 10), time: d.slice(11, 16) };
}

/** Una liga de 2 equipos (con un jugador cada uno) y su único partido, sin empezar, programado para ahora. */
async function league(label) {
  const org = await newUser(`${label}org`, ["ORGANIZADOR"]);
  const clubs = [];
  for (const side of ["local", "visita"]) {
    const owner = await newUser(`${label}${side}`, ["CLUB_OWNER"]);
    const club = await owner.client.post("/api/clubs", { name: `${label} ${side} ${RUN} ${counter++}`, shortName: side.slice(0, 3).toUpperCase() });
    assert.equal(club.status, 201);
    const p = await newUser(`${label}j${side}`);
    const profile = await owner.client.post(`/api/clubs/${club.data.id}/players`, { userId: p.id, position: "Delantero", number: 9 });
    assert.equal(profile.status, 201, JSON.stringify(profile.data));
    clubs.push({ id: club.data.id, owner, player: profile.data.id });
  }
  const t = await org.client.post("/api/tournaments", { name: `Actualizar ${RUN} ${counter++}`, startDate: "2026-10-01", location: "Estadio", format: "liga", maxTeams: 4, status: "inscripcion" });
  assert.equal(t.status, 201, JSON.stringify(t.data));
  for (const c of clubs) assert.equal((await enrollByInvitation(org, t.data.id, { client: c.owner.client, clubId: c.id })).status, 200);
  assert.equal((await org.client.post(`/api/tournaments/${t.data.id}/fixture`, { mode: "manual" })).status, 201);
  const [match] = (await org.client.get(`/api/matches?tournamentId=${t.data.id}`)).data;
  assert.equal((await org.client.patch(`/api/matches/${match.id}`, { ...limaNow(), location: "Cancha" })).status, 200);
  const home = clubs.find((c) => c.id === match.homeTeamId);
  const away = clubs.find((c) => c.id === match.awayTeamId);
  return { org, tournamentId: t.data.id, matchId: match.id, home, away };
}

/** Un cuadro de eliminación de 4 equipos: devuelve el primer partido de la ronda 1 (decisivo) y el organizador. */
async function bracket(label) {
  const org = await newUser(`${label}org`, ["ORGANIZADOR"]);
  const t = await org.client.post("/api/tournaments", { name: `Cuadro ${RUN} ${counter++}`, startDate: "2026-11-01", location: "Estadio", format: "eliminacion", maxTeams: 8, status: "inscripcion" });
  assert.equal(t.status, 201, JSON.stringify(t.data));
  for (let i = 0; i < 4; i++) {
    const r = await org.client.post(`/api/tournaments/${t.data.id}/teams`, { newClub: { name: `Eq ${i + 1} ${RUN}${counter++}`, shortName: `E${i + 1}` } });
    assert.equal(r.status, 201, JSON.stringify(r.data));
  }
  assert.equal((await org.client.post(`/api/tournaments/${t.data.id}/fixture`, { mode: "manual" })).status, 201);
  const matches = (await org.client.get(`/api/matches?tournamentId=${t.data.id}`)).data;
  const first = matches.filter((m) => m.matchday === 1)[0];
  const final = matches.find((m) => m.matchday === 2);
  return { org, tournamentId: t.data.id, matches, first, final };
}

const patch = (s, body) => s.org.client.patch(`/api/matches/${s.matchId}`, body);
const getMatch = async (s) => (await s.org.client.get(`/api/matches/${s.matchId}`)).data;
const standings = async (s) => (await s.org.client.get(`/api/tournaments/${s.tournamentId}/standings`)).data;
const rowOf = (rows, clubId) => rows.find((r) => r.clubId === clubId);

describe("W.O.", () => {
  test("se presentó el local: queda finalizado 3-0, sin cronómetro, y la tabla lo cuenta como un 3-0", async () => {
    const s = await league("wohome");
    const r = await patch(s, { walkover: "home" });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.status, "finalizado");
    assert.equal(r.data.walkover, "home");
    assert.equal(r.data.homeScore, 3);
    assert.equal(r.data.awayScore, 0);
    assert.equal(r.data.startedAt, null, "nunca empezó");
    assert.ok(r.data.finishedAt);

    const rows = await standings(s);
    const h = rowOf(rows, s.home.id);
    const a = rowOf(rows, s.away.id);
    assert.deepEqual([h.played, h.won, h.points, h.goalsFor, h.goalDifference], [1, 1, 3, 3, 3]);
    assert.deepEqual([a.played, a.lost, a.points, a.goalsAgainst, a.goalDifference], [1, 1, 0, 3, -3]);
  });

  test("se presentó el visitante: 0-3 para el visitante", async () => {
    const s = await league("woaway");
    const r = await patch(s, { walkover: "away" });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.deepEqual([r.data.homeScore, r.data.awayScore, r.data.walkover], [0, 3, "away"]);
    const rows = await standings(s);
    assert.equal(rowOf(rows, s.away.id).points, 3);
    assert.equal(rowOf(rows, s.home.id).points, 0);
  });

  test("W.O. doble: 0-0 y 0 puntos para los dos (no un empate)", async () => {
    const s = await league("woboth");
    const r = await patch(s, { walkover: "both" });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.deepEqual([r.data.homeScore, r.data.awayScore, r.data.walkover, r.data.status], [0, 0, "both", "finalizado"]);
    const rows = await standings(s);
    for (const club of [s.home, s.away]) {
      const row = rowOf(rows, club.id);
      assert.deepEqual([row.played, row.drawn, row.lost, row.points, row.goalsFor, row.goalsAgainst], [1, 0, 1, 0, 0, 0]);
    }
  });

  test("deshacer el W.O. lo devuelve a programado, sin marcador, y se puede volver a cargar", async () => {
    const s = await league("woundo");
    assert.equal((await patch(s, { walkover: "home" })).status, 200);
    const undone = await patch(s, { walkover: null });
    assert.equal(undone.status, 200, JSON.stringify(undone.data));
    assert.deepEqual([undone.data.status, undone.data.walkover, undone.data.homeScore, undone.data.awayScore, undone.data.finishedAt], ["programado", null, null, null, null]);
    assert.equal(rowOf(await standings(s), s.home.id).played, 0, "ya no cuenta en la tabla");
    assert.equal((await patch(s, { walkover: "away" })).status, 200, "se puede marcar otro");
  });

  test("no se combina con otros campos, no se repite y no se reabre como partido en juego", async () => {
    const s = await league("wolimits");
    assert.equal((await patch(s, { walkover: "home", homeScore: 5 })).status, 400);
    assert.equal((await patch(s, { walkover: "x" })).status, 400);
    assert.equal((await patch(s, { walkover: null })).status, 409, "no es un W.O.");
    assert.equal((await patch(s, { walkover: "home" })).status, 200);
    assert.equal((await patch(s, { walkover: "away" })).status, 409, "ya es W.O.");
    assert.equal((await patch(s, { status: "en_curso" })).status, 409, "se deshace, no se reabre");
    assert.equal((await patch(s, { homeScore: 1 })).status, 409, "el marcador de un W.O. no se edita");
  });

  test("solo un partido sin empezar admite W.O.", async () => {
    const s = await league("wolive");
    assert.equal((await patch(s, { status: "en_curso" })).status, 200);
    assert.equal((await patch(s, { walkover: "home" })).status, 409);
    const played = await league("wodone");
    assert.equal((await patch(played, { status: "finalizado", homeScore: 1, awayScore: 0 })).status, 200);
    assert.equal((await patch(played, { walkover: "home" })).status, 409);
  });

  test("el último partido del torneo en W.O. lo termina, y deshacerlo lo reabre", async () => {
    const s = await league("wotorneo");
    assert.equal((await patch(s, { walkover: "home" })).status, 200);
    assert.equal((await s.org.client.get(`/api/tournaments/${s.tournamentId}`)).data.status, "finalizado");
    assert.equal((await patch(s, { walkover: null })).status, 200);
    assert.equal((await s.org.client.get(`/api/tournaments/${s.tournamentId}`)).data.status, "en_curso");
  });

  test("en un cuadro de eliminación avanza quien se presentó, no hay W.O. doble y deshacerlo desarma el avance", async () => {
    const b = await bracket("wobr");
    const patchFirst = (body) => b.org.client.patch(`/api/matches/${b.first.id}`, body);
    assert.equal((await patchFirst({ walkover: "both" })).status, 409, "nadie avanzaría");

    const r = await patchFirst({ walkover: "away" });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.winnerTeamId, b.first.awayTeamId);
    const finalAfter = (await b.org.client.get(`/api/matches/${b.final.id}`)).data;
    const slot = b.first.nextMatchSlot === "home" ? finalAfter.homeTeamId : finalAfter.awayTeamId;
    assert.equal(slot, b.first.awayTeamId, "el que se presentó pasa a la final");

    const undone = await patchFirst({ walkover: null });
    assert.equal(undone.status, 200, JSON.stringify(undone.data));
    assert.equal(undone.data.winnerTeamId, null);
    const finalCleared = (await b.org.client.get(`/api/matches/${b.final.id}`)).data;
    assert.equal(b.first.nextMatchSlot === "home" ? finalCleared.homeTeamId : finalCleared.awayTeamId, null);
  });

  test("la mesa y los demás no pueden marcar un W.O.", async () => {
    const s = await league("wopermisos");
    const stranger = await newUser("woajeno", ["ORGANIZADOR"]);
    assert.equal((await stranger.client.patch(`/api/matches/${s.matchId}`, { walkover: "home" })).status, 403);
    assert.equal((await new Client().patch(`/api/matches/${s.matchId}`, { walkover: "home" })).status, 401);

    const mesaEmail = `mesa-wo-${RUN}@test.amateur`;
    const created = await s.org.client.post(`/api/tournaments/${s.tournamentId}/mesa`, { email: mesaEmail, firstName: "Mesa", lastName: "Prueba" });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const mesa = new Client();
    assert.equal((await mesa.post("/api/auth/login", { email: mesaEmail, password: created.data.temporaryPassword })).status, 200);
    assert.equal((await mesa.patch(`/api/matches/${s.matchId}`, { walkover: "home" })).status, 403);
    assert.equal((await mesa.patch(`/api/matches/${s.matchId}`, { status: "en_curso", manualEntry: true })).status, 403);
    assert.equal((await getMatch(s)).status, "programado", "no pasó nada");
  });
});

describe("solo el marcador", () => {
  test("pasa de programado a finalizado con el marcador, sin jugadas ni cronómetro", async () => {
    const s = await league("score");
    const r = await patch(s, { status: "finalizado", homeScore: 2, awayScore: 1 });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.deepEqual([r.data.status, r.data.homeScore, r.data.awayScore, r.data.walkover, r.data.startedAt], ["finalizado", 2, 1, null, null]);
    assert.equal((await s.org.client.get(`/api/matches/${s.matchId}/events`)).data.length, 0);
    const rows = await standings(s);
    assert.equal(rowOf(rows, s.home.id).points, 3);
  });

  test("un empate de liga es un empate de verdad (1 punto cada uno)", async () => {
    const s = await league("scoredraw");
    assert.equal((await patch(s, { status: "finalizado", homeScore: 0, awayScore: 0 })).status, 200);
    const rows = await standings(s);
    assert.deepEqual([rowOf(rows, s.home.id).points, rowOf(rows, s.away.id).points], [1, 1]);
  });

  test("en una liga no se aceptan quién avanza ni penales", async () => {
    const s = await league("scoreliga");
    assert.equal((await patch(s, { status: "finalizado", homeScore: 1, awayScore: 1, winnerTeamId: s.home.id })).status, 409);
    assert.equal((await patch(s, { status: "finalizado", homeScore: 1, awayScore: 1, penaltyHomeScore: 3, penaltyAwayScore: 1 })).status, 409);
    assert.equal((await getMatch(s)).status, "programado");
  });

  test("un cruce de eliminación con ganador avanza solo", async () => {
    const b = await bracket("scorebr");
    const r = await b.org.client.patch(`/api/matches/${b.first.id}`, { status: "finalizado", homeScore: 2, awayScore: 0 });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.winnerTeamId, b.first.homeTeamId);
  });

  test("un empate de eliminación pide quién avanza; los penales son opcionales y deben cuadrar", async () => {
    const b = await bracket("scoretie");
    const patchFirst = (body) => b.org.client.patch(`/api/matches/${b.first.id}`, { status: "finalizado", homeScore: 1, awayScore: 1, ...body });

    assert.equal((await patchFirst({})).status, 409, "falta quién avanza");
    assert.equal((await patchFirst({ winnerTeamId: "otro-club" })).status, 400, "no juega este partido");
    assert.equal((await patchFirst({ winnerTeamId: b.first.homeTeamId, penaltyHomeScore: 3 })).status, 409, "penales de uno solo");
    assert.equal((await patchFirst({ winnerTeamId: b.first.homeTeamId, penaltyHomeScore: 2, penaltyAwayScore: 4 })).status, 409, "el que avanza no ganó la tanda");
    assert.equal((await patchFirst({ winnerTeamId: b.first.homeTeamId, penaltyHomeScore: -1, penaltyAwayScore: 0 })).status, 400);
    assert.equal((await b.org.client.get(`/api/matches/${b.first.id}`)).data.status, "programado", "nada se guardó");

    const ok = await patchFirst({ winnerTeamId: b.first.awayTeamId, penaltyHomeScore: 2, penaltyAwayScore: 4 });
    assert.equal(ok.status, 200, JSON.stringify(ok.data));
    assert.deepEqual([ok.data.winnerTeamId, ok.data.phase, ok.data.penaltyHomeScore, ok.data.penaltyAwayScore], [b.first.awayTeamId, "penales", 2, 4]);
    const finalAfter = (await b.org.client.get(`/api/matches/${b.final.id}`)).data;
    assert.equal(b.first.nextMatchSlot === "home" ? finalAfter.homeTeamId : finalAfter.awayTeamId, b.first.awayTeamId);
  });

  test("un empate de eliminación sin penales también avanza a quien se elija", async () => {
    const b = await bracket("scoretie2");
    const r = await b.org.client.patch(`/api/matches/${b.first.id}`, { status: "finalizado", homeScore: 0, awayScore: 0, winnerTeamId: b.first.homeTeamId });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.deepEqual([r.data.winnerTeamId, r.data.penaltyHomeScore, r.data.penaltyAwayScore], [b.first.homeTeamId, null, null]);
  });

  test("quién avanza y los penales no se aceptan fuera de cargar el resultado de un partido sin empezar", async () => {
    const s = await league("scorefuera");
    assert.equal((await patch(s, { status: "en_curso" })).status, 200);
    assert.equal((await patch(s, { status: "finalizado", winnerTeamId: s.home.id })).status, 400);
  });
});

describe("jugadas a mano", () => {
  test("empieza sin cronómetro ni tiempos, las jugadas llevan el minuto escrito y se finaliza como siempre", async () => {
    const s = await league("manual");
    const r = await patch(s, { status: "en_curso", manualEntry: true });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.deepEqual([r.data.status, r.data.manualEntry, r.data.startedAt, r.data.period], ["en_curso", true, null, null]);

    const goal = await s.org.client.post(`/api/matches/${s.matchId}/events`, { type: "gol", minute: 67, teamId: s.home.id, playerId: s.home.player });
    assert.equal(goal.status, 201, JSON.stringify(goal.data));
    assert.equal(goal.data.minute, 67);
    assert.equal(goal.data.half, null, "sin tiempos");
    assert.equal((await s.org.client.post(`/api/matches/${s.matchId}/events`, { type: "tarjeta_amarilla", minute: 12, teamId: s.away.id })).status, 201);

    const mid = await getMatch(s);
    assert.deepEqual([mid.homeScore, mid.awayScore, mid.startedAt], [1, 0, null], "el marcador sale de los goles");

    const done = await patch(s, { status: "finalizado" });
    assert.equal(done.status, 200, JSON.stringify(done.data));
    assert.deepEqual([done.data.status, done.data.homeScore, done.data.awayScore, done.data.manualEntry, done.data.startedAt], ["finalizado", 1, 0, true, null]);
    const events = (await s.org.client.get(`/api/matches/${s.matchId}/events`)).data;
    assert.deepEqual(events.map((e) => e.minute).sort((x, y) => x - y), [12, 67]);

    // Reabrir conserva la carga manual: sigue sin cronómetro.
    const reopened = await patch(s, { status: "en_curso" });
    assert.equal(reopened.status, 200);
    assert.deepEqual([reopened.data.manualEntry, reopened.data.startedAt, reopened.data.period], [true, null, null]);
  });

  test("un partido normal no se marca como manual, y solo se empieza a mano uno sin empezar", async () => {
    const s = await league("manualno");
    const normal = await patch(s, { status: "en_curso" });
    assert.equal(normal.status, 200);
    assert.deepEqual([normal.data.manualEntry, normal.data.period !== null, normal.data.startedAt !== null], [false, true, true]);

    const started = await league("manualya");
    assert.equal((await patch(started, { status: "en_curso" })).status, 200);
    assert.equal((await patch(started, { status: "en_curso", manualEntry: true })).status, 409);
    assert.equal((await patch(started, { manualEntry: true })).status, 400, "necesita status en_curso");
    assert.equal((await patch(started, { manualEntry: false, status: "en_curso" })).status, 400);
  });

  test("volver a programado un partido manual sin jugadas lo limpia", async () => {
    const s = await league("manualback");
    assert.equal((await patch(s, { status: "en_curso", manualEntry: true })).status, 200);
    const back = await patch(s, { status: "programado" });
    assert.equal(back.status, 200, JSON.stringify(back.data));
    assert.deepEqual([back.data.status, back.data.manualEntry], ["programado", false]);
  });
});
