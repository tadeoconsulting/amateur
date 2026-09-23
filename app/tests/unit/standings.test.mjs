// Pruebas unitarias de src/_lib/standings.ts (sin servidor ni base de datos).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeStandings } from "../../src/_lib/standings.ts";

const team = (clubId, groupName = null) => ({ clubId, groupName });
const played = (homeTeamId, awayTeamId, homeScore, awayScore) => ({ homeTeamId, awayTeamId, homeScore, awayScore });

describe("computeStandings", () => {
  test("victoria 3, empate 1, derrota 0", () => {
    const teams = [team("a"), team("b"), team("c")];
    const matches = [played("a", "b", 2, 0), played("b", "c", 1, 1)];
    const rows = computeStandings(teams, matches);
    const by = Object.fromEntries(rows.map((r) => [r.clubId, r]));
    assert.equal(by.a.points, 3);
    assert.equal(by.a.won, 1);
    assert.equal(by.b.points, 1);
    assert.equal(by.b.drawn, 1);
    assert.equal(by.b.lost, 1);
    assert.equal(by.c.points, 1);
    assert.equal(by.c.drawn, 1);
  });

  test("orden: puntos, luego diferencia de gol, luego goles a favor", () => {
    const teams = [team("a"), team("b"), team("x"), team("y")];
    // Las cuatro terminan en 1 punto y diferencia 0 (un empate cada una); a/x metieron más goles que b/y.
    const matches = [played("a", "x", 2, 2), played("b", "y", 1, 1)];
    const rows = computeStandings(teams, matches);
    const pos = Object.fromEntries(rows.map((r, i) => [r.clubId, i]));
    assert.ok(Math.max(pos.a, pos.x) < Math.min(pos.b, pos.y), "a y x (más goles) quedan antes que b e y");
  });

  test("un partido sin marcador, o 'por definir' (sin alguno de los dos equipos), no cuenta", () => {
    const teams = [team("a"), team("b")];
    const matches = [played("a", "b", null, null), played("a", null, 3, 0), played(null, "b", 0, 3)];
    const rows = computeStandings(teams, matches);
    assert.ok(rows.every((r) => r.played === 0));
  });

  test("un equipo sin partidos jugados queda con todo en 0, no desaparece", () => {
    const rows = computeStandings([team("a"), team("b")], []);
    assert.equal(rows.length, 2);
    assert.ok(rows.every((r) => r.points === 0 && r.played === 0));
  });

  test("goalDifference se calcula, no hace falta pasarlo", () => {
    const rows = computeStandings([team("a"), team("b")], [played("a", "b", 4, 1)]);
    const a = rows.find((r) => r.clubId === "a");
    assert.equal(a.goalDifference, 3);
  });

  test("mezcla grupos si se le pasan varios, cada equipo conserva su groupName", () => {
    const teams = [team("a", "Grupo A"), team("b", "Grupo B")];
    const rows = computeStandings(teams, [played("a", "b", 1, 0)]);
    assert.equal(rows.find((r) => r.clubId === "a").groupName, "Grupo A");
    assert.equal(rows.find((r) => r.clubId === "b").groupName, "Grupo B");
  });
});
