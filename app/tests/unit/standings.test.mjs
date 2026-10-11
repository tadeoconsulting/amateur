// Pruebas unitarias de src/_lib/standings.ts (sin servidor ni base de datos).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeStandings, computeLiveStandings, placeChanges } from "../../src/_lib/standings.ts";

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

describe("computeLiveStandings (la tabla en vivo)", () => {
  const teams = [team("a"), team("b"), team("c"), team("d")];
  // Oficial: a 3 pts (le ganó a c), b y d 0... c 0. Termina a, luego el resto por diferencia de gol.
  const finished = [played("a", "c", 1, 0)];

  test("sin partidos en vivo es la oficial, sin cambios ni equipos en juego", () => {
    const rows = computeLiveStandings(teams, finished, []);
    assert.deepEqual(rows.map((r) => r.clubId), computeStandings(teams, finished).map((r) => r.clubId));
    for (const r of rows) {
      assert.equal(r.position, r.officialPosition);
      assert.equal(r.live, false);
      assert.equal(r.pointsDelta, 0);
    }
  });

  test("el equipo que va ganando suma sus 3 puntos y sube; el que va perdiendo no suma", () => {
    // b va ganando 2-0 a d en vivo: b pasa a 3 pts con DG +2 y supera a a (3 pts, DG +1).
    const rows = computeLiveStandings(teams, finished, [played("b", "d", 2, 0)]);
    const by = Object.fromEntries(rows.map((r) => [r.clubId, r]));
    assert.equal(by.b.points, 3);
    assert.equal(by.b.pointsDelta, 3);
    assert.equal(by.d.points, 0);
    assert.equal(by.d.pointsDelta, 0);
    assert.equal(by.b.position, 1, "b lidera con el marcador de ahora");
    assert.equal(by.a.position, 2);
    assert.ok(by.b.officialPosition > by.b.position, "subió respecto de la oficial");
    assert.ok(by.a.officialPosition < by.a.position, "a bajó un lugar");
    assert.equal(by.b.won, 1);
    assert.equal(by.b.played, 1);
    assert.equal(by.d.lost, 1);
  });

  test("un empate en vivo da 1 punto a cada uno", () => {
    const rows = computeLiveStandings(teams, finished, [played("b", "d", 1, 1)]);
    const by = Object.fromEntries(rows.map((r) => [r.clubId, r]));
    assert.equal(by.b.pointsDelta, 1);
    assert.equal(by.d.pointsDelta, 1);
    assert.equal(by.b.drawn, 1);
  });

  test("solo los equipos que juegan ahora llevan la marca en vivo", () => {
    const rows = computeLiveStandings(teams, finished, [played("b", "d", 0, 0)]);
    const live = rows.filter((r) => r.live).map((r) => r.clubId).sort();
    assert.deepEqual(live, ["b", "d"]);
  });

  test("al finalizar, la oficial coincide con lo que se proyectaba", () => {
    const inPlay = [played("b", "d", 2, 0)];
    const projected = computeLiveStandings(teams, finished, inPlay).map((r) => [r.clubId, r.points, r.position]);
    const after = computeLiveStandings(teams, [...finished, ...inPlay], []).map((r) => [r.clubId, r.points, r.position]);
    assert.deepEqual(after, projected);
  });

  test("un partido en vivo sin marcador o por definir no cuenta", () => {
    const rows = computeLiveStandings(teams, finished, [played("b", "d", null, null), played(null, "d", 1, 0)]);
    assert.equal(rows.some((r) => r.live), false);
    assert.equal(rows.every((r) => r.pointsDelta === 0), true);
  });
});

describe("placeChanges (cuántos lugares cambió cada equipo)", () => {
  test("sube positivo, baja negativo, y quien no se mueve no aparece", () => {
    const rows = [
      { clubId: "b", officialPosition: 2 },
      { clubId: "a", officialPosition: 1 },
      { clubId: "c", officialPosition: 3 },
    ];
    const changes = placeChanges(rows);
    assert.equal(changes.get("b"), 1, "b subió un lugar");
    assert.equal(changes.get("a"), -1, "a bajó un lugar");
    assert.equal(changes.has("c"), false);
  });

  test("en un grupo se mide solo contra los equipos de ese grupo", () => {
    // Lugares oficiales globales 1, 3 (los de este grupo): mismo orden relativo → nadie cambió.
    const group = [{ clubId: "x", officialPosition: 1 }, { clubId: "y", officialPosition: 3 }];
    assert.equal(placeChanges(group).size, 0);
  });

  test("sin lugar oficial (tabla sin proyección) no hay cambios", () => {
    assert.equal(placeChanges([{ clubId: "a" }, { clubId: "b" }]).size, 0);
  });
});
