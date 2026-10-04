// Pruebas unitarias de src/_lib/temp-password.ts (sin servidor ni base de datos).
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateTempPassword, TEMP_PASSWORD_LENGTH } from "../../src/_lib/temp-password.ts";

test("tiene el largo pedido (12 por omisión, más de los 8 mínimos de una contraseña)", () => {
  assert.equal(generateTempPassword().length, TEMP_PASSWORD_LENGTH);
  assert.ok(TEMP_PASSWORD_LENGTH >= 8);
  assert.equal(generateTempPassword(20).length, 20);
});

test("no usa caracteres que se confunden (0 O 1 l I) y solo letras y números", () => {
  for (let i = 0; i < 200; i++) {
    assert.match(generateTempPassword(), /^[A-HJ-NP-Za-km-z2-9]+$/);
  }
});

test("dos contraseñas seguidas no se repiten", () => {
  const seen = new Set(Array.from({ length: 200 }, () => generateTempPassword()));
  assert.equal(seen.size, 200);
});
