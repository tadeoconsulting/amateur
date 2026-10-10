// Pruebas unitarias de src/_lib/delegate-invitation.ts (sin servidor ni base de datos).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { checkDelegateAccept } from "../../src/_lib/delegate-invitation.ts";

const now = new Date("2026-10-10T12:00:00Z");
const base = {
  status: "pending",
  expiresAt: new Date("2026-10-15T12:00:00Z"),
  now,
  email: null,
  sessionEmail: "delegado@ejemplo.test",
  sessionIsAdmin: false,
  sessionOwnedClubs: 0,
  clubIsTemporary: true,
};

describe("aceptar la invitación de delegado", () => {
  test("una cuenta sin equipo acepta un enlace vigente", () => {
    assert.deepEqual(checkDelegateAccept(base), { ok: true });
  });

  test("con correo, solo lo acepta esa cuenta (sin importar mayúsculas)", () => {
    assert.equal(checkDelegateAccept({ ...base, email: "Delegado@Ejemplo.test" }).ok, true);
    const other = checkDelegateAccept({ ...base, email: "otra@ejemplo.test" });
    assert.equal(other.ok, false);
    assert.equal(other.status, 403);
    assert.equal(other.code, "wrong_email");
    assert.ok(!other.message.includes("otra@"), "no revela el correo");
  });

  test("usada, cancelada o vencida", () => {
    assert.equal(checkDelegateAccept({ ...base, status: "accepted" }).code, "used");
    assert.equal(checkDelegateAccept({ ...base, status: "cancelled" }).code, "used");
    const expired = checkDelegateAccept({ ...base, expiresAt: new Date("2026-10-10T12:00:00Z") });
    assert.equal(expired.status, 410);
    assert.equal(expired.code, "expired");
  });

  test("si el equipo ya es oficial (otro delegado) no se acepta", () => {
    const r = checkDelegateAccept({ ...base, clubIsTemporary: false });
    assert.equal(r.status, 410);
    assert.equal(r.code, "official");
  });

  test("mismas reglas que Oficializar: ni administradores ni quien ya dirige un equipo", () => {
    assert.equal(checkDelegateAccept({ ...base, sessionIsAdmin: true }).code, "admin");
    const has = checkDelegateAccept({ ...base, sessionOwnedClubs: 1 });
    assert.equal(has.status, 409);
    assert.equal(has.code, "has_club");
  });

  test("lo que no tiene arreglo se dice antes que el correo equivocado", () => {
    assert.equal(checkDelegateAccept({ ...base, status: "cancelled", email: "otra@ejemplo.test" }).code, "used");
    assert.equal(checkDelegateAccept({ ...base, email: "otra@ejemplo.test", sessionOwnedClubs: 2 }).code, "wrong_email");
  });
});
