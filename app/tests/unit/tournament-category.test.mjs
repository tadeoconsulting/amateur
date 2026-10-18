// Pruebas de src/_lib/tournament-category.ts (las pestañas de categoría del club salen de sus torneos), sin servidor.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_CATEGORIES, categoriesOf, categoryOf, filterByCategory } from "../../src/_lib/tournament-category.ts";

const t = (id, category) => ({ id, category });

test("un torneo sin categoría es Libre", () => {
  assert.equal(categoryOf(t("a", null)), "Libre");
  assert.equal(categoryOf(t("a", "   ")), "Libre");
  assert.equal(categoryOf(t("a", " Sub 18 ")), "Sub 18");
});

test("las categorías salen de los torneos, sin repetir, con Libre primero", () => {
  const list = [t("a", "Sub 18"), t("b", null), t("c", "Master"), t("d", "Sub 18")];
  assert.deepEqual(categoriesOf(list), ["Libre", "Master", "Sub 18"]);
});

test("el orden es natural: Sub 9 antes que Sub 18", () => {
  assert.deepEqual(categoriesOf([t("a", "Sub 18"), t("b", "Sub 9"), t("c", "Sub 12")]), ["Sub 9", "Sub 12", "Sub 18"]);
});

test("una categoría que el club no tiene no aparece (no hay Sub 18 fijo)", () => {
  assert.deepEqual(categoriesOf([t("a", "Libre"), t("b", null)]), ["Libre"]);
  assert.deepEqual(categoriesOf([t("a", "Master")]), ["Master"]);
  assert.deepEqual(categoriesOf([]), []);
});

test("mayúsculas distintas cuentan como la misma categoría", () => {
  assert.deepEqual(categoriesOf([t("a", "Sub 18"), t("b", "sub 18")]), ["Sub 18"]);
  assert.deepEqual(filterByCategory([t("a", "Sub 18"), t("b", "sub 18"), t("c", null)], "Sub 18").map((x) => x.id), ["a", "b"]);
});

test("filtrar por categoría deja solo esos torneos; todas los deja todos", () => {
  const list = [t("a", "Sub 18"), t("b", null), t("c", "Master")];
  assert.deepEqual(filterByCategory(list, "Libre").map((x) => x.id), ["b"]);
  assert.deepEqual(filterByCategory(list, "Master").map((x) => x.id), ["c"]);
  assert.deepEqual(filterByCategory(list, ALL_CATEGORIES).map((x) => x.id), ["a", "b", "c"]);
  assert.deepEqual(filterByCategory(list, "Sub 15"), []);
});

test("no modifica la lista recibida", () => {
  const list = [t("a", "Sub 18"), t("b", null)];
  filterByCategory(list, ALL_CATEGORIES);
  categoriesOf(list);
  assert.equal(list.length, 2);
});
