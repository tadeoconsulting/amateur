// Lógica pura del desplegable propio `Picklist` (especificación 022): sin servidor ni navegador.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { indexOfValue, firstEnabled, lastEnabled, stepEnabled, typeaheadIndex, picklistLabel } from "../../src/_lib/picklist.ts";

const opciones = [
  { value: "a", label: "Árbol" },
  { value: "b", label: "Banco", disabled: true },
  { value: "c", label: "Casa" },
  { value: "d", label: "Cancha" },
  { value: "e", label: "Estadio" },
];

describe("índices", () => {
  test("indexOfValue encuentra el valor o devuelve -1", () => {
    assert.equal(indexOfValue(opciones, "c"), 2);
    assert.equal(indexOfValue(opciones, "zzz"), -1);
  });
  test("primera y última habilitada se saltan las deshabilitadas", () => {
    assert.equal(firstEnabled(opciones), 0);
    assert.equal(lastEnabled(opciones), 4);
    assert.equal(firstEnabled([{ value: "x", label: "X", disabled: true }]), -1);
    assert.equal(lastEnabled([]), -1);
  });
});

describe("stepEnabled", () => {
  test("avanza saltando la deshabilitada y da la vuelta", () => {
    assert.equal(stepEnabled(opciones, 0, 1), 2, "salta «Banco»");
    assert.equal(stepEnabled(opciones, 4, 1), 0, "vuelta al principio");
    assert.equal(stepEnabled(opciones, 0, -1), 4, "vuelta al final");
    assert.equal(stepEnabled(opciones, 2, -1), 0);
  });
  test("sin nada activo (-1) baja al primero o sube al último", () => {
    assert.equal(stepEnabled(opciones, -1, 1), 0);
    assert.equal(stepEnabled(opciones, -1, -1), 4);
  });
  test("sin opciones habilitadas devuelve -1", () => {
    assert.equal(stepEnabled([], 0, 1), -1);
    assert.equal(stepEnabled([{ value: "x", label: "X", disabled: true }], -1, 1), -1);
  });
});

describe("typeaheadIndex", () => {
  test("salta a la opción que empieza con la letra, sin tildes ni mayúsculas", () => {
    assert.equal(typeaheadIndex(opciones, "a", -1), 0, "«Árbol» con «a»");
    assert.equal(typeaheadIndex(opciones, "E", -1), 4);
  });
  test("la misma letra recorre las que empiezan con ella y da la vuelta", () => {
    assert.equal(typeaheadIndex(opciones, "c", -1), 2, "«Casa»");
    assert.equal(typeaheadIndex(opciones, "c", 2), 3, "«Cancha»");
    assert.equal(typeaheadIndex(opciones, "c", 3), 2, "da la vuelta");
  });
  test("un prefijo más largo afina la búsqueda y puede quedarse en la actual", () => {
    assert.equal(typeaheadIndex(opciones, "can", 2), 3, "«Cancha»");
    assert.equal(typeaheadIndex(opciones, "cas", 2), 2, "se queda en «Casa»");
  });
  test("ignora las deshabilitadas y devuelve -1 si nada coincide", () => {
    assert.equal(typeaheadIndex(opciones, "b", -1), -1, "«Banco» está deshabilitada");
    assert.equal(typeaheadIndex(opciones, "zzz", -1), -1);
    assert.equal(typeaheadIndex(opciones, "", -1), -1);
  });
});

describe("picklistLabel", () => {
  test("muestra la opción elegida o el marcador", () => {
    assert.deepEqual(picklistLabel(opciones, "c", "Elige"), { text: "Casa", isPlaceholder: false });
    assert.deepEqual(picklistLabel(opciones, "", "Elige"), { text: "Elige", isPlaceholder: true });
    assert.deepEqual(picklistLabel(opciones, "no-existe", "Elige"), { text: "Elige", isPlaceholder: true });
  });
});
