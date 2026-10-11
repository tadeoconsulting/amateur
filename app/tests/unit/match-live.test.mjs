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
  MATCH_PHASES,
  isMatchPhase,
  canTransitionPhase,
  MATCH_PERIODS,
  isMatchPeriod,
  canTransitionPeriod,
  halfMinutes,
  matchClock,
  halfForEvent,
  splitHalves,
  substitutionError,
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
    assert.equal(statFor("penal_definicion"), null, "un penal de la tanda no es un gol de juego");
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

describe("fases de un partido decisivo", () => {
  test("solo existen regulacion, tiempo_extra y penales", () => {
    assert.deepEqual([...MATCH_PHASES], ["regulacion", "tiempo_extra", "penales"]);
    assert.equal(isMatchPhase("penales"), true);
    assert.equal(isMatchPhase("penalty"), false);
    assert.equal(isMatchPhase(undefined), false);
  });

  test("solo avanza de a una, en orden", () => {
    assert.equal(canTransitionPhase("regulacion", "tiempo_extra"), true);
    assert.equal(canTransitionPhase("tiempo_extra", "penales"), true);
    assert.equal(canTransitionPhase("regulacion", "penales"), false, "no se salta el tiempo extra");
  });

  test("no retrocede (eso es reabrir el partido, no un cambio de fase)", () => {
    assert.equal(canTransitionPhase("tiempo_extra", "regulacion"), false);
    assert.equal(canTransitionPhase("penales", "tiempo_extra"), false);
  });

  test("repetir la misma fase es inofensivo", () => {
    for (const p of MATCH_PHASES) assert.equal(canTransitionPhase(p, p), true);
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

// ─── Partido colgado: el cronómetro no pasa de la duración prevista + 1 h ─────

import { clockSeconds, formatLiveFor, isStale, staleAfterMinutes } from "../../src/_lib/match-live.ts";

const T0 = Date.parse("2026-10-01T15:00:00Z");
const after = (minutes) => T0 + minutes * 60_000;

test("el límite es la duración prevista (dos tiempos, o 70') más una hora", () => {
  assert.equal(staleAfterMinutes(45), 150);
  assert.equal(staleAfterMinutes(null), 130);
  assert.equal(staleAfterMinutes(0), 130);
});

test("un partido normal no se considera colgado, ni con tiempo agregado y prórroga", () => {
  assert.equal(isStale(new Date(T0), after(95), 45), false);
  assert.equal(isStale(new Date(T0), after(150), 45), false);
});

test("pasado el límite sí, y el cronómetro se detiene ahí en vez de seguir contando", () => {
  assert.equal(isStale(new Date(T0), after(151), 45), true);
  assert.equal(clockSeconds(new Date(T0), after(8428), 45), 150 * 60);
  assert.equal(clockSeconds(new Date(T0), after(30), 45), 30 * 60);
});

test("sin hora de inicio nunca está colgado", () => {
  assert.equal(isStale(null, after(9999), 45), false);
  assert.equal(clockSeconds(null, after(9999), 45), 0);
});

test("cuánto lleva en vivo: horas, y días si pasa de dos", () => {
  assert.equal(formatLiveFor(new Date(T0), after(200)), "3 h");
  assert.equal(formatLiveFor(new Date(T0), after(8428)), "5 días");
});

describe("los dos tiempos", () => {
  const MIN = 60_000;
  const t0 = Date.parse("2026-10-10T15:00:00Z");

  test("períodos y transiciones", () => {
    assert.deepEqual([...MATCH_PERIODS], ["primer_tiempo", "descanso", "segundo_tiempo"]);
    assert.equal(isMatchPeriod("descanso"), true);
    assert.equal(isMatchPeriod("tercer_tiempo"), false);
    assert.equal(canTransitionPeriod("primer_tiempo", "descanso"), true);
    assert.equal(canTransitionPeriod("descanso", "segundo_tiempo"), true);
    assert.equal(canTransitionPeriod("descanso", "primer_tiempo"), true, "se tocó sin querer");
    assert.equal(canTransitionPeriod("primer_tiempo", "segundo_tiempo"), false, "no se salta el descanso");
    assert.equal(canTransitionPeriod("segundo_tiempo", "descanso"), false);
    assert.equal(canTransitionPeriod(null, "descanso"), false, "un partido sin tiempos no los estrena a mitad");
  });

  test("minutos de un tiempo: los del torneo o 35 por defecto", () => {
    assert.equal(halfMinutes(40), 40);
    assert.equal(halfMinutes(null), 35);
    assert.equal(halfMinutes(0), 35);
  });

  test("1.er tiempo y partido sin tiempos: corre desde el inicio, pasa del minuto del torneo", () => {
    const m = { startedAt: new Date(t0).toISOString(), period: "primer_tiempo" };
    assert.equal(matchClock(m, t0 + 38 * MIN, 35).minute, 38);
    assert.equal(matchClock({ startedAt: m.startedAt, period: null }, t0 + 12 * MIN, 35).minute, 12);
    assert.equal(matchClock({ startedAt: null, period: "primer_tiempo" }, t0, 35).seconds, 0);
  });

  test("descanso: queda congelado en lo que duró el primer tiempo", () => {
    const m = { startedAt: new Date(t0), period: "descanso", firstHalfEndedAt: new Date(t0 + 37 * MIN) };
    assert.equal(matchClock(m, t0 + 40 * MIN, 35).minute, 37);
    assert.equal(matchClock(m, t0 + 50 * MIN, 35).minute, 37);
    assert.equal(matchClock(m, t0 + 50 * MIN, 35).stale, false);
    assert.equal(matchClock(m, t0 + 37 * MIN + 121 * MIN, 35).stale, true, "un descanso de más de 2 h se da por olvidado");
  });

  test("2.º tiempo: sigue desde los minutos de un tiempo, aunque el primero se alargara", () => {
    const m = {
      startedAt: new Date(t0),
      period: "segundo_tiempo",
      firstHalfEndedAt: new Date(t0 + 38 * MIN),
      secondHalfStartedAt: new Date(t0 + 50 * MIN),
    };
    assert.equal(matchClock(m, t0 + 50 * MIN, 35).minute, 35, "arranca en 35, no en 38");
    assert.equal(matchClock(m, t0 + 62 * MIN, 35).minute, 47);
    assert.equal(matchClock(m, t0 + 62 * MIN + 30_000, 35).seconds, 47 * 60 + 30);
    assert.equal(matchClock(m, t0 + 62 * MIN, 35).stale, false);
  });

  test("un partido colgado se detiene donde se da por colgado", () => {
    const m = { startedAt: new Date(t0), period: null };
    const c = matchClock(m, t0 + 600 * MIN, 35);
    assert.equal(c.stale, true);
    assert.equal(c.seconds, (70 + 60) * 60);
  });

  test("la jugada guarda en qué tiempo ocurrió", () => {
    assert.equal(halfForEvent("primer_tiempo"), 1);
    assert.equal(halfForEvent("descanso"), 1);
    assert.equal(halfForEvent("segundo_tiempo"), 2);
    assert.equal(halfForEvent(null), null);
    assert.equal(halfForEvent(undefined), null);
  });
});

describe("cronología en dos tiempos", () => {
  const ev = (id, minute, half) => ({ id, minute, half });

  test("con tiempos guardados manda el tiempo, no el minuto (el tiempo agregado del primero)", () => {
    const { firstHalf, secondHalf } = splitHalves([ev("a", 12, 1), ev("b", 38, 1), ev("c", 36, 2), ev("d", 50, 2)], 35);
    assert.deepEqual(firstHalf.map((e) => e.id), ["a", "b"]);
    assert.deepEqual(secondHalf.map((e) => e.id), ["c", "d"]);
  });

  test("sin tiempos (partido anterior) se corta por el minuto del torneo, o 45", () => {
    const events = [ev("a", 10), ev("b", 34), ev("c", 40), ev("d", 44)];
    assert.deepEqual(splitHalves(events, 35).secondHalf.map((e) => e.id), ["c", "d"]);
    assert.equal(splitHalves(events, null).secondHalf.length, 0);
    assert.equal(splitHalves([ev("a", 50)], undefined).secondHalf.length, 1);
  });
});

describe("cambios: quién sale y quién entra", () => {
  test("un cambio con los dos jugadores distintos está bien; sin jugador que entra, como antes", () => {
    assert.equal(substitutionError("sustitucion", "p1", "p2"), null);
    assert.equal(substitutionError("sustitucion", "p1", undefined), null);
    assert.equal(substitutionError("sustitucion", null, null), null);
  });
  test("quien entra necesita quien sale, y no puede ser la misma persona", () => {
    assert.match(substitutionError("sustitucion", null, "p2") ?? "", /necesita al que sale/);
    assert.match(substitutionError("sustitucion", "p1", "p1") ?? "", /no puede ser quien sale/);
  });
  test("solo un cambio lleva jugador que entra", () => {
    assert.match(substitutionError("gol", "p1", "p2") ?? "", /Solo un cambio/);
    assert.equal(substitutionError("gol", "p1", undefined), null);
  });
});
