// Pruebas unitarias de src/_lib/sede-text.ts (sin servidor ni base de datos).
import { test } from "node:test";
import assert from "node:assert/strict";
import { sedeText } from "../../src/_lib/sede-text.ts";

test("nombre y dirección separados por coma", () => {
  assert.equal(sedeText({ name: "Cancha Ensenada", address: "Av. Perú 123" }), "Cancha Ensenada, Av. Perú 123");
});

test("sin dirección (vacía, nula o solo espacios) queda el nombre", () => {
  assert.equal(sedeText({ name: "Cancha Ensenada" }), "Cancha Ensenada");
  assert.equal(sedeText({ name: "Cancha Ensenada", address: null }), "Cancha Ensenada");
  assert.equal(sedeText({ name: "Cancha Ensenada", address: "   " }), "Cancha Ensenada");
});

test("recorta espacios sobrantes", () => {
  assert.equal(sedeText({ name: "  Cancha  ", address: "  Av. 1  " }), "Cancha, Av. 1");
});
