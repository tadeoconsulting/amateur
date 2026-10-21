// Pruebas de src/_lib/club-training.ts (entrenamientos y asistencia, especificación 015, entrega 2), sin servidor.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  attendancePercent,
  attendanceSummary,
  canMarkSession,
  datesOnWeekday,
  countLabel,
  dayLabel,
  relativeDayLabel,
  fromPeru,
  isDate,
  isDuration,
  isTime,
  nextAttendance,
  playerAttendance,
  scheduleError,
  scheduleStarts,
  sessionCounts,
  sessionPercent,
  weekStart,
  weeklyAttendanceTrend,
  timeRange,
  toPeru,
} from "../../src/_lib/club-training.ts";

describe("hora de Perú", () => {
  test("19:00 en Lima son las 00:00 UTC del día siguiente", () => {
    assert.equal(fromPeru("2026-10-20", "19:00").toISOString(), "2026-10-21T00:00:00.000Z");
  });

  test("toPeru y fromPeru son inversas", () => {
    const d = fromPeru("2026-12-31", "23:30");
    assert.deepEqual(toPeru(d), { date: "2026-12-31", time: "23:30", weekday: 4 });
  });

  test("a las 2 a. m. UTC todavía es el día anterior en Lima", () => {
    assert.deepEqual(toPeru(new Date("2026-11-01T02:00:00Z")), { date: "2026-10-31", time: "21:00", weekday: 6 });
  });

  test("un martes 19:00 de Lima cae en martes en Lima aunque en UTC sea miércoles", () => {
    const d = fromPeru("2026-10-20", "19:00"); // martes
    assert.equal(toPeru(d).weekday, 2);
    assert.equal(d.getUTCDay(), 3);
  });
});

describe("validaciones", () => {
  test("isTime", () => {
    for (const ok of ["00:00", "07:05", "19:00", "23:59"]) assert.equal(isTime(ok), true, ok);
    for (const bad of ["24:00", "7:00", "19:60", "1900", "", null, 19]) assert.equal(isTime(bad), false, String(bad));
  });

  test("isDuration va de 15 a 300 minutos enteros", () => {
    assert.equal(isDuration(90), true);
    assert.equal(isDuration(15), true);
    assert.equal(isDuration(300), true);
    for (const bad of [14, 301, 90.5, "90", null]) assert.equal(isDuration(bad), false, String(bad));
  });

  test("isDate rechaza fechas imposibles", () => {
    assert.equal(isDate("2026-10-20"), true);
    assert.equal(isDate("2026-02-31"), false);
    assert.equal(isDate("2026-13-01"), false);
    assert.equal(isDate("20-10-2026"), false);
  });

  test("scheduleError revisa día, hora y duración", () => {
    assert.equal(scheduleError({ weekday: 2, startTime: "19:00", durationMin: 90 }), null);
    assert.match(scheduleError({ weekday: 7, startTime: "19:00", durationMin: 90 }), /día/);
    assert.match(scheduleError({ weekday: 2, startTime: "7pm", durationMin: 90 }), /HH:MM/);
    assert.match(scheduleError({ weekday: 2, startTime: "19:00", durationMin: 5 }), /duración/);
  });
});

describe("generar sesiones", () => {
  test("addDays cruza meses y años", () => {
    assert.equal(addDays("2026-10-31", 1), "2026-11-01");
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
    assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  });

  test("un horario semanal da 4 sesiones en 28 días", () => {
    assert.deepEqual(datesOnWeekday(2, "2026-10-18", 28), ["2026-10-20", "2026-10-27", "2026-11-03", "2026-11-10"]);
  });

  test("si hoy es el día del horario, hoy cuenta", () => {
    assert.equal(datesOnWeekday(0, "2026-10-18", 28)[0], "2026-10-18"); // domingo
  });

  test("scheduleStarts devuelve los instantes reales a la hora de Lima", () => {
    const starts = scheduleStarts({ weekday: 2, startTime: "19:00" }, "2026-10-18", 14);
    assert.deepEqual(starts.map((d) => d.toISOString()), ["2026-10-21T00:00:00.000Z", "2026-10-28T00:00:00.000Z"]);
  });

  test("timeRange suma la duración", () => {
    assert.equal(timeRange("19:00", 90), "19:00–20:30");
    assert.equal(timeRange("23:00", 120), "23:00–01:00");
  });
});

describe("pasar lista", () => {
  const session = (date, time, status = "programada") => ({ status, startsAt: fromPeru(date, time) });

  test("una sesión de hoy se puede marcar aunque su hora no haya llegado", () => {
    const now = fromPeru("2026-10-20", "17:00");
    assert.equal(canMarkSession(session("2026-10-20", "19:00"), now), true);
  });

  test("una sesión de mañana no, y una pasada sí", () => {
    const now = fromPeru("2026-10-20", "17:00");
    assert.equal(canMarkSession(session("2026-10-21", "08:00"), now), false);
    assert.equal(canMarkSession(session("2026-10-13", "19:00"), now), true);
  });

  test("una sesión cancelada no se marca nunca", () => {
    assert.equal(canMarkSession(session("2026-10-13", "19:00", "cancelada"), fromPeru("2026-10-20", "17:00")), false);
  });

  test("el toque rota: sin marcar, presente, ausente, justificado, sin marcar", () => {
    assert.equal(nextAttendance(null), "presente");
    assert.equal(nextAttendance("presente"), "ausente");
    assert.equal(nextAttendance("ausente"), "justificado");
    assert.equal(nextAttendance("justificado"), null);
  });
});

describe("promedios de asistencia", () => {
  test("las justificadas y las sin marcar no cuentan", () => {
    assert.equal(attendancePercent({ presente: 8, ausente: 2 }), 80);
    assert.equal(attendancePercent({ presente: 0, ausente: 0 }), null);
    assert.equal(attendancePercent({ presente: 0, ausente: 3 }), 0);
  });

  const mark = (playerId, status) => ({ playerId, status });
  const sessions = [
    { sessionId: "s1", categoryId: "a", status: "programada", marks: [mark("p1", "presente"), mark("p2", "presente"), mark("p3", "ausente"), mark("p4", "justificado")] }, // 67
    { sessionId: "s2", categoryId: "a", status: "programada", marks: [mark("p1", "presente"), mark("p2", "ausente"), mark("p3", "ausente")] }, // 33
    { sessionId: "s3", categoryId: "b", status: "programada", marks: [mark("p5", "presente"), mark("p6", "presente")] }, // 100
    { sessionId: "s4", categoryId: "a", status: "cancelada", marks: [mark("p1", "ausente")] }, // no cuenta
    { sessionId: "s5", categoryId: "a", status: "programada", marks: [] }, // sin marcar: no cuenta
    { sessionId: "s6", categoryId: "a", status: "programada", marks: [mark("p4", "justificado")] }, // solo justificadas: no cuenta
  ];

  test("el club promedia los porcentajes de sus sesiones realizadas", () => {
    const s = attendanceSummary(sessions);
    assert.equal(s.sessions, 3);
    assert.equal(s.clubPercent, Math.round((67 + 33 + 100) / 3));
  });

  test("cada categoría promedia solo sus sesiones", () => {
    const s = attendanceSummary(sessions);
    assert.deepEqual(s.byCategory.get("a"), { sessions: 2, percent: 50 });
    assert.deepEqual(s.byCategory.get("b"), { sessions: 1, percent: 100 });
  });

  test("cada jugador cuenta sus propias marcas y la sesión cancelada no le baja nada", () => {
    const s = attendanceSummary(sessions);
    assert.deepEqual(s.players.get("p1"), { presente: 2, ausente: 0, justificado: 0, percent: 100 });
    assert.deepEqual(s.players.get("p2"), { presente: 1, ausente: 1, justificado: 0, percent: 50 });
    assert.deepEqual(s.players.get("p3"), { presente: 0, ausente: 2, justificado: 0, percent: 0 });
    assert.deepEqual(s.players.get("p4"), { presente: 0, ausente: 0, justificado: 2, percent: null });
  });

  test("sin sesiones no hay promedio", () => {
    const s = attendanceSummary([]);
    assert.equal(s.clubPercent, null);
    assert.equal(s.sessions, 0);
  });
});

describe("etiquetas de fecha", () => {
  test("dayLabel", () => {
    assert.equal(dayLabel("2026-10-20"), "Martes 20 de octubre");
    assert.equal(dayLabel("2027-01-01"), "Viernes 1 de enero");
  });

  test("relativeDayLabel dice hoy, mañana y ayer", () => {
    assert.equal(relativeDayLabel("2026-10-20", "2026-10-20"), "Hoy · Martes 20 de octubre");
    assert.equal(relativeDayLabel("2026-10-21", "2026-10-20"), "Mañana · Miércoles 21 de octubre");
    assert.equal(relativeDayLabel("2026-10-19", "2026-10-20"), "Ayer · Lunes 19 de octubre");
    assert.equal(relativeDayLabel("2026-10-25", "2026-10-20"), "Domingo 25 de octubre");
  });
});

test("countLabel usa el singular con 1", () => {
  assert.equal(countLabel(1, "presente", "presentes"), "1 presente");
  assert.equal(countLabel(0, "presente", "presentes"), "0 presentes");
  assert.equal(countLabel(3, "ausente", "ausentes"), "3 ausentes");
});

describe("asistencia de un jugador", () => {
  const mark = (playerId, status) => ({ playerId, status });
  const sessions = [
    { sessionId: "s4", status: "programada", marks: [mark("p1", "presente"), mark("p2", "ausente")] },
    { sessionId: "s3", status: "cancelada", marks: [mark("p1", "ausente")] },
    { sessionId: "s2", status: "programada", marks: [] }, // nadie marcó: no se pasó lista
    { sessionId: "s1", status: "programada", marks: [mark("p2", "presente"), mark("p1", "justificado")] },
    { sessionId: "s0", status: "programada", marks: [mark("p2", "presente")] }, // a p1 no lo marcaron
  ];

  test("cuenta solo las marcas propias y no las de otros", () => {
    const a = playerAttendance(sessions, "p1");
    assert.deepEqual([a.presente, a.ausente, a.justificado, a.percent], [1, 0, 1, 100]);
    const b = playerAttendance(sessions, "p2");
    assert.deepEqual([b.presente, b.ausente, b.justificado, b.percent], [2, 1, 0, 67]);
  });

  test("las recientes son las sesiones realizadas, con null donde no lo marcaron", () => {
    const a = playerAttendance(sessions, "p1");
    assert.deepEqual(a.recent, [
      { sessionId: "s4", status: "presente" },
      { sessionId: "s1", status: "justificado" },
      { sessionId: "s0", status: null },
    ]);
  });

  test("respeta el tope de recientes y un jugador sin marcas queda sin porcentaje", () => {
    assert.equal(playerAttendance(sessions, "p1", 2).recent.length, 2);
    const none = playerAttendance(sessions, "nadie");
    assert.equal(none.percent, null);
    assert.deepEqual([none.presente, none.ausente, none.justificado], [0, 0, 0]);
  });
});

describe("para el dashboard", () => {
  const m = (...statuses) => statuses.map((status) => ({ status }));
  const s = (date, marks, status = "programada") => ({ date, status, marks });

  test("weekStart devuelve el lunes de la semana", () => {
    assert.equal(weekStart("2026-10-19"), "2026-10-19"); // lunes
    assert.equal(weekStart("2026-10-18"), "2026-10-12"); // domingo: pertenece a la semana que empezó el lunes 12
    assert.equal(weekStart("2026-10-22"), "2026-10-19"); // jueves
    assert.equal(weekStart("2026-01-01"), "2025-12-29"); // cruza el año
  });

  test("sessionPercent cuenta presentes sobre presentes más ausentes", () => {
    assert.equal(sessionPercent(m("presente", "presente", "ausente", "justificado")), 67);
    assert.equal(sessionPercent(m("justificado")), null);
    assert.equal(sessionPercent([]), null);
  });

  test("la tendencia semanal promedia las sesiones de cada semana y deja huecos donde no hubo", () => {
    const sessions = [
      s("2026-10-13", m("presente", "ausente")), // semana del 12: 50
      s("2026-10-15", m("presente", "presente")), // semana del 12: 100
      s("2026-10-20", m("presente", "ausente", "ausente")), // semana del 19: 33
      s("2026-10-21", m("ausente"), "cancelada"), // cancelada: no cuenta
      s("2026-10-22", []), // sin marcar: no cuenta
    ];
    const t = weeklyAttendanceTrend(sessions, "2026-10-25", 3);
    assert.deepEqual(t.map((w) => w.weekStart), ["2026-10-05", "2026-10-12", "2026-10-19"]);
    assert.deepEqual(t.map((w) => w.percent), [null, 75, 33]);
    assert.deepEqual(t.map((w) => w.sessions), [0, 2, 1]);
  });

  test("la tendencia siempre trae las semanas pedidas, también sin ninguna sesión", () => {
    const t = weeklyAttendanceTrend([], "2026-10-18", 12);
    assert.equal(t.length, 12);
    assert.ok(t.every((w) => w.percent === null && w.sessions === 0));
    assert.equal(t[11].weekStart, "2026-10-12");
  });

  test("sessionCounts separa realizadas, canceladas, sin marcar y próximas", () => {
    const sessions = [
      s("2026-10-10", m("presente")),
      s("2026-10-11", m("ausente", "presente")),
      s("2026-10-12", [], "cancelada"),
      s("2026-10-13", []), // pasó y nadie pasó lista
      s("2026-10-19", []), // hoy sin marcar todavía
      s("2026-10-21", []), // próxima
      s("2026-10-14", m("justificado")), // hubo marcas: realizada aunque solo justificadas
    ];
    assert.deepEqual(sessionCounts(sessions, "2026-10-19"), { realizadas: 3, canceladas: 1, sinMarcar: 2, proximas: 1 });
  });
});
