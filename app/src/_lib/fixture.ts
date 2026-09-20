// Lógica pura del fixture: quién juega contra quién y cuándo.
//
// Sin dependencias (ni Prisma, ni React, ni alias "@/") a propósito: la usan tanto el
// servidor como la pantalla del fixture, y se prueba directo con `npm run test:unit`.
// Solo sintaxis de TypeScript que se pueda borrar (nada de enums).

export type FixtureTeam = { id: string; groupName: string | null };

export type PlannedMatch = {
  matchday: number; // 1, 2, 3...
  homeTeamId: string;
  awayTeamId: string;
  groupName: string | null;
};

export type PlanResult =
  | { ok: true; matchdays: number; matches: PlannedMatch[] }
  | { ok: false; error: string };

/** Formatos para los que hay generación de fixture. Los demás se programan aparte. */
export const FIXTURE_FORMATS = ["liga", "grupos"];

export function supportsFixture(format: string) {
  return FIXTURE_FORMATS.includes(format);
}

/**
 * Todos contra todos por el método del círculo. Cada equipo juega una vez contra cada
 * otro. Con cantidad impar, en cada fecha un equipo descansa. Devuelve fechas de 1 a N.
 */
export function roundRobin(teamIds: string[]) {
  const ids: (string | null)[] = [...teamIds];
  if (ids.length % 2 === 1) ids.push(null); // el descanso
  const n = ids.length;
  const matches: { matchday: number; homeTeamId: string; awayTeamId: string }[] = [];

  for (let round = 0; round < n - 1; round++) {
    for (let i = 0; i < n / 2; i++) {
      const a = ids[i];
      const b = ids[n - 1 - i];
      if (a === null || b === null) continue;
      // Local y visitante se reparten para que nadie juegue siempre en casa: el equipo fijo
      // alterna por fecha y el resto según la posición del cruce. Con cantidad par de
      // equipos queda a lo sumo 1 partido de diferencia y nunca más de 2 seguidos igual.
      const aHome = i === 0 ? round % 2 === 0 : i % 2 === 0;
      matches.push({ matchday: round + 1, homeTeamId: aHome ? a : b, awayTeamId: aHome ? b : a });
    }
    // El primer equipo queda fijo y el resto rota una posición.
    ids.splice(1, 0, ids.pop() as string | null);
  }
  return matches;
}

/** Cantidad de fechas de un todos contra todos con `teams` equipos. */
export function roundRobinMatchdays(teams: number) {
  if (teams < 2) return 0;
  return teams % 2 === 0 ? teams - 1 : teams;
}

/**
 * Arma los cruces del torneo según su formato:
 * - liga: todos contra todos entre todos los equipos.
 * - grupos: todos contra todos dentro de cada grupo (cada equipo tiene que tener grupo).
 */
export function planFixture(teams: FixtureTeam[], format: string): PlanResult {
  if (!supportsFixture(format)) {
    return { ok: false, error: "Este formato todavía no tiene generación de fixture" };
  }
  if (teams.length < 2) {
    return { ok: false, error: "Se necesitan al menos 2 equipos para armar el fixture" };
  }

  if (format === "liga") {
    const matches = roundRobin(teams.map((t) => t.id)).map((m) => ({ ...m, groupName: null }));
    return { ok: true, matchdays: roundRobinMatchdays(teams.length), matches };
  }

  // grupos
  if (teams.some((t) => !t.groupName)) {
    return { ok: false, error: "Todos los equipos deben tener un grupo asignado" };
  }
  const groups = new Map<string, string[]>();
  for (const t of teams) {
    const list = groups.get(t.groupName as string) ?? [];
    list.push(t.id);
    groups.set(t.groupName as string, list);
  }
  const matches: PlannedMatch[] = [];
  let matchdays = 0;
  for (const [groupName, ids] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (ids.length < 2) return { ok: false, error: `El grupo "${groupName}" necesita al menos 2 equipos` };
    for (const m of roundRobin(ids)) matches.push({ ...m, groupName });
    matchdays = Math.max(matchdays, roundRobinMatchdays(ids.length));
  }
  return { ok: true, matchdays, matches };
}

// ─── Calendario ─────────────────────────────────────────────────

/** Cómo se programa una fecha. `days` usa 0 = domingo ... 6 = sábado. */
export type MatchdayConfig = {
  days: number[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM, 24 h
  endTime: string; // HH:MM, 24 h
  /** "torneo": todos en la sede del torneo, de a uno por horario. "local": cada uno en la cancha del local. */
  venue: "torneo" | "local";
};

export type ScheduledMatch = PlannedMatch & { date: string; time: string; location: string };

export type ScheduleResult =
  | { ok: true; matches: ScheduledMatch[] }
  | { ok: false; error: string; matchday?: number };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_RANGE_DAYS = 366;

export const timeToMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
export const minutesToTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

const dateMs = (date: string) => Date.parse(`${date}T00:00:00Z`);
/** Fecha YYYY-MM-DD que existe en el calendario (rechaza el 31 de febrero, que Date normaliza en silencio). */
export const isRealDate = (date: string) => DATE_RE.test(date) && !Number.isNaN(dateMs(date)) && new Date(dateMs(date)).toISOString().startsWith(date);

/** Devuelve un mensaje si la configuración de una fecha no es válida. */
export function validateMatchdayConfig(config: MatchdayConfig): string | null {
  if (!Array.isArray(config.days) || config.days.length === 0) return "Elige al menos un día de juego";
  if (!config.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) return "Los días de juego no son válidos";
  if (!isRealDate(config.startDate) || !isRealDate(config.endDate)) return "Las fechas no son válidas";
  if (dateMs(config.endDate) < dateMs(config.startDate)) return "La fecha de fin es anterior a la de inicio";
  if ((dateMs(config.endDate) - dateMs(config.startDate)) / 86_400_000 > MAX_RANGE_DAYS) {
    return "El rango de fechas no puede superar un año";
  }
  if (!TIME_RE.test(config.startTime) || !TIME_RE.test(config.endTime)) return "Los horarios no son válidos";
  if (timeToMinutes(config.endTime) <= timeToMinutes(config.startTime)) return "La hora de fin es anterior a la de inicio";
  if (config.venue !== "torneo" && config.venue !== "local") return "La sede no es válida";
  return null;
}

/** Horarios disponibles de una fecha: cada día de juego del rango, cada `slotMinutes` minutos. */
export function buildSlots(config: MatchdayConfig, slotMinutes: number) {
  const slots: { date: string; time: string }[] = [];
  const startMin = timeToMinutes(config.startTime);
  const endMin = timeToMinutes(config.endTime);
  for (let ms = dateMs(config.startDate); ms <= dateMs(config.endDate); ms += 86_400_000) {
    if (!config.days.includes(new Date(ms).getUTCDay())) continue;
    const date = new Date(ms).toISOString().slice(0, 10);
    for (let t = startMin; t + slotMinutes <= endMin; t += slotMinutes) {
      slots.push({ date, time: minutesToTime(t) });
    }
  }
  return slots;
}

/**
 * Le pone día, hora y sede a cada partido. Las fechas se calendarizan en orden y el
 * calendario es global: nunca se repite un horario en la misma sede ni se pone a un
 * equipo a jugar dos veces a la misma hora, aunque los rangos de dos fechas se pisen.
 */
export function scheduleFixture(
  plan: PlannedMatch[],
  configs: MatchdayConfig[],
  options: { slotMinutes: number; tournamentLocation: string; teamName: (teamId: string) => string }
): ScheduleResult {
  const matchdays = Math.max(0, ...plan.map((m) => m.matchday));
  if (configs.length !== matchdays) {
    return { ok: false, error: `Hay que configurar las ${matchdays} fechas del fixture (llegaron ${configs.length})` };
  }

  const usedVenue = new Set<string>();
  const usedTeam = new Set<string>();
  const scheduled: ScheduledMatch[] = [];

  for (let md = 1; md <= matchdays; md++) {
    const config = configs[md - 1];
    const problem = validateMatchdayConfig(config);
    if (problem) return { ok: false, error: `Fecha ${md}: ${problem}`, matchday: md };

    const slots = buildSlots(config, options.slotMinutes);
    const matches = plan.filter((m) => m.matchday === md);
    let placed = 0;

    for (const match of matches) {
      const location = config.venue === "torneo" ? options.tournamentLocation : `Cancha de ${options.teamName(match.homeTeamId)}`;
      const venueKey = config.venue === "torneo" ? "torneo" : `local:${match.homeTeamId}`;
      const slot = slots.find(
        (s) =>
          !usedVenue.has(`${s.date}|${s.time}|${venueKey}`) &&
          !usedTeam.has(`${match.homeTeamId}|${s.date}|${s.time}`) &&
          !usedTeam.has(`${match.awayTeamId}|${s.date}|${s.time}`)
      );
      if (!slot) {
        return {
          ok: false,
          matchday: md,
          error: `La fecha ${md} no tiene horarios suficientes: hacen falta ${matches.length} y solo se pudieron ubicar ${placed}. Amplía el rango de fechas u horas, o agrega más días de juego.`,
        };
      }
      usedVenue.add(`${slot.date}|${slot.time}|${venueKey}`);
      usedTeam.add(`${match.homeTeamId}|${slot.date}|${slot.time}`);
      usedTeam.add(`${match.awayTeamId}|${slot.date}|${slot.time}`);
      scheduled.push({ ...match, date: slot.date, time: slot.time, location });
      placed++;
    }
  }
  return { ok: true, matches: scheduled };
}

/** Duración de un horario: dos tiempos más 10 minutos de descanso. Sin dato, una hora. */
export function slotMinutesFor(minutesPerHalf: number | null | undefined) {
  return minutesPerHalf && minutesPerHalf > 0 ? minutesPerHalf * 2 + 10 : 60;
}

/** El partido todavía no tiene día y hora definidos (fixture manual sin configurar). */
export function isUnscheduled(match: { time: string }) {
  return match.time === "";
}
