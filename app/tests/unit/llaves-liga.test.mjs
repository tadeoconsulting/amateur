// Pruebas unitarias de las llaves de una liga (src/_lib/fixture.ts, sin servidor ni base de datos).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PLAYOFF_SIZES, bracketOrderFromPairs, isPlayoffSize, planBracket, playoffLabel, seedLeagueBracket, standardSeedOrder,
} from "../../src/_lib/fixture.ts";

test("solo 2, 4, 8 o 16 clasificados", () => {
  assert.deepEqual([...PLAYOFF_SIZES], [2, 4, 8, 16]);
  for (const n of [2, 4, 8, 16]) assert.equal(isPlayoffSize(n), true);
  for (const n of [0, 1, 3, 5, 6, 12, 32, "4", null, undefined]) assert.equal(isPlayoffSize(n), false);
});

test("etiquetas de la fase con que arrancan las llaves", () => {
  assert.equal(playoffLabel(2), "Final directa");
  assert.equal(playoffLabel(4), "Semifinales");
  assert.equal(playoffLabel(8), "Cuartos de final");
  assert.equal(playoffLabel(16), "Octavos de final");
});

test("orden de siembra: el mejor contra el peor y los mejores se encuentran al final", () => {
  assert.deepEqual(standardSeedOrder(2), [1, 2]);
  assert.deepEqual(standardSeedOrder(4), [1, 4, 2, 3]);
  assert.deepEqual(standardSeedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
  assert.equal(standardSeedOrder(16).length, 16);
  assert.equal(new Set(standardSeedOrder(16)).size, 16);
});

test("con 4 clasificados: 1.º vs 4.º y 2.º vs 3.º, y la final entre los ganadores", () => {
  const order = seedLeagueBracket(["A", "B", "C", "D"]); // A=1.º ... D=4.º
  assert.deepEqual(order, ["A", "D", "B", "C"]);
  const b = planBracket(order);
  assert.equal(b.ok, true);
  const round1 = b.matches.filter((m) => m.round === 1).map((m) => [m.homeTeamId, m.awayTeamId]);
  assert.deepEqual(round1, [["A", "D"], ["B", "C"]]);
  assert.equal(b.totalRounds, 2);
  assert.equal(b.matches.length, 3);
});

test("con 8 clasificados no hay equipos que pasen solos y 1.º y 2.º solo se cruzan en la final", () => {
  const ids = ["1", "2", "3", "4", "5", "6", "7", "8"];
  const b = planBracket(seedLeagueBracket(ids));
  assert.equal(b.totalRounds, 3);
  assert.equal(b.matches.filter((m) => m.round === 1).length, 4);
  const round1 = b.matches.filter((m) => m.round === 1).map((m) => [m.homeTeamId, m.awayTeamId]);
  assert.deepEqual(round1, [["1", "8"], ["4", "5"], ["2", "7"], ["3", "6"]]);
  // 1.º y 2.º están en mitades distintas del cuadro: primeros dos cruces vs últimos dos.
  assert.ok(round1.slice(0, 2).flat().includes("1") && round1.slice(2).flat().includes("2"));
});

test("final directa con 2 clasificados", () => {
  const b = planBracket(seedLeagueBracket(["A", "B"]));
  assert.equal(b.ok, true);
  assert.equal(b.matches.length, 1);
  assert.deepEqual([b.matches[0].homeTeamId, b.matches[0].awayTeamId], ["A", "B"]);
});

test("cruces a mano: valen si son los clasificados, una vez cada uno", () => {
  const q = ["A", "B", "C", "D"];
  const ok = bracketOrderFromPairs([["A", "C"], ["D", "B"]], q);
  assert.deepEqual(ok, { ok: true, order: ["A", "C", "D", "B"] });
  const b = planBracket(ok.order);
  assert.deepEqual(b.matches.filter((m) => m.round === 1).map((m) => [m.homeTeamId, m.awayTeamId]), [["A", "C"], ["D", "B"]]);
});

test("cruces a mano: se rechazan los repetidos, los ajenos y los incompletos", () => {
  const q = ["A", "B", "C", "D"];
  assert.equal(bracketOrderFromPairs([["A", "B"]], q).ok, false); // faltan cruces
  assert.equal(bracketOrderFromPairs([["A", "B"], ["A", "C"]], q).ok, false); // A repetido
  assert.equal(bracketOrderFromPairs([["A", "A"], ["B", "C"]], q).ok, false); // contra sí mismo
  assert.equal(bracketOrderFromPairs([["A", "B"], ["C", "X"]], q).ok, false); // X no clasificó
  assert.equal(bracketOrderFromPairs([["A", "B"], ["C"]], q).ok, false); // cruce incompleto
  assert.equal(bracketOrderFromPairs("no es una lista", q).ok, false);
});
