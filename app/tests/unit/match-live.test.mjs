// Pruebas unitarias de src/_lib/match-live.ts (sin servidor ni base de datos).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  MATCH_STATUSES,
  canTransition,
  isMatchStatus,
  isEventType,
  changesScore,
  statFor,
  liveMinute,
  liveSeconds,
  matchDurationMinutes,
  EVENT_TYPE_FROM_ACTION,
  EVENT_TYPES,
} from "../../src/_lib/match-live.ts";

describe("estados del partido", () => {
  test("solo existen programado, en_curso y finalizado (no en_vivo)", () => {
    assert.deepEqual([...MATCH_STATUSES], ["programado", "en_curso", "finalizado"]);
    assert.equal(isMatchStatus("en_vivo"), false);
    assert.equal(isMatchStatus("en_curso"), true);
    assert.equal(isMatchStatus(undefined), false);
  });

  test("transiciones permitidas", () => {
    assert.equal(canTransition("programado", "en_curso"), true);
    assert.equal(canTransition("programado", "finalizado"), true, "cargar el resultado sin transmitir");
    assert.equal(canTransition("en_curso", "finalizado"), true);
    assert.equal(canTransition("en_curso", "programado"), true, "se inició por error");
    assert.equal(canTransition("finalizado", "en_curso"), true, "reabrir para corregir");
  });

  test("transiciones que no", () => {
    assert.equal(canTransition("finalizado", "programado"), false, "un partido terminado no vuelve a 'programado' de golpe");
  });

  test("repetir el mismo estado es inofensivo", () => {
    for (const s of MATCH_STATUSES) assert.equal(canTransition(s, s), true);
  });
});

describe("eventos", () => {
  test("solo el gol cambia el marcador", () => {
    for (const t of EVENT_TYPES) assert.equal(changesScore(t), t === "gol", t);
  });

  test("qué estadística sube con cada evento", () => {
    assert.equal(statFor("gol"), "goals");
    assert.equal(statFor("tarjeta_amarilla"), "yellowCards");
    assert.equal(statFor("tarjeta_roja"), "redCards");
    assert.equal(statFor("sustitucion"), null);
    assert.equal(statFor("penal"), null);
  });

  test("los botones de la pantalla en vivo se traducen a tipos válidos de la API", () => {
    for (const action of ["gol", "amarilla", "roja", "cambio", "penal"]) {
      assert.ok(isEventType(EVENT_TYPE_FROM_ACTION[action]), action);
    }
    assert.equal(EVENT_TYPE_FROM_ACTION.amarilla, "tarjeta_amarilla");
    assert.equal(EVENT_TYPE_FROM_ACTION.cambio, "sustitucion");
    assert.equal(isEventType("amarilla"), false, "el nombre de la pantalla no es un tipo de la API");
  });
});

describe("cronómetro", () => {
  const start = "2026-10-03T18:00:00.000Z";
  const at = (extraSeconds) => Date.parse(start) + extraSeconds * 1000;

  test("minutos y segundos desde el inicio", () => {
    assert.equal(liveMinute(start, at(0)), 0);
    assert.equal(liveMinute(start, at(59)), 0);
    assert.equal(liveMinute(start, at(60)), 1);
    assert.equal(liveMinute(start, at(25 * 60 + 30)), 25);
    assert.equal(liveSeconds(start, at(75)), 75);
  });

  test("sin inicio o con un dato inválido es 0, y nunca es negativo", () => {
    assert.equal(liveMinute(null, Date.now()), 0);
    assert.equal(liveMinute(undefined, Date.now()), 0);
    assert.equal(liveMinute("no es fecha", Date.now()), 0);
    assert.equal(liveMinute(start, at(-500)), 0, "reloj adelantado");
    assert.equal(liveSeconds(start, at(-500)), 0);
  });

  test("acepta un Date", () => {
    assert.equal(liveMinute(new Date(start), at(180)), 3);
  });

  test("duración prevista", () => {
    assert.equal(matchDurationMinutes(25), 50);
    assert.equal(matchDurationMinutes(45), 90);
    assert.equal(matchDurationMinutes(null), 70);
    assert.equal(matchDurationMinutes(0), 70);
  });
});
