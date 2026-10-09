// Pruebas de la forma de un equipo (src/_lib/fixture.ts, sin servidor ni base de datos).
import { test } from "node:test";
import assert from "node:assert/strict";
import { teamForm } from "../../src/_lib/fixture.ts";

const club = (id) => ({ id, name: `Club ${id}`, shortName: id.toUpperCase() });
const m = (id, home, away, hs, as, date, over = {}) => ({
  id, status: "finalizado", date: `${date}T00:00:00.000Z`, time: "10:00", decisive: false, winnerTeamId: null,
  homeScore: hs, awayScore: as, homeTeam: club(home), awayTeam: club(away), ...over,
});
const cur = { id: "cur", date: "2026-10-20T00:00:00.000Z", time: "10:00" };

test("va del más antiguo al más reciente y se queda con los últimos 5", () => {
  const matches = [1, 2, 3, 4, 5, 6, 7].map((d) => m(`m${d}`, "a", "b", d, 0, `2026-10-0${d}`));
  const form = teamForm(matches, "a", cur);
  assert.deepEqual(form.map((f) => f.matchId), ["m3", "m4", "m5", "m6", "m7"]);
});

test("gana, empata y pierde según el lado en que jugó", () => {
  const matches = [m("m1", "a", "b", 2, 1, "2026-10-01"), m("m2", "c", "a", 1, 1, "2026-10-02"), m("m3", "a", "d", 0, 3, "2026-10-03"), m("m4", "e", "a", 0, 2, "2026-10-04")];
  const form = teamForm(matches, "a", cur);
  assert.deepEqual(form.map((f) => f.result), ["G", "E", "P", "G"]);
  assert.equal(form[3].goalsFor, 2);
  assert.equal(form[3].goalsAgainst, 0);
  assert.equal(form[3].home, false);
  assert.equal(form[3].opponent.id, "e");
});

test("no cuenta el propio partido, los de otros equipos ni los que no terminaron", () => {
  const matches = [
    m("cur", "a", "b", 1, 0, "2026-10-19"),
    m("x", "c", "d", 1, 0, "2026-10-01"),
    m("y", "a", "b", null, null, "2026-10-02", { status: "programado" }),
    m("z", "a", "b", 1, 0, "2026-10-03"),
  ];
  assert.deepEqual(teamForm(matches, "a", cur).map((f) => f.matchId), ["z"]);
});

test("solo los partidos anteriores al de la ficha cuando este ya tiene día y hora", () => {
  const matches = [m("antes", "a", "b", 1, 0, "2026-10-10"), m("despues", "a", "b", 1, 0, "2026-10-25")];
  assert.deepEqual(teamForm(matches, "a", cur).map((f) => f.matchId), ["antes"]);
  // sin día y hora (por programar): cuentan todos los jugados
  assert.deepEqual(teamForm(matches, "a", { ...cur, time: "" }).map((f) => f.matchId), ["antes", "despues"]);
});

test("un partido decisivo empatado se resuelve por quien avanzó", () => {
  const matches = [m("p1", "a", "b", 1, 1, "2026-10-05", { decisive: true, winnerTeamId: "a" }), m("p2", "a", "c", 2, 2, "2026-10-06", { decisive: true, winnerTeamId: "c" })];
  assert.deepEqual(teamForm(matches, "a", cur).map((f) => f.result), ["G", "P"]);
});
