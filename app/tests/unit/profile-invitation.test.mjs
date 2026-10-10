// Pruebas de las invitaciones para reclamar un perfil provisional (src/_lib/profile-invitation.ts, sin base de datos).
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAccept, daysLeft, digitsOnly, effectiveStatus, maskEmail, MAX_DNI_ATTEMPTS, PROFILE_INVITE_DAYS } from "../../src/_lib/profile-invitation.ts";

const NOW = new Date("2026-10-10T12:00:00Z");
const FUTURE = new Date("2026-10-15T12:00:00Z");
const base = (over = {}) => ({ status: "pending", expiresAt: FUTURE, now: NOW, attempts: 0, email: "ana@correo.com", sessionEmail: "ana@correo.com", typedDni: "10000001", profileDni: "10000001", ...over });

test("las invitaciones duran 7 días", () => {
  assert.equal(PROFILE_INVITE_DAYS, 7);
});

test("el correo se enmascara para decir con cuál entrar sin mostrarlo entero", () => {
  assert.equal(maskEmail("ana.perez@correo.com"), "a***@correo.com");
  assert.equal(maskEmail("x@y.pe"), "x***@y.pe");
  assert.equal(maskEmail("sin-arroba"), "***");
});

test("el DNI escrito con espacios o guiones se entiende", () => {
  assert.equal(digitsOnly(" 10 000-001 "), "10000001");
  assert.equal(digitsOnly(null), "");
});

test("una invitación vigente que pasó su fecha está vencida; los días que le quedan nunca son negativos", () => {
  assert.equal(effectiveStatus("pending", FUTURE, NOW), "pending");
  assert.equal(effectiveStatus("pending", new Date("2026-10-09T00:00:00Z"), NOW), "expired");
  assert.equal(effectiveStatus("review", new Date("2026-10-09T00:00:00Z"), NOW), "review"); // lo ya aceptado no vence
  assert.equal(daysLeft(FUTURE, NOW), 5);
  assert.equal(daysLeft(new Date("2026-10-10T18:00:00Z"), NOW), 1); // vence hoy: 1 día
  assert.equal(daysLeft(new Date("2026-09-01T00:00:00Z"), NOW), 0);
});

test("con el correo y el DNI correctos se acepta", () => {
  assert.deepEqual(checkAccept(base()), { ok: true });
  assert.deepEqual(checkAccept(base({ sessionEmail: "ANA@Correo.com", typedDni: "10 000 001" })), { ok: true }); // sin distinguir mayúsculas ni espacios
});

test("un enlace sin correo lo acepta cualquier cuenta, pero con el DNI", () => {
  assert.deepEqual(checkAccept(base({ email: null, sessionEmail: "otra@correo.com" })), { ok: true });
  assert.equal(checkAccept(base({ email: null, typedDni: "99999999" })).code, "wrong_dni");
});

test("otro correo se rechaza sin contar intento, y dice con cuál entrar (enmascarado)", () => {
  const r = checkAccept(base({ sessionEmail: "otra@correo.com" }));
  assert.equal(r.ok, false);
  assert.equal(r.code, "wrong_email");
  assert.equal(r.status, 403);
  assert.equal(r.countAttempt, undefined);
  assert.match(r.message, /a\*\*\*@correo\.com/);
  assert.doesNotMatch(r.message, /ana@correo\.com/); // nunca el correo completo
});

test("un DNI mal escrito no cuenta como intento; uno equivocado sí, y avisa cuántos quedan", () => {
  const mal = checkAccept(base({ typedDni: "123" }));
  assert.equal(mal.code, "bad_dni");
  assert.equal(mal.countAttempt, undefined);

  const uno = checkAccept(base({ typedDni: "99999999" }));
  assert.equal(uno.code, "wrong_dni");
  assert.equal(uno.countAttempt, true);
  assert.equal(uno.attemptsLeft, MAX_DNI_ATTEMPTS - 1);
  assert.match(uno.message, /Te quedan 4 intentos/);

  const ultimo = checkAccept(base({ typedDni: "99999999", attempts: MAX_DNI_ATTEMPTS - 1 }));
  assert.equal(ultimo.attemptsLeft, 0);
  assert.match(ultimo.message, /se bloqueó/);
  assert.match(checkAccept(base({ typedDni: "99999999", attempts: MAX_DNI_ATTEMPTS - 2 })).message, /Te quedan 1 intento\./);
});

test("bloqueada, usada, cancelada o vencida: ni siquiera se mira el DNI", () => {
  assert.equal(checkAccept(base({ status: "locked" })).status, 423);
  assert.equal(checkAccept(base({ attempts: MAX_DNI_ATTEMPTS })).code, "locked"); // el contador manda aunque el estado no se haya actualizado
  for (const status of ["accepted", "cancelled", "review"]) assert.equal(checkAccept(base({ status })).code, "used");
  const vencida = checkAccept(base({ expiresAt: new Date("2026-10-09T00:00:00Z") }));
  assert.equal(vencida.code, "expired");
  assert.equal(vencida.status, 410);
  // con el DNI correcto no se salva: bloqueada es bloqueada
  assert.equal(checkAccept(base({ status: "locked", typedDni: "10000001" })).code, "locked");
});
