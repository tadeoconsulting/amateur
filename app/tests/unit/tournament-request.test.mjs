// Pruebas unitarias de src/_lib/tournament-request.ts (sin servidor ni base de datos).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  REQUEST_ACTIONS,
  STATUS_AFTER,
  isRequestAction,
  requestStatusLabel,
  sideForAction,
} from "../../src/_lib/tournament-request.ts";

describe("quién puede cada acción", () => {
  // La tabla de la especificación 006, celda por celda.
  const table = [
    ["request", "accept", "organizer"],
    ["request", "decline", "organizer"],
    ["request", "cancel", "club"],
    ["invite", "accept", "club"],
    ["invite", "decline", "club"],
    ["invite", "cancel", "organizer"],
  ];
  for (const [kind, action, side] of table) {
    test(`${kind} · ${action} → ${side}`, () => {
      assert.equal(sideForAction(kind, action), side);
    });
  }

  test("quien decide nunca es quien canceló: cada tipo reparte los dos lados", () => {
    for (const kind of ["request", "invite"]) {
      assert.notEqual(sideForAction(kind, "accept"), sideForAction(kind, "cancel"));
      assert.equal(sideForAction(kind, "accept"), sideForAction(kind, "decline"));
    }
  });
});

describe("acciones y estados", () => {
  test("solo hay tres acciones y cada una tiene su estado", () => {
    assert.deepEqual([...REQUEST_ACTIONS], ["accept", "decline", "cancel"]);
    assert.deepEqual(STATUS_AFTER, { accept: "accepted", decline: "declined", cancel: "cancelled" });
  });

  test("isRequestAction rechaza cualquier otro valor", () => {
    assert.equal(isRequestAction("accept"), true);
    for (const bad of ["ACCEPT", "aceptar", "", null, undefined, 3, {}]) assert.equal(isRequestAction(bad), false);
  });

  test("las etiquetas están en español y un valor desconocido se muestra tal cual", () => {
    assert.equal(requestStatusLabel("pending"), "Pendiente");
    assert.equal(requestStatusLabel("accepted"), "Aceptada");
    assert.equal(requestStatusLabel("declined"), "Rechazada");
    assert.equal(requestStatusLabel("cancelled"), "Cancelada");
    assert.equal(requestStatusLabel("raro"), "raro");
  });
});
