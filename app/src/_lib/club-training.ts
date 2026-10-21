// Entrenamientos de un club (especificación 015, entrega 2): horarios semanales, sesiones y asistencia. Lógica pura y sin
// dependencias: la usan las rutas de la API, las pantallas y las pruebas.
//
// Todo se piensa en hora de Perú (UTC-5, sin horario de verano): el delegado escribe "martes 19:00" y esa es la hora de
// Lima. En la base se guarda el instante real (UTC).

const PERU_OFFSET_HOURS = -5;

/** Cuántos días hacia adelante se generan sesiones desde un horario. */
export const GENERATION_DAYS = 28;

export const MIN_DURATION_MIN = 15;
export const MAX_DURATION_MIN = 300;

export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;

export type SessionStatus = "programada" | "cancelada";
export type AttendanceStatus = "presente" | "ausente" | "justificado";
export const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = ["presente", "ausente", "justificado"];

const pad = (n: number) => String(n).padStart(2, "0");

export const isWeekday = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 6;
export const isTime = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export const isDuration = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= MIN_DURATION_MIN && (v as number) <= MAX_DURATION_MIN;
export const isAttendanceStatus = (v: unknown): v is AttendanceStatus => typeof v === "string" && (ATTENDANCE_STATUSES as readonly string[]).includes(v);

/** ¿Es una fecha AAAA-MM-DD que existe? (`new Date("2026-02-31")` no falla: pasa al 3 de marzo.) */
export function isDate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v && d.getUTCFullYear() >= 2000 && d.getUTCFullYear() <= 2100;
}

/** La fecha y hora de Perú de un instante: AAAA-MM-DD, HH:MM y día de la semana. */
export function toPeru(instant: Date): { date: string; time: string; weekday: number } {
  const shifted = new Date(instant.getTime() + PERU_OFFSET_HOURS * 3600_000);
  return { date: shifted.toISOString().slice(0, 10), time: shifted.toISOString().slice(11, 16), weekday: shifted.getUTCDay() };
}

/** El instante real de una fecha y hora de Perú. */
export function fromPeru(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh - PERU_OFFSET_HOURS, mm));
}

/** La fecha de hoy en Perú. */
export const peruToday = (now: Date) => toPeru(now).date;

/** Suma días a una fecha AAAA-MM-DD. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Las fechas, desde `from` y durante `days` días, en que cae un día de la semana. */
export function datesOnWeekday(weekday: number, from: string, days: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    if (new Date(`${date}T00:00:00Z`).getUTCDay() === weekday) dates.push(date);
  }
  return dates;
}

/** Los instantes en que ocurre un horario semanal desde `from` y durante `days` días. */
export function scheduleStarts(schedule: { weekday: number; startTime: string }, from: string, days = GENERATION_DAYS): Date[] {
  return datesOnWeekday(schedule.weekday, from, days).map((d) => fromPeru(d, schedule.startTime));
}

/** "19:00–20:30" a partir de la hora de inicio y la duración. */
export function timeRange(startTime: string, durationMin: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const end = h * 60 + m + durationMin;
  return `${startTime}–${pad(Math.floor(end / 60) % 24)}:${pad(end % 60)}`;
}

/**
 * ¿Se puede pasar lista? Una sesión cancelada no, y una de un día que todavía no llega tampoco. Una de hoy sí, aunque
 * su hora no haya llegado: el delegado la abre un rato antes y no debería toparse con un bloqueo.
 */
export function canMarkSession(session: { status: string; startsAt: Date }, now: Date): boolean {
  return session.status !== "cancelada" && toPeru(session.startsAt).date <= peruToday(now);
}

/** El siguiente estado al tocar a un jugador: sin marcar → presente → ausente → justificado → sin marcar. */
export function nextAttendance(current: AttendanceStatus | null): AttendanceStatus | null {
  if (current === null) return "presente";
  if (current === "presente") return "ausente";
  if (current === "ausente") return "justificado";
  return null;
}

type Counts = { presente: number; ausente: number; justificado: number };

/** Porcentaje de asistencia: presentes sobre presentes más ausentes. Las justificadas y las sin marcar no cuentan. null si no hay base. */
export function attendancePercent(c: Pick<Counts, "presente" | "ausente">): number | null {
  const base = c.presente + c.ausente;
  return base === 0 ? null : Math.round((c.presente / base) * 100);
}

export type SessionMarks = { sessionId: string; categoryId: string | null; status: string; marks: { playerId: string; status: AttendanceStatus }[] };

const countMarks = (marks: readonly { status: AttendanceStatus }[]): Counts => ({
  presente: marks.filter((m) => m.status === "presente").length,
  ausente: marks.filter((m) => m.status === "ausente").length,
  justificado: marks.filter((m) => m.status === "justificado").length,
});

/**
 * Los promedios de asistencia. Solo cuentan las sesiones **realizadas** (no canceladas y con al menos un presente o un
 * ausente): una sesión sin marcar o cancelada no baja nada. El promedio del club y el de cada categoría es el promedio de
 * los porcentajes de sus sesiones; el de cada jugador, sus presentes sobre presentes más ausentes.
 */
export function attendanceSummary(sessions: readonly SessionMarks[]) {
  const players = new Map<string, Counts>();
  const sessionPercents: { categoryId: string | null; percent: number }[] = [];

  for (const s of sessions) {
    if (s.status === "cancelada") continue;
    const percent = attendancePercent(countMarks(s.marks));
    if (percent === null) continue;
    sessionPercents.push({ categoryId: s.categoryId, percent });
  }
  for (const s of sessions) {
    if (s.status === "cancelada") continue;
    for (const m of s.marks) {
      const c = players.get(m.playerId) ?? { presente: 0, ausente: 0, justificado: 0 };
      c[m.status] += 1;
      players.set(m.playerId, c);
    }
  }

  const mean = (values: number[]) => (values.length === 0 ? null : Math.round(values.reduce((a, b) => a + b, 0) / values.length));
  const byCategory = new Map<string | null, { sessions: number; percent: number | null }>();
  for (const key of new Set(sessionPercents.map((s) => s.categoryId))) {
    const own = sessionPercents.filter((s) => s.categoryId === key).map((s) => s.percent);
    byCategory.set(key, { sessions: own.length, percent: mean(own) });
  }

  return {
    sessions: sessionPercents.length,
    clubPercent: mean(sessionPercents.map((s) => s.percent)),
    byCategory,
    players: new Map([...players].map(([id, c]) => [id, { ...c, percent: attendancePercent(c) }])),
  };
}

/** Valida los datos de un horario. Devuelve el mensaje de error o null. */
export function scheduleError(input: { weekday?: unknown; startTime?: unknown; durationMin?: unknown }): string | null {
  if (!isWeekday(input.weekday)) return "Elige el día de la semana";
  if (!isTime(input.startTime)) return "La hora de inicio debe tener la forma HH:MM, por ejemplo 19:00";
  if (!isDuration(input.durationMin)) return `La duración va de ${MIN_DURATION_MIN} a ${MAX_DURATION_MIN} minutos`;
  return null;
}

export const PLACE_NAME_MAX = 80;
export const PLACE_ADDRESS_MAX = 160;

/** Valida el nombre y la dirección de un lugar. Devuelve el mensaje de error o null. */
export function placeError(input: { name?: unknown; address?: unknown }): string | null {
  if (typeof input.name !== "string" || input.name.trim() === "") return "Escribe el nombre del lugar";
  if (input.name.trim().length > PLACE_NAME_MAX) return `El nombre puede tener hasta ${PLACE_NAME_MAX} letras`;
  if (input.address != null && (typeof input.address !== "string" || input.address.trim().length > PLACE_ADDRESS_MAX)) return `La dirección puede tener hasta ${PLACE_ADDRESS_MAX} letras`;
  return null;
}

const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "2026-10-20" → "Martes 20 de octubre". */
export function dayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} de ${MONTH_NAMES[d.getUTCMonth()]}`;
}

/** Hoy, mañana o la fecha completa, para encabezar un grupo de sesiones. */
export function relativeDayLabel(date: string, today: string): string {
  if (date === today) return `Hoy · ${dayLabel(date)}`;
  if (date === addDays(today, 1)) return `Mañana · ${dayLabel(date)}`;
  if (date === addDays(today, -1)) return `Ayer · ${dayLabel(date)}`;
  return dayLabel(date);
}

/** "1 presente", "2 presentes". */
export const countLabel = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * La asistencia de UN jugador, para que él la vea: sus presentes, ausentes y justificadas, su porcentaje y sus últimas
 * sesiones realizadas con su marca (null = la sesión se pasó lista pero a él no lo marcaron). Recibe las sesiones más
 * recientes primero. Una cancelada o una a la que nadie marcó no cuenta. Nunca mira las marcas de otros jugadores.
 */
export function playerAttendance(sessions: readonly { sessionId: string; status: string; marks: { playerId: string; status: AttendanceStatus }[] }[], playerId: string, recentCount = 8) {
  const counts: Counts = { presente: 0, ausente: 0, justificado: 0 };
  const recent: { sessionId: string; status: AttendanceStatus | null }[] = [];
  for (const s of sessions) {
    if (s.status === "cancelada" || s.marks.length === 0) continue;
    const own = s.marks.find((m) => m.playerId === playerId)?.status ?? null;
    if (own) counts[own] += 1;
    if (recent.length < recentCount) recent.push({ sessionId: s.sessionId, status: own });
  }
  return { ...counts, percent: attendancePercent(counts), recent };
}

/** El porcentaje de asistencia de UNA sesión (presentes sobre presentes más ausentes); null si nadie quedó presente ni ausente. */
export const sessionPercent = (marks: readonly { status: AttendanceStatus }[]) => attendancePercent(countMarks(marks));

/** El lunes de la semana de una fecha AAAA-MM-DD (las semanas del dashboard van de lunes a domingo). */
export function weekStart(date: string): string {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}

type DatedSession = { date: string; status: string; marks: readonly { status: AttendanceStatus }[] };

/**
 * La asistencia semana a semana: las `weeks` semanas (lunes a domingo) que terminan en la de `endDate`, cada una con el
 * promedio de los porcentajes de sus sesiones realizadas. Una semana sin sesiones realizadas queda con `percent` null (un
 * hueco en el gráfico, no un 0).
 */
export function weeklyAttendanceTrend(sessions: readonly DatedSession[], endDate: string, weeks = 12) {
  const last = weekStart(endDate);
  const result: { weekStart: string; percent: number | null; sessions: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(last, -7 * i);
    const end = addDays(start, 7);
    const percents = sessions
      .filter((s) => s.status !== "cancelada" && s.date >= start && s.date < end)
      .map((s) => sessionPercent(s.marks))
      .filter((p): p is number => p !== null);
    result.push({ weekStart: start, percent: percents.length === 0 ? null : Math.round(percents.reduce((a, b) => a + b, 0) / percents.length), sessions: percents.length });
  }
  return result;
}

/**
 * Cuántos entrenamientos hubo: realizados (con alguna marca), cancelados, sin marcar (ya pasó o es hoy y nadie pasó lista) y
 * próximos (de mañana en adelante).
 */
export function sessionCounts(sessions: readonly DatedSession[], today: string) {
  let realizadas = 0;
  let canceladas = 0;
  let sinMarcar = 0;
  let proximas = 0;
  for (const s of sessions) {
    if (s.status === "cancelada") canceladas += 1;
    else if (s.marks.length > 0) realizadas += 1;
    else if (s.date <= today) sinMarcar += 1;
    else proximas += 1;
  }
  return { realizadas, canceladas, sinMarcar, proximas };
}
