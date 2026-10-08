// Pruebas unitarias de src/_lib/sort.ts (sin servidor ni base de datos).
import { test } from "node:test";
import assert from "node:assert/strict";
import { sortRows } from "../../src/_lib/sort.ts";

const rows = (names) => names.map((name, i) => ({ name, i }));
const names = (list) => list.map((r) => r.name);

test("texto ascendente y descendente, sin distinguir mayúsculas ni tildes", () => {
  const data = rows(["beta", "Álvaro", "alfa", "Zeta"]);
  assert.deepEqual(names(sortRows(data, (r) => r.name, "asc")), ["alfa", "Álvaro", "beta", "Zeta"]);
  assert.deepEqual(names(sortRows(data, (r) => r.name, "desc")), ["Zeta", "beta", "Álvaro", "alfa"]);
});

test("los números dentro del texto van en su orden natural", () => {
  const data = rows(["Fecha 10", "Fecha 2", "Fecha 1"]);
  assert.deepEqual(names(sortRows(data, (r) => r.name, "asc")), ["Fecha 1", "Fecha 2", "Fecha 10"]);
});

test("los números se ordenan como números", () => {
  const data = [{ n: 10 }, { n: 9 }, { n: 100 }];
  assert.deepEqual(sortRows(data, (r) => r.n, "asc").map((r) => r.n), [9, 10, 100]);
  assert.deepEqual(sortRows(data, (r) => r.n, "desc").map((r) => r.n), [100, 10, 9]);
});

test("los vacíos van siempre al final, en cualquier sentido", () => {
  const data = [{ v: null }, { v: "b" }, { v: undefined }, { v: "a" }, { v: "" }];
  assert.deepEqual(sortRows(data, (r) => r.v, "asc").map((r) => r.v), ["a", "b", null, undefined, ""]);
  assert.deepEqual(sortRows(data, (r) => r.v, "desc").map((r) => r.v), ["b", "a", null, undefined, ""]);
});

test("es estable: los empates conservan su orden y no se modifica la lista original", () => {
  const data = [{ k: "x", id: 1 }, { k: "x", id: 2 }, { k: "a", id: 3 }];
  const copy = [...data];
  assert.deepEqual(sortRows(data, (r) => r.k, "asc").map((r) => r.id), [3, 1, 2]);
  assert.deepEqual(sortRows(data, (r) => r.k, "desc").map((r) => r.id), [1, 2, 3]);
  assert.deepEqual(data, copy);
});
