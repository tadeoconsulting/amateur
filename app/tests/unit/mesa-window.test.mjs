// Pruebas unitarias de src/_lib/mesa-window.ts (sin servidor ni base de datos).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { matchStartMs, limaDay, mesaWindows, windowOpenAt, nextWindow, matchOpenAt } from "../../src/_lib/mesa-window.ts";

const HOUR = 3_600_000;
// Hora de Perú → instante (Lima = UTC-5).
const lima = (day, hhmm) => matchStartMs(day, hhmm);
const m = (date, time, status = "programado", finishedAt = null) => ({ date, time, status, finishedAt });

describe("hora de Perú", () => {
  test("la hora del partido es de Perú (UTC-5)", () => {
    assert.equal(new Date(lima("2026-10-17", "15:00")).toISOString(), "2026-10-17T20:00:00.000Z");
    assert.equal(new Date(lima("2026-10-17", "23:30")).toISOString(), "2026-10-18T04:30:00.000Z", "cruza el día en UTC");
  });
  test("un partido sin hora o con datos inválidos no tiene instante", () => {
    assert.equal(matchStartMs("2026-10-17", ""), null);
    assert.equal(matchStartMs("2026-10-17", "25:00"), null);
    assert.equal(matchStartMs("17/10/2026", "15:00"), null);
  });
  test("el día calendario de un instante se cuenta en Perú", () => {
    assert.equal(limaDay(Date.parse("2026-10-18T04:30:00Z")), "2026-10-17");
    assert.equal(limaDay(Date.parse("2026-10-18T05:00:00Z")), "2026-10-18");
  });
});

describe("ventana de la mesa", () => {
  const day = "2026-10-17";

  test("abre 1 h antes del primer partido del día", () => {
    const [w] = mesaWindows([m(day, "15:00"), m(day, "13:30"), m(day, "17:00")]);
    assert.equal(w.opensAt, lima(day, "12:30"));
  });

  test("con todos finalizados cierra 1 h después de que terminó el último", () => {
    const end = lima(day, "18:40");
    const [w] = mesaWindows([m(day, "15:00", "finalizado", lima(day, "16:30")), m(day, "17:00", "finalizado", end)]);
    assert.equal(w.closesAt, end + HOUR);
    assert.equal(windowOpenAt([w], end + HOUR - 1) !== null, true);
    assert.equal(windowOpenAt([w], end + HOUR), null);
  });

  test("finalizado sin hora de término: el cierre nunca queda antes del partido", () => {
    const [w] = mesaWindows([m(day, "15:00", "finalizado")]);
    assert.equal(w.closesAt, lima(day, "15:00") + HOUR);
  });

  test("con un partido en curso sigue abierta, hasta 12 h después del último partido programado", () => {
    const [w] = mesaWindows([m(day, "15:00", "finalizado", lima(day, "16:30")), m(day, "17:00", "en_curso")]);
    assert.equal(w.closesAt, lima(day, "17:00") + 12 * HOUR);
    assert.notEqual(windowOpenAt([w], lima(day, "23:45")), null);
  });

  test("si nadie finaliza, cierra 4 h después de la hora programada del último", () => {
    const [w] = mesaWindows([m(day, "15:00"), m(day, "17:00")]);
    assert.equal(w.closesAt, lima(day, "17:00") + 4 * HOUR);
  });

  test("no abre antes de tiempo ni de un día sin partidos", () => {
    const windows = mesaWindows([m(day, "15:00")]);
    assert.equal(windowOpenAt(windows, lima(day, "13:59")), null);
    assert.notEqual(windowOpenAt(windows, lima(day, "14:00")), null);
    assert.equal(windowOpenAt(windows, lima("2026-10-18", "14:00")), null);
  });

  test("un partido sin hora no abre ventana", () => {
    assert.deepEqual(mesaWindows([m(day, ""), m(day, "")]), []);
    assert.equal(mesaWindows([m(day, ""), m(day, "15:00")]).length, 1);
  });

  test("una ventana por día, ordenadas; la siguiente es la primera que todavía no abrió", () => {
    const windows = mesaWindows([m("2026-10-24", "10:00"), m(day, "15:00")]);
    assert.deepEqual(windows.map((w) => w.day), [day, "2026-10-24"]);
    assert.equal(nextWindow(windows, lima(day, "09:00")).day, day);
    assert.equal(nextWindow(windows, lima(day, "20:00")).day, "2026-10-24");
    assert.equal(nextWindow(windows, lima("2026-10-25", "00:00")), null);
  });

  test("un partido que cruza la medianoche mantiene la ventana de su día", () => {
    const [w] = mesaWindows([m(day, "22:30", "en_curso")]);
    assert.notEqual(windowOpenAt([w], lima("2026-10-18", "00:30")), null);
  });

  test("reprogramar un partido mueve la ventana (sale de la fecha y la hora actuales)", () => {
    const before = mesaWindows([m(day, "15:00")])[0];
    const after = mesaWindows([m(day, "16:00")])[0];
    assert.equal(after.opensAt - before.opensAt, HOUR);
  });
});

describe("qué partidos se pueden gestionar", () => {
  const today = "2026-10-17";
  const windows = mesaWindows([m(today, "15:00"), m("2026-10-24", "10:00"), m("2026-10-31", "")]);
  const now = lima(today, "14:30");

  test("un partido del día con la ventana abierta, sí", () => {
    assert.equal(matchOpenAt(windows, { date: today, time: "15:00" }, now), true);
  });
  test("un partido de otro día del mismo torneo, no", () => {
    assert.equal(matchOpenAt(windows, { date: "2026-10-24", time: "10:00" }, now), false);
  });
  test("un partido sin hora, no, aunque sea del día de la ventana", () => {
    assert.equal(matchOpenAt(windows, { date: today, time: "" }, now), false);
    assert.equal(matchOpenAt(windows, { date: "2026-10-31", time: "" }, now), false);
  });
  test("con la ventana cerrada, no", () => {
    assert.equal(matchOpenAt(windows, { date: today, time: "15:00" }, lima(today, "12:00")), false);
  });
});
