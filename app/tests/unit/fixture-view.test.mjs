// Pruebas de la lógica de presentación del fixture (src/_lib/fixture.ts, sin React ni servidor).
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFixtureTabs, currentTabKey, groupByDay, matchesOfTab } from "../../src/_lib/fixture.ts";

const m = (matchday, over = {}) => ({ matchday, decisive: false, status: "programado", date: "2026-10-10T00:00:00.000Z", time: "10:00", ...over });

test("las fechas van primero y las rondas del cuadro después, sin mezclarse", () => {
  const matches = [m(1), m(2), m(1, { decisive: true }), m(2, { decisive: true })];
  const tabs = buildFixtureTabs(matches);
  assert.deepEqual(tabs.map((t) => t.label), ["Fecha 1", "Fecha 2", "Semifinal", "Final"]);
  // la ronda 1 del cuadro no se confunde con la Fecha 1
  assert.equal(matchesOfTab(matches, tabs[0]).length, 1);
  assert.equal(matchesOfTab(matches, tabs[2]).length, 1);
});

test("un cuadro solo (eliminación) se rotula por ronda, no como 'Fecha'", () => {
  const tabs = buildFixtureTabs([m(1, { decisive: true }), m(1, { decisive: true }), m(2, { decisive: true })]);
  assert.deepEqual(tabs.map((t) => t.label), ["Semifinal", "Final"]);
});

test("la fecha actual es la primera con partidos sin terminar; si terminó todo, la última", () => {
  const done = (n) => m(n, { status: "finalizado" });
  const matches = [done(1), done(2), m(3), m(4)];
  assert.equal(currentTabKey(buildFixtureTabs(matches), matches), "f3");
  const all = [done(1), done(2)];
  assert.equal(currentTabKey(buildFixtureTabs(all), all), "f2");
  assert.equal(currentTabKey([], []), null);
});

test("una liga con llaves cae en el cuadro cuando la liga terminó", () => {
  const matches = [m(1, { status: "finalizado" }), m(1, { decisive: true })];
  assert.equal(currentTabKey(buildFixtureTabs(matches), matches), "r1");
});

test("los partidos se agrupan por día y hora; los sin programar van al final", () => {
  const matches = [
    m(1, { date: "2026-10-11T00:00:00.000Z", time: "08:00", id: "c" }),
    m(1, { date: "2026-10-10T00:00:00.000Z", time: "11:30", id: "b" }),
    m(1, { date: "2026-10-10T00:00:00.000Z", time: "09:00", id: "a" }),
    m(1, { time: "", id: "z" }),
  ];
  const sections = groupByDay(matches);
  assert.deepEqual(sections.map((s) => s.key), ["2026-10-10", "2026-10-11", "por-definir"]);
  assert.deepEqual(sections[0].matches.map((x) => x.id), ["a", "b"]);
  assert.equal(sections[2].date, null);
});

test("la fecha elegida se lee de la URL y se escribe conservando los demás parámetros", async () => {
  const { tabKeyFromSearch, withTabParam } = await import("../../src/_lib/fixture.ts");
  assert.equal(tabKeyFromSearch("?fecha=5"), "f5");
  assert.equal(tabKeyFromSearch("?ronda=2"), "r2");
  assert.equal(tabKeyFromSearch("?fecha=abc"), null);
  assert.equal(tabKeyFromSearch("?otro=1"), null);
  assert.equal(withTabParam("unirme=1", "f7"), "unirme=1&fecha=7");
  assert.equal(withTabParam("fecha=3&unirme=1", "r1"), "unirme=1&ronda=1");
  assert.equal(withTabParam("fecha=3", null), "");
});

test("cada partido sabe en qué pestaña del fixture está (para volver a ella desde su ficha)", async () => {
  const { tabKeyOfMatch, tabKeyFromSearch, withTabParam, buildFixtureTabs } = await import("../../src/_lib/fixture.ts");
  assert.equal(tabKeyOfMatch({ decisive: false, matchday: 3 }), "f3");
  assert.equal(tabKeyOfMatch({ decisive: true, matchday: 1 }), "r1");
  // es la misma clave que arma el fixture y que lee la URL
  const matches = [m(3), m(1, { decisive: true })];
  const keys = buildFixtureTabs(matches).map((t) => t.key);
  assert.ok(matches.every((x) => keys.includes(tabKeyOfMatch(x))));
  assert.equal(tabKeyFromSearch(`?${withTabParam("vista=fixture", tabKeyOfMatch(matches[1]))}`), "r1");
});

test("cómo le fue a un club: todos sus partidos jugados, y el empate de un cruce se resuelve por quien avanzó", async () => {
  const { clubRecord } = await import("../../src/_lib/fixture.ts");
  const t = (id) => ({ id });
  const g = (id, h, a, hs, as, over = {}) => ({ id, status: "finalizado", date: "2026-10-10T00:00:00.000Z", time: "10:00", homeTeam: t(h), awayTeam: t(a), homeScore: hs, awayScore: as, decisive: false, winnerTeamId: null, ...over });
  const matches = [
    g("1", "A", "B", 2, 0), // gana A
    g("2", "C", "A", 1, 1), // empata A
    g("3", "A", "D", 0, 3), // pierde A
    g("4", "A", "E", 1, 1, { decisive: true, winnerTeamId: "A" }), // empate en un cruce: avanzó A -> ganó
    g("5", "F", "A", 2, 2, { decisive: true, winnerTeamId: "F" }), // avanzó F -> perdió A
    g("6", "A", "G", null, null, { status: "programado" }), // no cuenta
    g("7", "B", "C", 5, 0), // ni lo mira
  ];
  assert.deepEqual(clubRecord(matches, "A"), { played: 5, won: 2, drawn: 1, lost: 2, goalsFor: 6, goalsAgainst: 7, goalDifference: -1 });
  assert.equal(clubRecord(matches, "Z").played, 0);
});

test("el puesto de un club en la tabla: global, o dentro de su grupo si el torneo tiene grupos", async () => {
  const { clubStanding } = await import("../../src/_lib/fixture.ts");
  const liga = [
    { clubId: "A", groupName: null, position: 1, points: 9, played: 3 },
    { clubId: "B", groupName: null, position: 2, points: 6, played: 3 },
    { clubId: "C", groupName: null, position: 3, points: 1, played: 3 },
  ];
  assert.deepEqual(clubStanding(liga, "B"), { rank: 2, total: 3, groupName: null, points: 6, played: 3 });
  // con grupos la tabla viene mezclada: el puesto se cuenta dentro del grupo
  const copa = [
    { clubId: "A", groupName: "Grupo A", position: 1, points: 9, played: 3 },
    { clubId: "X", groupName: "Grupo B", position: 2, points: 7, played: 3 },
    { clubId: "B", groupName: "Grupo A", position: 3, points: 4, played: 3 },
    { clubId: "Y", groupName: "Grupo B", position: 4, points: 2, played: 3 },
  ];
  assert.deepEqual(clubStanding(copa, "B"), { rank: 2, total: 2, groupName: "Grupo A", points: 4, played: 3 });
  assert.deepEqual(clubStanding(copa, "Y"), { rank: 2, total: 2, groupName: "Grupo B", points: 2, played: 3 });
  assert.equal(clubStanding(liga, "ZZ"), null); // sin tabla (eliminación directa), no hay puesto
});
