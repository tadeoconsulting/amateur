// Pruebas unitarias de src/_lib/password-reset.ts y la plantilla de "Olvidé mi contraseña".
import { test } from "node:test";
import assert from "node:assert/strict";
import { hashResetToken, inCooldown, newResetToken, resetExpiry, RESET_COOLDOWN_SECONDS, RESET_TOKEN_MINUTES } from "../../src/_lib/password-reset.ts";
import { restablecerContrasena } from "../../src/_lib/email-templates.ts";

test("el token es aleatorio, largo y apto para un enlace", () => {
  const { token } = newResetToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/); // 32 bytes en base64url
  assert.notEqual(token, newResetToken().token);
});

test("lo que se guarda es el hash del token, no el token", () => {
  const { token, tokenHash } = newResetToken();
  assert.notEqual(tokenHash, token);
  assert.match(tokenHash, /^[0-9a-f]{64}$/);
  assert.equal(hashResetToken(token), tokenHash);
  assert.notEqual(hashResetToken(token + "x"), tokenHash);
});

test("el enlace vale una hora", () => {
  const now = Date.parse("2026-10-04T12:00:00Z");
  assert.equal(RESET_TOKEN_MINUTES, 60);
  assert.equal(resetExpiry(now).toISOString(), "2026-10-04T13:00:00.000Z");
});

test("no se manda otro enlace dentro del tiempo de espera, y sí pasado", () => {
  const now = Date.parse("2026-10-04T12:00:00Z");
  const ago = (s) => new Date(now - s * 1000);
  assert.equal(inCooldown(null, now), false);
  assert.equal(inCooldown(ago(10), now), true);
  assert.equal(inCooldown(ago(RESET_COOLDOWN_SECONDS - 1), now), true);
  assert.equal(inCooldown(ago(RESET_COOLDOWN_SECONDS + 1), now), false);
});

test("el correo lleva el enlace y cuánto dura, y dice qué hacer si no fue la persona", () => {
  const url = "https://app.test/restablecer?token=abc";
  const c = restablecerContrasena({ url, minutes: 60 });
  assert.equal(c.subject, "Restablece tu contraseña de Amateur");
  assert.ok(c.text.includes(url) && c.text.includes("60 minutos") && c.text.includes("ignora este correo"));
  assert.ok(c.html.includes(url));
});
