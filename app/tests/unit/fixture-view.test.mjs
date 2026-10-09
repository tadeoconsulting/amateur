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
