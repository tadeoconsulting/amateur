// Pruebas de src/_lib/club-delegate.ts (co-delegados, especificación 014), sin servidor.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { MAX_CO_DELEGATES, canDo, checkCoDelegateAccept, coDelegateSlotsLeft, roleIn } from "../../src/_lib/club-delegate.ts";

describe("permisos por rol", () => {
  test("el principal y el co-delegado gestionan el equipo; un tercero no", () => {
    assert.equal(canDo("principal", "manage"), true);
    assert.equal(canDo("co", "manage"), true);
    assert.equal(canDo("admin", "manage"), true);
    assert.equal(canDo(null, "manage"), false);
  });

  test("el contacto público y los co-delegados los gestionan solo el principal y el admin", () => {
    for (const action of ["edit_contact", "manage_delegates"]) {
      assert.equal(canDo("principal", action), true, action);
      assert.equal(canDo("admin", action), true, action);
      assert.equal(canDo("co", action), false, action);
      assert.equal(canDo(null, action), false, action);
    }
  });

  test("eliminar y transferir el equipo son solo del admin", () => {
    for (const action of ["delete", "transfer"]) {
      assert.equal(canDo("admin", action), true, action);
      assert.equal(canDo("principal", action), false, action);
      assert.equal(canDo("co", action), false, action);
    }
  });
});

describe("el rol de una persona en un equipo", () => {
  const who = (over = {}) => ({ isAdmin: false, userId: "u1", ownerOf: [], coOf: null, ...over });

  test("admin, principal, co-delegado o nada", () => {
    assert.equal(roleIn("c1", who({ isAdmin: true })), "admin");
    assert.equal(roleIn("c1", who({ ownerOf: ["c1"] })), "principal");
    assert.equal(roleIn("c1", who({ coOf: "c1" })), "co");
    assert.equal(roleIn("c1", who()), null);
  });

  test("ser de otro equipo no da ningún rol en este", () => {
    assert.equal(roleIn("c1", who({ ownerOf: ["c2"] })), null);
    assert.equal(roleIn("c1", who({ coOf: "c2" })), null);
  });

  test("el admin manda sobre todo, y el principal sobre el co-delegado", () => {
    assert.equal(roleIn("c1", who({ isAdmin: true, ownerOf: ["c1"] })), "admin");
    assert.equal(roleIn("c1", who({ ownerOf: ["c1"], coOf: "c1" })), "principal");
  });
});

describe("lugares de co-delegado", () => {
  test("el máximo es 3", () => assert.equal(MAX_CO_DELEGATES, 3));

  test("los aceptados y las invitaciones vigentes cuentan por igual", () => {
    assert.equal(coDelegateSlotsLeft(0, 0), 3);
    assert.equal(coDelegateSlotsLeft(1, 1), 1);
    assert.equal(coDelegateSlotsLeft(2, 1), 0);
    assert.equal(coDelegateSlotsLeft(3, 0), 0);
  });

  test("nunca queda negativo", () => assert.equal(coDelegateSlotsLeft(3, 5), 0));
});

describe("aceptar una invitación de co-delegado", () => {
  const now = new Date("2026-10-18T12:00:00Z");
  const base = {
    status: "pending",
    expiresAt: new Date("2026-10-25T12:00:00Z"),
    now,
    email: null,
    sessionEmail: "persona@correo.test",
    sessionIsAdmin: false,
    sessionClubs: 0,
    clubIsTemporary: false,
    acceptedCoDelegates: 0,
  };
  const check = (over = {}) => checkCoDelegateAccept({ ...base, ...over });

  test("una invitación vigente la acepta una cuenta sin equipo", () => {
    assert.deepEqual(check(), { ok: true });
  });

  test("usada o cancelada", () => {
    for (const status of ["accepted", "cancelled"]) {
      const r = check({ status });
      assert.equal(r.ok, false);
      assert.equal(r.code, "used");
      assert.equal(r.status, 410);
    }
  });

  test("vencida", () => {
    const r = check({ expiresAt: new Date("2026-10-18T11:59:59Z") });
    assert.equal(r.code, "expired");
    assert.equal(r.status, 410);
  });

  test("el equipo temporal no admite co-delegados", () => {
    assert.equal(check({ clubIsTemporary: true }).code, "temporary");
  });

  test("con correo, solo la cuenta con ese correo (sin distinguir mayúsculas)", () => {
    assert.equal(check({ email: "otra@correo.test" }).code, "wrong_email");
    assert.deepEqual(check({ email: "PERSONA@correo.test" }), { ok: true });
  });

  test("un administrador no puede ser delegado", () => {
    assert.equal(check({ sessionIsAdmin: true }).code, "admin");
  });

  test("un equipo por persona: quien ya dirige o co-dirige otro no puede aceptar", () => {
    const r = check({ sessionClubs: 1 });
    assert.equal(r.code, "has_club");
    assert.equal(r.status, 409);
  });

  test("con 3 co-delegados el equipo está lleno", () => {
    assert.equal(check({ acceptedCoDelegates: 3 }).code, "full");
    assert.deepEqual(check({ acceptedCoDelegates: 2 }), { ok: true });
  });

  test("primero lo irreparable: una invitación usada gana sobre el resto de los problemas", () => {
    const r = check({ status: "accepted", sessionIsAdmin: true, acceptedCoDelegates: 3, email: "x@y.test" });
    assert.equal(r.code, "used");
  });
});
