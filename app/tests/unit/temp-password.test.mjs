// Pruebas unitarias de src/_lib/temp-password.ts (sin servidor ni base de datos).
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateTempPassword, TEMP_PASSWORD_LENGTH } from "../../src/_lib/temp-password.ts";
import { passwordError } from "../../src/_lib/password-rules.ts";

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

test("siempre lleva una mayúscula, una minúscula y un número, así que cumple la regla de toda contraseña nueva", () => {
  // Sin la garantía, una al azar sin mayúscula sale ~1 de cada 800: con 5000 se habría visto varias veces.
  for (let i = 0; i < 5000; i++) {
    const p = generateTempPassword();
    assert.match(p, /[A-Z]/, p);
    assert.match(p, /[a-z]/, p);
    assert.match(p, /[0-9]/, p);
    assert.equal(passwordError(p), null, p);
  }
});

test("la garantía vale también con un largo corto, y las tres clases no quedan siempre al principio", () => {
  for (let i = 0; i < 500; i++) {
    const p = generateTempPassword(8);
    assert.equal(p.length, 8);
    assert.equal(passwordError(p), null, p);
  }
  const firstThree = new Set(Array.from({ length: 300 }, () => generateTempPassword().slice(0, 3).replace(/[A-Z]/g, "U").replace(/[a-z]/g, "l").replace(/[0-9]/g, "d")));
  assert.ok(firstThree.size > 3, "se mezclan: no siempre arranca igual");
});

test("dos contraseñas seguidas no se repiten", () => {
  const seen = new Set(Array.from({ length: 200 }, () => generateTempPassword()));
  assert.equal(seen.size, 200);
});
