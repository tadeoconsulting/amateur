// Pruebas de "copa" (grupos + cuadro de eliminación, especificación 007) contra un servidor
// real. Mismas instrucciones que auth.test.mjs: usá una base DE PRUEBA, no producción.
//
//   TEST_BASE_URL=http://localhost:3000 npm run test:api

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { RUN, newUser } from "./helpers.mjs";

const payload = (overrides = {}) => ({
  name: "Copa " + RUN,
  startDate: "2026-12-01",
  location: "Estadio Municipal",
  format: "copa",
  maxTeams: 16,
  status: "inscripcion",
  ...overrides,
});

const organizer = (label) => newUser(label, ["ORGANIZADOR"]);
const getMatches = async (client, tournamentId) => (await client.get(`/api/matches?tournamentId=${tournamentId}`)).data;
const groupOf = (matches) => matches.filter((m) => m.groupName !== null);
const bracketOf = (matches) => matches.filter((m) => m.decisive);

/** Un torneo "copa" con `groupSizes` grupos (ej. [3, 3, 3]) de equipos temporales inscritos. */
async function tournamentWithGroups(org, groupSizes, overrides = {}) {
  const t = await org.client.post("/api/tournaments", payload(overrides));
  assert.equal(t.status, 201, JSON.stringify(t.data));
  const names = "ABCDEFGH";
  for (let g = 0; g < groupSizes.length; g++) {
    const groupName = `Grupo ${names[g]}`;
    for (let i = 0; i < groupSizes[g]; i++) {
      const r = await org.client.post(`/api/tournaments/${t.data.id}/teams`, {
        newClub: { name: `${groupName} E${i + 1} ${RUN}${Math.random().toString(36).slice(2, 6)}`, shortName: `${names[g]}${i + 1}` },
        groupName,
      });
      assert.equal(r.status, 201, JSON.stringify(r.data));
    }
  }
  return t.data.id;
}

/** Termina todos los partidos de grupos de un torneo (2-0 siempre para el local). */
async function finishGroupStage(org, tournamentId) {
  const matches = groupOf(await getMatches(org.client, tournamentId));
  for (const m of matches) {
    await org.client.patch(`/api/matches/${m.id}`, { status: "en_curso" });
    await org.client.patch(`/api/matches/${m.id}`, { status: "finalizado", homeScore: 2, awayScore: 0 });
  }
}

describe("fase de grupos", () => {
  test("mode manual arma los grupos, sin cuadro todavía; el torneo pasa a en_curso", async () => {
    const org = await organizer("grupos1");
    const id = await tournamentWithGroups(org, [3, 3]);
    const fx = await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    assert.equal(fx.status, 201, JSON.stringify(fx.data));

    const matches = await getMatches(org.client, id);
    assert.equal(groupOf(matches).length, 6); // 2 grupos de 3: 3 partidos cada uno
    assert.equal(bracketOf(matches).length, 0);
    assert.ok(groupOf(matches).every((m) => m.decisive === false));
    assert.equal((await org.client.get(`/api/tournaments/${id}`)).data.status, "en_curso");
  });

  test("mode debe ser auto, manual o bracket", async () => {
    const org = await organizer("modeInvalido");
    const id = await tournamentWithGroups(org, [3, 3]);
    const r = await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "otra-cosa" });
    assert.equal(r.status, 400);
    assert.match(r.data.error, /bracket/);
  });
});

describe("armar el cuadro (mode: bracket)", () => {
  test("sin fase de grupos todavía, da 409", async () => {
    const org = await organizer("sinGrupos");
    const id = await tournamentWithGroups(org, [3, 3]);
    const r = await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "bracket" });
    assert.equal(r.status, 409);
    assert.match(r.data.error, /grupos/);
  });

  test("con la fase de grupos sin terminar, da 409", async () => {
    const org = await organizer("gruposAbiertos");
    const id = await tournamentWithGroups(org, [3, 3]);
    await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    const [first] = groupOf(await getMatches(org.client, id));
    await org.client.patch(`/api/matches/${first.id}`, { status: "en_curso" });
    await org.client.patch(`/api/matches/${first.id}`, { status: "finalizado", homeScore: 1, awayScore: 0 });

    const r = await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "bracket" });
    assert.equal(r.status, 409);
    assert.match(r.data.error, /termin/);
  });

  test("2 grupos de 3, clasifican 2 (por omisión): cuadro de 4, sin cruzar el mismo grupo en ronda 1", async () => {
    const org = await organizer("copa2x3");
    const id = await tournamentWithGroups(org, [3, 3]);
    await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    await finishGroupStage(org, id);

    const fx = await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "bracket" });
    assert.equal(fx.status, 201, JSON.stringify(fx.data));
    assert.equal(fx.data.totalRounds, 2);
    assert.equal(fx.data.matches, 3); // 2 en ronda 1 + la final

    const matches = await getMatches(org.client, id);
    assert.equal(groupOf(matches).length, 6, "los partidos de grupos siguen ahí");
    const bracket = bracketOf(matches);
    assert.equal(bracket.length, 3);
    assert.ok(bracket.every((m) => m.decisive === true));

    // Los clasificados: el que ganó los 2 partidos de grupo (2-0 siempre el local) es 1°.
    const standingsA = await org.client.get(`/api/tournaments/${id}/standings?group=Grupo A`);
    const standingsB = await org.client.get(`/api/tournaments/${id}/standings?group=Grupo B`);
    const qualifiedA = standingsA.data.slice(0, 2).map((r) => r.clubId);
    const qualifiedB = standingsB.data.slice(0, 2).map((r) => r.clubId);
    const qualified = new Set([...qualifiedA, ...qualifiedB]);

    const round1 = bracket.filter((m) => m.matchday === 1);
    assert.equal(round1.length, 2);
    for (const m of round1) {
      assert.ok(qualified.has(m.homeTeamId) && qualified.has(m.awayTeamId));
      // Ninguno de los dos lados de un mismo cruce viene del mismo grupo.
      const fromA = (teamId) => qualifiedA.includes(teamId);
      assert.notEqual(fromA(m.homeTeamId), fromA(m.awayTeamId));
    }
    // Los no clasificados (terceros de grupo, si los hubiera) no aparecen en el cuadro.
    const eliminated = [...standingsA.data, ...standingsB.data].map((r) => r.clubId).filter((c) => !qualified.has(c));
    for (const m of bracket) {
      assert.ok(!eliminated.includes(m.homeTeamId));
      assert.ok(!eliminated.includes(m.awayTeamId));
    }
  });

  test("groupsAdvancePerGroup configurable: con 3, clasifican 3 por grupo", async () => {
    const org = await organizer("copa3x2");
    const id = await tournamentWithGroups(org, [4, 4], { groupsAdvancePerGroup: 3 });
    await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    await finishGroupStage(org, id);

    const fx = await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "bracket" });
    assert.equal(fx.status, 201, JSON.stringify(fx.data));
    // 6 clasificados (3 por grupo, 2 grupos): un cuadro de eliminación siempre tiene
    // (equipos - 1) partidos, sin importar los byes: acá, 5 (2 en ronda 1, 2 en semis, 1 final).
    const matches = bracketOf(await getMatches(org.client, id));
    assert.equal(matches.length, 5);
    assert.equal(matches.filter((m) => m.matchday === 1).length, 2);
    assert.equal(matches.filter((m) => m.matchday === 2).length, 2);
    assert.equal(matches.filter((m) => m.matchday === 3).length, 1);
  });

  test("un grupo sin suficientes equipos para clasificar, da 409", async () => {
    const org = await organizer("gruposChicos");
    const id = await tournamentWithGroups(org, [2, 2], { groupsAdvancePerGroup: 3 });
    await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    await finishGroupStage(org, id);
    const r = await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "bracket" });
    assert.equal(r.status, 409);
    assert.match(r.data.error, /3 equipos/);
  });

  test("solo el organizador, y solo si el torneo existe", async () => {
    const org = await organizer("permisosCopa");
    const stranger = await organizer("extraño");
    const id = await tournamentWithGroups(org, [3, 3]);
    await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    await finishGroupStage(org, id);
    assert.equal((await stranger.client.post(`/api/tournaments/${id}/fixture`, { mode: "bracket" })).status, 403);
    assert.equal((await org.client.post(`/api/tournaments/no-existe/fixture`, { mode: "bracket" })).status, 404);
  });

  test("una vez armado, no se puede rehacer la fase de grupos", async () => {
    const org = await organizer("rehacerGrupos");
    const id = await tournamentWithGroups(org, [3, 3]);
    await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    await finishGroupStage(org, id);
    await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "bracket" });

    const r = await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual", replace: true });
    assert.equal(r.status, 409);
    assert.match(r.data.error, /cuadro/);
  });

  test("el cuadro se juega igual que eliminación (fase, marcador distinto, avanza)", async () => {
    const org = await organizer("copaJuega");
    const id = await tournamentWithGroups(org, [3, 3]);
    await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    await finishGroupStage(org, id);
    await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "bracket" });

    const bracket = bracketOf(await getMatches(org.client, id));
    const [m] = bracket.filter((m) => m.matchday === 1);
    await org.client.patch(`/api/matches/${m.id}`, { status: "en_curso" });
    assert.equal((await org.client.patch(`/api/matches/${m.id}`, { status: "finalizado", homeScore: 1, awayScore: 1 })).status, 409);
    const done = await org.client.patch(`/api/matches/${m.id}`, { homeScore: 2, status: "finalizado" });
    assert.equal(done.status, 200, JSON.stringify(done.data));
    assert.equal(done.data.winnerTeamId, m.homeTeamId);
  });
});
