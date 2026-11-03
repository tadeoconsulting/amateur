// Pruebas de src/_lib/password-rules.ts (una contraseña nueva: al menos 8 caracteres y una mayúscula), sin servidor.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, PASSWORD_HINT, passwordChecks, passwordError } from "../../src/_lib/password-rules.ts";

test("una contraseña con 8 o más caracteres y una mayúscula es válida", () => {
  for (const ok of ["Abcdefg1", "contraseñA", "UNA-clave-larga", "12345678A", "Passw0rd-de-prueba", "Ñandú1234", "ábcdefgÁ"]) {
    assert.equal(passwordError(ok), null, ok);
  }
});

test("sin mayúscula se pide una, con un mensaje que dice qué hacer", () => {
  for (const weak of ["abcdefgh", "clave-segura-123", "12345678", "contraseña1", "áéíóúñ12"]) {
    assert.equal(passwordError(weak), "Agrega al menos una letra mayúscula a tu contraseña", weak);
  }
});

test("muy corta, el mensaje es el de siempre; corta y sin mayúscula, pide las dos cosas", () => {
  assert.equal(passwordError("Corta1"), `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
  assert.equal(passwordError("corta"), `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres y una letra mayúscula`);
  assert.equal(passwordError(""), `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres y una letra mayúscula`);
});

test("lo que no es un texto se rechaza", () => {
  for (const v of [undefined, null, 12345678, {}, ["Abcdefgh"], true]) {
    assert.match(passwordError(v), /al menos 8 caracteres y una letra mayúscula/, String(v));
  }
});

test("el límite es de 72 bytes (lo que lee bcrypt), no de letras", () => {
  assert.equal(passwordError("A" + "a".repeat(MAX_PASSWORD_LENGTH - 1)), null, "justo 72 bytes");
  assert.match(passwordError("A" + "a".repeat(MAX_PASSWORD_LENGTH)), /no puede superar 72/, "73 bytes");
  // Cada «ñ» pesa 2 bytes: 40 de ellas son 80 bytes aunque sean 41 caracteres.
  assert.match(passwordError("A" + "ñ".repeat(40)), /no puede superar 72/);
});

test("un espacio o un símbolo no cuentan como mayúscula, y un número tampoco", () => {
  assert.equal(passwordChecks("abc def 12 !?").uppercase, false);
  assert.equal(passwordChecks("abc Def").uppercase, true);
});

test("passwordChecks marca cada requisito por separado (para la ayuda en pantalla)", () => {
  assert.deepEqual(passwordChecks(""), { length: false, uppercase: false });
  assert.deepEqual(passwordChecks("A"), { length: false, uppercase: true });
  assert.deepEqual(passwordChecks("abcdefgh"), { length: true, uppercase: false });
  assert.deepEqual(passwordChecks("Abcdefgh"), { length: true, uppercase: true });
});

test("la frase de ayuda dice las dos reglas", () => {
  assert.match(PASSWORD_HINT, /8 caracteres/);
  assert.match(PASSWORD_HINT, /mayúscula/);
});
