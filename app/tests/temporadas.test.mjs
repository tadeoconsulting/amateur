// Pruebas de temporadas (especificación 012) contra un servidor real.
// Mismas instrucciones que auth.test.mjs: usá una base DE PRUEBA, no producción.
//
//   TEST_BASE_URL=http://localhost:3000 npm run test:api

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { RUN, newUser } from "./helpers.mjs";

const organizer = (label) => newUser(label, ["ORGANIZADOR"]);
const getMatches = async (client, tournamentId) => (await client.get(`/api/matches?tournamentId=${tournamentId}`)).data;

let leagueCount = 0;
/** Una liga con `teams` equipos temporales inscritos, sin fixture. */
async function leagueWith(org, teams, overrides = {}) {
  const t = await org.client.post("/api/tournaments", {
    name: `Apertura ${RUN} ${leagueCount++}`,
    startDate: "2026-03-01",
    location: "Estadio Municipal",
    format: "liga",
    maxTeams: teams,
    status: "inscripcion",
    minutesPerHalf: 25,
    ...overrides,
  });
  assert.equal(t.status, 201, JSON.stringify(t.data));
  for (let i = 0; i < teams; i++) {
    const r = await org.client.post(`/api/tournaments/${t.data.id}/teams`, {
      newClub: { name: `Equipo ${i + 1} ${RUN}${Math.random().toString(36).slice(2, 6)}`, shortName: `E${i + 1}` },
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
  }
  return t.data.id;
}

/** Termina los partidos con rivales definidos que faltan jugar; por omisión el local gana 2-0. */
async function finishAll(org, tournamentId, score = () => [2, 0]) {
  for (const m of await getMatches(org.client, tournamentId)) {
    if (m.status === "finalizado" || !m.homeTeamId || !m.awayTeamId) continue;
    const [homeScore, awayScore] = score(m);
    await org.client.patch(`/api/matches/${m.id}`, { status: "en_curso" });
    const r = await org.client.patch(`/api/matches/${m.id}`, { status: "finalizado", homeScore, awayScore });
    assert.equal(r.status, 200, JSON.stringify(r.data));
  }
}

/** Genera el fixture y juega todo. En un cuadro, ronda por ronda hasta la final. */
async function playTournament(org, tournamentId) {
  const fx = await org.client.post(`/api/tournaments/${tournamentId}/fixture`, { mode: "manual" });
  assert.equal(fx.status, 201, JSON.stringify(fx.data));
  for (let round = 0; round < 6; round++) await finishAll(org, tournamentId);
  const detail = await org.client.get(`/api/tournaments/${tournamentId}`);
  assert.equal(detail.data.status, "finalizado");
}

async function createSeason(org, aperturaId, overrides = {}) {
  return org.client.post("/api/seasons", { name: `Temporada ${RUN} ${leagueCount++}`, aperturaId, finalFormat: "llaves", finalTeams: 4, ...overrides });
}

describe("crear una temporada", () => {
  test("antes de crear el Clausura, la Apertura todavía suma equipos", async () => {
    const org = await organizer("temp0");
    const aperturaId = await leagueWith(org, 3, { maxTeams: 4 });
    assert.equal((await createSeason(org, aperturaId)).status, 201);
    const add = await org.client.post(`/api/tournaments/${aperturaId}/teams`, { newClub: { name: `Cuarto ${RUN}`, shortName: "C4" } });
    assert.equal(add.status, 201, JSON.stringify(add.data));
  });

  test("sobre una liga: queda como su Apertura, en estado apertura", async () => {
    const org = await organizer("temp1");
    const aperturaId = await leagueWith(org, 4);
    const r = await createSeason(org, aperturaId);
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.equal(r.data.status, "apertura");
    assert.equal(r.data.teamsCount, 4);
    assert.deepEqual(r.data.tournaments.map((t) => [t.id, t.stage]), [[aperturaId, "apertura"]]);

    const t = await org.client.get(`/api/tournaments/${aperturaId}`);
    assert.equal(t.data.seasonId, r.data.id);
    assert.equal(t.data.seasonStage, "apertura");
  });

  test("la misma Apertura no puede estar en dos temporadas", async () => {
    const org = await organizer("temp2");
    const aperturaId = await leagueWith(org, 4);
    assert.equal((await createSeason(org, aperturaId)).status, 201);
    assert.equal((await createSeason(org, aperturaId)).status, 409);
  });

  test("la Apertura tiene que ser una liga", async () => {
    const org = await organizer("temp3");
    const t = await org.client.post("/api/tournaments", { name: `Elim ${RUN}`, startDate: "2026-03-01", location: "X", format: "eliminacion", maxTeams: 4 });
    assert.equal((await createSeason(org, t.data.id)).status, 400);
  });

  test("solo su organizador (o un admin)", async () => {
    const org = await organizer("temp4");
    const other = await organizer("temp4b");
    const aperturaId = await leagueWith(org, 4);
    assert.equal((await createSeason(other, aperturaId)).status, 403);
  });

  test("valida la fase final contra el cupo", async () => {
    const org = await organizer("temp5");
    const aperturaId = await leagueWith(org, 4);
    assert.equal((await createSeason(org, aperturaId, { finalTeams: 8 })).status, 400, "8 clasificados con 4 equipos");
    assert.equal((await createSeason(org, aperturaId, { finalTeams: 3 })).status, 400, "3 no es un cuadro parejo");
    assert.equal((await createSeason(org, aperturaId, { finalFormat: "liguilla", finalTeams: 2 })).status, 400);
  });

  test("el slug no choca con el de un torneo del mismo organizador", async () => {
    const org = await organizer("temp6");
    const aperturaId = await leagueWith(org, 4, { name: `Liga Slug ${RUN}` });
    const apertura = (await org.client.get(`/api/tournaments/${aperturaId}`)).data;
    const r = await createSeason(org, aperturaId, { name: `Liga Slug ${RUN}` });
    assert.equal(r.status, 201);
    assert.notEqual(r.data.slug, apertura.slug);
    assert.equal(r.data.slug, `${apertura.slug}-2`);
  });
});

describe("Clausura", () => {
  test("no se crea antes de que termine la Apertura", async () => {
    const org = await organizer("claus1");
    const aperturaId = await leagueWith(org, 4);
    const season = (await createSeason(org, aperturaId)).data;
    const r = await org.client.post(`/api/seasons/${season.id}/clausura`, { startDate: "2026-07-01" });
    assert.equal(r.status, 409);
  });

  test("copia los equipos y la configuración de la Apertura, y los equipos quedan fijos", async () => {
    const org = await organizer("claus2");
    const aperturaId = await leagueWith(org, 4);
    const season = (await createSeason(org, aperturaId)).data;
    await playTournament(org, aperturaId);

    const r = await org.client.post(`/api/seasons/${season.id}/clausura`, { startDate: "2026-07-01" });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.equal(r.data.season.status, "clausura");
    assert.equal((await org.client.post(`/api/seasons/${season.id}/clausura`, { startDate: "2026-07-01" })).status, 409, "un solo Clausura");

    const [apertura, clausura] = await Promise.all([
      org.client.get(`/api/tournaments/${aperturaId}`),
      org.client.get(`/api/tournaments/${r.data.tournamentId}`),
    ]);
    assert.equal(clausura.data.name, "Clausura 2026");
    assert.equal(clausura.data.format, "liga");
    assert.equal(clausura.data.seasonStage, "clausura");
    assert.equal(clausura.data.minutesPerHalf, 25);
    assert.deepEqual(clausura.data.teams.map((t) => t.club.id).sort(), apertura.data.teams.map((t) => t.club.id).sort());

    // Sin ingresos ni bajas (decisión 3).
    const add = await org.client.post(`/api/tournaments/${r.data.tournamentId}/teams`, { newClub: { name: `Intruso ${RUN}`, shortName: "IN" } });
    assert.equal(add.status, 409);
    const remove = await org.client.del(`/api/tournaments/${r.data.tournamentId}/teams/${clausura.data.teams[0].club.id}`);
    assert.equal(remove.status, 409);
  });
});

describe("eliminar", () => {
  test("un torneo de una temporada no se elimina suelto; borrar la temporada lo desvincula", async () => {
    const org = await organizer("elim1");
    const aperturaId = await leagueWith(org, 4);
    const season = (await createSeason(org, aperturaId)).data;

    assert.equal((await org.client.del(`/api/tournaments/${aperturaId}`)).status, 409);

    assert.equal((await org.client.del(`/api/seasons/${season.id}`)).status, 200);
    assert.equal((await org.client.get(`/api/seasons/${season.id}`)).status, 404);
    const t = await org.client.get(`/api/tournaments/${aperturaId}`);
    assert.equal(t.data.seasonId, null);
    assert.equal((await org.client.del(`/api/tournaments/${aperturaId}`)).status, 200);
  });

  test("no se cambia el tipo de competencia de un torneo de temporada", async () => {
    const org = await organizer("elim2");
    const aperturaId = await leagueWith(org, 4);
    await createSeason(org, aperturaId);
    assert.equal((await org.client.patch(`/api/tournaments/${aperturaId}`, { format: "eliminacion" })).status, 409);
  });
});

describe("temporada completa", () => {
  test("llaves: General suma las dos fases y la final cruza mejor contra peor", async () => {
    const org = await organizer("full1");
    const aperturaId = await leagueWith(org, 4);
    const season = (await createSeason(org, aperturaId, { finalFormat: "llaves", finalTeams: 4 })).data;

    await playTournament(org, aperturaId);
    const general1 = (await org.client.get(`/api/seasons/${season.id}/standings`)).data;
    assert.ok(general1.every((r) => r.played === 3), "con solo la Apertura, 3 partidos cada uno");

    const clausuraId = (await org.client.post(`/api/seasons/${season.id}/clausura`, { startDate: "2026-07-01" })).data.tournamentId;
    assert.equal((await org.client.post(`/api/seasons/${season.id}/final`, { startDate: "2026-12-01" })).status, 409, "sin terminar el Clausura");
    await playTournament(org, clausuraId);

    const general = (await org.client.get(`/api/seasons/${season.id}/standings`)).data;
    assert.equal(general.length, 4);
    assert.ok(general.every((r) => r.played === 6), "3 partidos de Apertura y 3 de Clausura");
    assert.equal(general.reduce((sum, r) => sum + r.points, 0), 12 * 3, "12 partidos, todos con ganador");

    const before = (await org.client.get(`/api/seasons/${season.id}`)).data;
    assert.equal(before.status, "final_pendiente");
    assert.ok(before.tournaments.every((t) => t.champion !== null), "Apertura y Clausura tienen campeón");

    const fin = await org.client.post(`/api/seasons/${season.id}/final`, { startDate: "2026-12-01" });
    assert.equal(fin.status, 201, JSON.stringify(fin.data));
    assert.deepEqual(fin.data.qualified, general.map((r) => r.clubId));
    assert.equal(fin.data.season.status, "final");
    assert.equal((await org.client.post(`/api/seasons/${season.id}/final`, { startDate: "2026-12-01" })).status, 409, "una sola fase final");

    const finalId = fin.data.tournamentId;
    const final = (await org.client.get(`/api/tournaments/${finalId}`)).data;
    assert.equal(final.format, "eliminacion");
    assert.equal(final.seasonStage, "final");

    // Cuadro de 4: 1.º contra 4.º y 2.º contra 3.º.
    await org.client.post(`/api/tournaments/${finalId}/fixture`, { mode: "manual" });
    const firstRound = (await getMatches(org.client, finalId)).filter((m) => m.matchday === 1);
    const pairs = firstRound.map((m) => [m.homeTeamId, m.awayTeamId].sort().join("|")).sort();
    const [q1, q2, q3, q4] = fin.data.qualified;
    assert.deepEqual(pairs, [[q1, q4].sort().join("|"), [q2, q3].sort().join("|")].sort());

    for (let round = 0; round < 3; round++) await finishAll(org, finalId);
    const done = (await org.client.get(`/api/seasons/${season.id}`)).data;
    assert.equal(done.status, "terminada");
    assert.ok(done.champion, "hay campeón de temporada");
    assert.equal(done.finalOutdated, false);

    const scorers = await org.client.get(`/api/seasons/${season.id}/scorers`);
    assert.equal(scorers.status, 200);
    assert.ok(Array.isArray(scorers.data));
  });

  test("liguilla: los N primeros de la General, en una liga sin llaves", async () => {
    const org = await organizer("full2");
    const aperturaId = await leagueWith(org, 4);
    const season = (await createSeason(org, aperturaId, { finalFormat: "liguilla", finalTeams: 3 })).data;
    await playTournament(org, aperturaId);
    const clausuraId = (await org.client.post(`/api/seasons/${season.id}/clausura`, { startDate: "2026-07-01" })).data.tournamentId;
    await playTournament(org, clausuraId);

    const general = (await org.client.get(`/api/seasons/${season.id}/standings`)).data;
    const fin = await org.client.post(`/api/seasons/${season.id}/final`, { startDate: "2026-12-01" });
    assert.equal(fin.status, 201, JSON.stringify(fin.data));
    assert.deepEqual(fin.data.qualified, general.slice(0, 3).map((r) => r.clubId));

    const final = (await org.client.get(`/api/tournaments/${fin.data.tournamentId}`)).data;
    assert.equal(final.format, "liga");
    assert.equal(final.playoffTeams, null);
    assert.deepEqual(final.teams.map((t) => t.club.id).sort(), [...fin.data.qualified].sort());
  });

  test("sin fase final: termina con el Clausura y gana el primero de la General", async () => {
    const org = await organizer("full3");
    const aperturaId = await leagueWith(org, 4);
    const season = (await createSeason(org, aperturaId, { finalFormat: "ninguna", finalTeams: null })).data;
    await playTournament(org, aperturaId);
    const clausuraId = (await org.client.post(`/api/seasons/${season.id}/clausura`, { startDate: "2026-07-01" })).data.tournamentId;
    await playTournament(org, clausuraId);

    assert.equal((await org.client.post(`/api/seasons/${season.id}/final`, { startDate: "2026-12-01" })).status, 409);
    const general = (await org.client.get(`/api/seasons/${season.id}/standings`)).data;
    const done = (await org.client.get(`/api/seasons/${season.id}`)).data;
    assert.equal(done.status, "terminada");
    assert.equal(done.champion.id, general[0].clubId);
  });

  test("más clasificados que equipos reales al generar la final: 409", async () => {
    const org = await organizer("full4");
    // Cupo de 8, pero se inscriben solo 4: la configuración pasa, la final no.
    const aperturaId = await leagueWith(org, 4, { maxTeams: 8 });
    const season = (await createSeason(org, aperturaId, { finalFormat: "llaves", finalTeams: 8 })).data;
    await playTournament(org, aperturaId);
    const clausuraId = (await org.client.post(`/api/seasons/${season.id}/clausura`, { startDate: "2026-07-01" })).data.tournamentId;
    await playTournament(org, clausuraId);
    const fin = await org.client.post(`/api/seasons/${season.id}/final`, { startDate: "2026-12-01" });
    assert.equal(fin.status, 409);
    assert.match(fin.data.error, /4 equipos/);
  });
});
