// Pruebas de editar los cruces de un fixture (especificación 017: GET y PUT /api/tournaments/:id/fixture/cruces)
// contra un servidor real. Mismas instrucciones que auth.test.mjs: usá una base DE PRUEBA, no producción.
//
//   TEST_BASE_URL=http://localhost:3000 npm run test:api

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client, RUN, newUser } from "./helpers.mjs";
import { changeTeam, swapMatchdays } from "../src/_lib/fixture-edit.ts";

const organizer = (label) => newUser(label, ["ORGANIZADOR"]);

/** Un torneo de liga con `teams` equipos temporales inscritos y el fixture manual armado (sin día ni hora). */
async function leagueWithFixture(org, teams = 4) {
  const t = await org.client.post("/api/tournaments", {
    name: "Cruces " + RUN,
    startDate: "2026-10-01",
    location: "Estadio Municipal",
    format: "liga",
    maxTeams: 8,
    minutesPerHalf: 25,
    status: "inscripcion",
  });
  assert.equal(t.status, 201, JSON.stringify(t.data));
  for (let i = 0; i < teams; i++) {
    const r = await org.client.post(`/api/tournaments/${t.data.id}/teams`, { newClub: { name: `Eq${i + 1} ${RUN}`, shortName: `E${i + 1}` } });
    assert.equal(r.status, 201, JSON.stringify(r.data));
  }
  const f = await org.client.post(`/api/tournaments/${t.data.id}/fixture`, { mode: "manual" });
  assert.equal(f.status, 201, JSON.stringify(f.data));
  return t.data.id;
}

const path = (id) => `/api/tournaments/${id}/fixture/cruces`;
const load = async (client, id) => (await client.get(path(id))).data;
const patchOf = (m) => ({ id: m.id, matchday: m.matchday, homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId, date: m.date, time: m.time, location: m.location });
const changedOf = (before, after) =>
  after.filter((a) => JSON.stringify(patchOf(a)) !== JSON.stringify(patchOf(before.find((b) => b.id === a.id)))).map(patchOf);
const inDay = (list, day) => list.filter((m) => m.matchday === day);
const teamsPlaying = (list, day) => inDay(list, day).flatMap((m) => [m.homeTeamId, m.awayTeamId]).sort();

describe("permisos", () => {
  test("sin sesión 401, otro organizador 403, torneo inexistente 404", async () => {
    const org = await organizer("crperm");
    const other = await organizer("crotro");
    const id = await leagueWithFixture(org);
    assert.equal((await new Client().get(path(id))).status, 401);
    assert.equal((await other.client.get(path(id))).status, 403);
    assert.equal((await other.client.request("PUT", path(id), { matches: [] })).status, 403);
    assert.equal((await org.client.get(path("no-existe"))).status, 404);
  });

  test("devuelve los partidos editables y los equipos; un torneo sin fixture da 409 al guardar", async () => {
    const org = await organizer("crget");
    const id = await leagueWithFixture(org);
    const data = await load(org.client, id);
    assert.equal(data.matches.length, 6); // 4 equipos: 3 fechas de 2 partidos
    assert.equal(data.teams.length, 4);
    assert.ok(data.matches.every((m) => m.locked === false));

    const t = await org.client.post("/api/tournaments", { name: "Sin fixture " + RUN, startDate: "2026-10-01", location: "X", format: "liga", maxTeams: 4, status: "inscripcion" });
    const r = await org.client.request("PUT", path(t.data.id), { matches: [] });
    assert.equal(r.status, 409);
  });
});

describe("cambiar un equipo", () => {
  test("el partido del equipo que entra recibe al que salió, y se guarda todo junto", async () => {
    const org = await organizer("crteam");
    const id = await leagueWithFixture(org);
    const { matches } = await load(org.client, id);

    const target = inDay(matches, 1)[0];
    const other = inDay(matches, 1)[1];
    // En el primer partido de la fecha 1, el visitante pasa a ser un equipo del otro partido de esa fecha.
    const r = changeTeam(matches, target.id, "away", other.homeTeamId);
    assert.equal(r.ok, true);
    const patches = changedOf(matches, r.matches);
    assert.equal(patches.length, 2);

    const put = await org.client.request("PUT", path(id), { matches: patches });
    assert.equal(put.status, 200, JSON.stringify(put.data));
    assert.equal(put.data.updated, 2);

    const after = (await load(org.client, id)).matches;
    assert.equal(after.length, 6, "la cantidad de partidos no cambia");
    assert.equal(byId(after, target.id).awayTeamId, other.homeTeamId);
    assert.equal(byId(after, other.id).homeTeamId, target.awayTeamId);
    assert.deepEqual(teamsPlaying(after, 1), teamsPlaying(matches, 1), "los mismos cuatro equipos juegan la fecha 1");
  });

  test("un equipo dos veces en una fecha se rechaza con 409 y no cambia nada", async () => {
    const org = await organizer("crdup");
    const id = await leagueWithFixture(org);
    const { matches } = await load(org.client, id);
    const [a, b] = inDay(matches, 1);
    // Solo cambio un partido: el equipo del otro queda dos veces.
    const bad = { ...patchOf(a), awayTeamId: b.homeTeamId };
    const put = await org.client.request("PUT", path(id), { matches: [bad] });
    assert.equal(put.status, 409);
    assert.match(put.data.error, /dos veces en la fecha 1/);
    assert.deepEqual((await load(org.client, id)).matches.map(patchOf), matches.map(patchOf));
  });
});

describe("mover un partido de fecha", () => {
  test("intercambiar y reparar cambiando equipos deja las fechas bien armadas", async () => {
    const org = await organizer("crmove");
    const id = await leagueWithFixture(org);
    const { matches } = await load(org.client, id);

    const a = inDay(matches, 1)[0];
    // Un partido de la fecha 2 que comparte un equipo con A (el que la hace chocar).
    const b = inDay(matches, 2).find((m) => [m.homeTeamId, m.awayTeamId].some((t) => t === a.homeTeamId || t === a.awayTeamId));

    // Solo el intercambio: la fecha queda con un equipo dos veces, y la API no deja guardar.
    let draft = swapMatchdays(matches, a.id, b.id).matches;
    const onlySwap = await org.client.request("PUT", path(id), { matches: changedOf(matches, draft) });
    assert.equal(onlySwap.status, 409);

    // Reparo: cada fecha afectada recibe al equipo que le faltaba, hasta que todas cuadran.
    const teams = new Set(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]));
    for (let guard = 0; guard < 10; guard++) {
      let fixedOne = false;
      for (const day of [1, 2, 3]) {
        const seen = new Map();
        for (const m of inDay(draft, day)) {
          for (const [side, t] of [["home", m.homeTeamId], ["away", m.awayTeamId]]) {
            if (!seen.has(t)) { seen.set(t, m); continue; }
            // Segunda vez: lo cambio por un equipo que esa fecha no juega.
            const resting = [...teams].find((x) => !inDay(draft, day).some((y) => y.homeTeamId === x || y.awayTeamId === x));
            const r = changeTeam(draft, m.id, side, resting);
            assert.equal(r.ok, true);
            draft = r.matches;
            fixedOne = true;
            break;
          }
          if (fixedOne) break;
        }
        if (fixedOne) break;
      }
      if (!fixedOne) break;
    }

    const put = await org.client.request("PUT", path(id), { matches: changedOf(matches, draft) });
    assert.equal(put.status, 200, JSON.stringify(put.data));
    const after = (await load(org.client, id)).matches;
    assert.equal(after.length, 6);
    for (const day of [1, 2, 3]) {
      assert.equal(new Set(teamsPlaying(after, day)).size, 4, `en la fecha ${day} juegan los cuatro, cada uno una vez`);
      assert.equal(inDay(after, day).length, 2);
    }
  });

  test("mover un partido sin compensar cambia la cantidad por fecha y se rechaza", async () => {
    const org = await organizer("crcount");
    const id = await leagueWithFixture(org);
    const { matches } = await load(org.client, id);
    const moved = { ...patchOf(inDay(matches, 1)[0]), matchday: 2 };
    const put = await org.client.request("PUT", path(id), { matches: [moved] });
    assert.equal(put.status, 409);
    assert.match(put.data.error, /cantidad de partidos/);
  });

  test("al intercambiar de fecha, los dos partidos se llevan el día, la hora y la sede del otro", async () => {
    const org = await organizer("crslot");
    const id = await leagueWithFixture(org);
    const { matches } = await load(org.client, id);
    const a = inDay(matches, 1)[0];
    const b = inDay(matches, 2)[0];
    assert.equal((await org.client.patch(`/api/matches/${a.id}`, { date: "2026-10-03", time: "18:00", location: "Cancha 1" })).status, 200);
    assert.equal((await org.client.patch(`/api/matches/${b.id}`, { date: "2026-10-10", time: "19:30", location: "Cancha 2" })).status, 200);

    // Con 4 equipos, intercambiar las fechas 1 y 2 completas (los dos partidos de cada una) cuadra sin reparar nada.
    const fresh = (await load(org.client, id)).matches;
    const a1 = byId(fresh, a.id);
    const a2 = byId(fresh, b.id);
    const c1 = inDay(fresh, 1).find((m) => m.id !== a1.id);
    const c2 = inDay(fresh, 2).find((m) => m.id !== a2.id);
    let draft = swapMatchdays(fresh, a1.id, a2.id).matches;
    draft = swapMatchdays(draft, c1.id, c2.id).matches;

    const put = await org.client.request("PUT", path(id), { matches: changedOf(fresh, draft) });
    assert.equal(put.status, 200, JSON.stringify(put.data));
    assert.equal(put.data.updated, 4);

    const after = (await load(org.client, id)).matches;
    const [pa, pb] = [byId(after, a1.id), byId(after, a2.id)];
    // El partido que estaba en la fecha 1 pasó a la 2 con el día, la hora y la sede del que ocupaba su lugar, y al revés.
    assert.deepEqual([pa.matchday, pa.date, pa.time, pa.location], [2, "2026-10-10", "19:30", "Cancha 2"]);
    assert.deepEqual([pb.matchday, pb.date, pb.time, pb.location], [1, "2026-10-03", "18:00", "Cancha 1"]);
    // Los equipos de cada partido no cambiaron.
    assert.deepEqual([pa.homeTeamId, pa.awayTeamId], [a1.homeTeamId, a1.awayTeamId]);
    assert.equal(after.length, 6);
  });
});

describe("partidos que ya empezaron y datos inválidos", () => {
  test("un partido en curso no se puede editar", async () => {
    const org = await organizer("crlock");
    const id = await leagueWithFixture(org);
    const { matches } = await load(org.client, id);
    const [a, b] = inDay(matches, 1);
    assert.equal((await org.client.patch(`/api/matches/${a.id}`, { date: "2026-10-03", time: "18:00" })).status, 200);
    assert.equal((await org.client.patch(`/api/matches/${a.id}`, { status: "en_curso" })).status, 200);

    const fresh = (await load(org.client, id)).matches;
    assert.equal(byId(fresh, a.id).locked, true);
    const r = changeTeam(fresh, b.id, "home", a.homeTeamId);
    assert.equal(r.ok, false, "la pantalla tampoco deja");
    // Y la API lo rechaza aunque alguien la llame a mano.
    const put = await org.client.request("PUT", path(id), { matches: [{ ...patchOf(byId(fresh, a.id)), location: "Otra" }] });
    assert.equal(put.status, 409);
    assert.match(put.data.error, /ya empezó/);
  });

  test("cuerpos mal formados dan 400", async () => {
    const org = await organizer("crbad");
    const id = await leagueWithFixture(org);
    const { matches } = await load(org.client, id);
    const m = patchOf(matches[0]);
    const put = (matchesBody) => org.client.request("PUT", path(id), { matches: matchesBody });
    assert.equal((await org.client.request("PUT", path(id), {})).status, 400);
    assert.equal((await put([{ ...m, date: "2026-13-45" }])).status, 400);
    assert.equal((await put([{ ...m, time: "25:00" }])).status, 400);
    assert.equal((await put([{ ...m, matchday: 0 }])).status, 400);
    assert.equal((await put([m, m])).status, 400);
    assert.equal((await put([{ ...m, id: "otro-torneo" }])).status, 400);
  });

  test("sin cambios no escribe nada", async () => {
    const org = await organizer("crnone");
    const id = await leagueWithFixture(org);
    const { matches } = await load(org.client, id);
    const put = await org.client.request("PUT", path(id), { matches: [patchOf(matches[0])] });
    assert.equal(put.status, 200);
    assert.equal(put.data.updated, 0);
  });
});

function byId(list, id) {
  return list.find((m) => m.id === id);
}
