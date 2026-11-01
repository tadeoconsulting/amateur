// Pruebas de src/_lib/event-edit.ts (editar una jugada: minuto y jugador de un gol o una tarjeta), sin servidor.
import { test } from "node:test";
import assert from "node:assert/strict";
import { canDeleteEventIn, canEditEventIn, parseEventEdit, playerEditable, statMove, statOf } from "../../src/_lib/event-edit.ts";
import { EVENT_TYPES, statFor } from "../../src/_lib/match-live.ts";

test("statOf coincide con statFor de match-live para todos los tipos de jugada", () => {
  for (const type of [...EVENT_TYPES, "desconocido"]) {
    for (const scored of [true, false, null, undefined]) {
      assert.equal(statOf(type, scored), type === "desconocido" ? null : statFor(type, scored), `${type} / ${scored}`);
    }
  }
});

test("solo se le cambia el jugador a un gol, una tarjeta o un penal convertido", () => {
  assert.equal(playerEditable("gol"), true);
  assert.equal(playerEditable("tarjeta_amarilla"), true);
  assert.equal(playerEditable("tarjeta_roja"), true);
  assert.equal(playerEditable("penal", true), true);
  // No cuentan en las estadísticas de un jugador (o tienen dos jugadores).
  assert.equal(playerEditable("penal", false), false);
  assert.equal(playerEditable("penal", null), false);
  assert.equal(playerEditable("penal"), false);
  assert.equal(playerEditable("sustitucion"), false);
  assert.equal(playerEditable("penal_definicion", true), false);
  assert.equal(playerEditable("otra_cosa"), false);
});

test("el minuto es un entero de 0 a 200", () => {
  assert.deepEqual(parseEventEdit({ minute: 0 }), { ok: true, edit: { minute: 0 } });
  assert.deepEqual(parseEventEdit({ minute: 200 }), { ok: true, edit: { minute: 200 } });
  for (const minute of [-1, 201, 12.5, "12", null, NaN]) {
    assert.equal(parseEventEdit({ minute }).ok, false, `minute ${minute}`);
  }
});

test("el jugador es un id, o null para dejar la jugada sin jugador", () => {
  assert.deepEqual(parseEventEdit({ playerId: "abc" }), { ok: true, edit: { playerId: "abc" } });
  assert.deepEqual(parseEventEdit({ playerId: null }), { ok: true, edit: { playerId: null } });
  for (const playerId of ["", "   ", 5, {}, false]) {
    assert.equal(parseEventEdit({ playerId }).ok, false, `playerId ${JSON.stringify(playerId)}`);
  }
});

test("se pueden cambiar los dos a la vez, pero hace falta al menos uno", () => {
  assert.deepEqual(parseEventEdit({ minute: 30, playerId: "p2" }), { ok: true, edit: { minute: 30, playerId: "p2" } });
  assert.equal(parseEventEdit({}).ok, false);
  assert.match(parseEventEdit({}).error, /minute y\/o playerId/);
  assert.equal(parseEventEdit(null).ok, false);
  assert.equal(parseEventEdit("texto").ok, false);
  // Lo que no es de esta operación se ignora.
  assert.deepEqual(parseEventEdit({ minute: 5, type: "gol", teamId: "x" }), { ok: true, edit: { minute: 5 } });
});

test("al cambiar el jugador, la estadística se le quita al anterior y se le suma al nuevo", () => {
  assert.deepEqual(statMove("gol", null, "a", "b"), { stat: "goals", decrement: "a", increment: "b" });
  assert.deepEqual(statMove("tarjeta_amarilla", null, "a", "b"), { stat: "yellowCards", decrement: "a", increment: "b" });
  assert.deepEqual(statMove("tarjeta_roja", null, "a", "b"), { stat: "redCards", decrement: "a", increment: "b" });
  assert.deepEqual(statMove("penal", true, "a", "b"), { stat: "goals", decrement: "a", increment: "b" });
});

test("asignar un jugador a una jugada sin jugador solo suma; quitarlo solo resta", () => {
  assert.deepEqual(statMove("gol", null, null, "b"), { stat: "goals", decrement: null, increment: "b" });
  assert.deepEqual(statMove("gol", null, "a", null), { stat: "goals", decrement: "a", increment: null });
});

test("si no hay nada que mover, statMove devuelve null", () => {
  assert.equal(statMove("gol", null, "a", "a"), null, "el mismo jugador");
  assert.equal(statMove("gol", null, null, null), null, "sin jugador antes ni después");
  assert.equal(statMove("sustitucion", null, "a", "b"), null, "no cuenta estadística");
  assert.equal(statMove("penal", false, "a", "b"), null, "un penal errado no suma");
  assert.equal(statMove("cualquiera", null, "a", "b"), null, "tipo desconocido");
});

test("las jugadas se corrigen en juego y finalizado, no en un partido sin empezar", () => {
  assert.equal(canEditEventIn("en_curso"), true);
  assert.equal(canEditEventIn("finalizado"), true);
  assert.equal(canEditEventIn("programado"), false);
});

test("borrar una jugada de un partido finalizado solo si no es decisivo", () => {
  assert.equal(canDeleteEventIn("en_curso", false), true);
  assert.equal(canDeleteEventIn("en_curso", true), true);
  assert.equal(canDeleteEventIn("finalizado", false), true);
  assert.equal(canDeleteEventIn("finalizado", true), false);
  assert.equal(canDeleteEventIn("programado", false), false);
});
