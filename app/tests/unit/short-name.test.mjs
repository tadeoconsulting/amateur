// Pruebas unitarias de src/_lib/short-name.ts (sin servidor ni base de datos).
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHORT_NAME_MAX, displayShortName } from "../../src/_lib/short-name.ts";

test("hasta 10 caracteres se muestra completa", () => {
  assert.equal(SHORT_NAME_MAX, 10);
  assert.equal(displayShortName("UDE"), "UDE");
  assert.equal(displayShortName("B FI"), "B FI");
  assert.equal(displayShortName("1234567890"), "1234567890");
});

test("más de 10 se corta en 10 y termina en ...", () => {
  assert.equal(displayShortName("12345678901"), "1234567890...");
  assert.equal(displayShortName("BARRIO FINO FC"), "BARRIO FIN...");
});

test("los espacios cuentan y no queda un espacio antes de los puntos", () => {
  assert.equal(displayShortName("LOS INTIMOS FC"), "LOS INTIMO...");
  assert.equal(displayShortName("ABCDEFGHI JKL"), "ABCDEFGHI...");
});

test("ignora espacios sobrantes en los extremos", () => {
  assert.equal(displayShortName("  UDE  "), "UDE");
});
