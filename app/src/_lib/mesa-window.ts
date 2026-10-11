// La ventana de acceso de la mesa (especificación 011). Pura y sin dependencias: la usan el servidor, la pantalla
// de la mesa y las pruebas.
//
// La mesa solo puede gestionar partidos los días de juego: desde 1 hora antes del primer partido del día hasta
// 1 hora después de que termine el último. La hora de un partido se guarda como texto "HH:MM" sin zona (la hora de
// reloj de la cancha); por ahora todas las canchas son de Perú (UTC-5, sin horario de verano).

export const LIMA_OFFSET_HOURS = 5; // Lima = UTC-5: la hora local + 5 h = UTC
const HOUR = 3_600_000;
const BEFORE_FIRST_MS = 1 * HOUR;
const AFTER_LAST_MS = 1 * HOUR;
/** Si nadie finaliza un partido, la ventana se cierra a las 4 h de la hora programada del último. */
const UNFINISHED_GRACE_MS = 4 * HOUR;
/** Con un partido en curso la ventana sigue abierta, pero no más de 12 h después de la hora del último partido. */
const LIVE_CAP_MS = 12 * HOUR;

/** Un partido, como lo necesita la ventana. `date` es el día calendario "YYYY-MM-DD"; `time`, "HH:MM" (o "" si no tiene hora). */
export interface WindowMatch {
  date: string;
  time: string;
  status: string;
  /** Cuándo terminó (ms); null si no se sabe. */
  finishedAt: number | null;
}

export interface MesaWindow {
  /** Día calendario "YYYY-MM-DD" (hora de Perú). */
  day: string;
  opensAt: number;
  closesAt: number;
}

/** El instante (ms UTC) en que empieza un partido, o null si no tiene día u hora válidos. */
export function matchStartMs(date: string, time: string): number | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!d || !t) return null;
  return Date.UTC(+d[1], +d[2] - 1, +d[3], +t[1] + LIMA_OFFSET_HOURS, +t[2]);
}

/** El día calendario de Perú ("YYYY-MM-DD") de un instante. */
export function limaDay(ms: number): string {
  return new Date(ms - LIMA_OFFSET_HOURS * HOUR).toISOString().slice(0, 10);
}

/**
 * Las ventanas de un torneo: una por día calendario con partidos que tengan hora. Abre 1 h antes del primero.
 * Cierra: con todos los partidos del día finalizados, 1 h después de que terminó el último; con alguno en curso,
 * hasta 12 h después del último partido programado; si no, 4 h después del último partido programado.
 */
export function mesaWindows(matches: readonly WindowMatch[]): MesaWindow[] {
  const byDay = new Map<string, { start: number; match: WindowMatch }[]>();
  for (const m of matches) {
    const start = matchStartMs(m.date, m.time);
    if (start === null) continue;
    const list = byDay.get(m.date) ?? [];
    list.push({ start, match: m });
    byDay.set(m.date, list);
  }

  const windows: MesaWindow[] = [];
  for (const [day, list] of byDay) {
    const first = Math.min(...list.map((x) => x.start));
    const lastStart = Math.max(...list.map((x) => x.start));
    const allFinished = list.every((x) => x.match.status === "finalizado");
    const anyLive = list.some((x) => x.match.status === "en_curso");

    let closesAt: number;
    if (allFinished) {
      // Sin hora de término conocida se toma la de inicio: así el cierre nunca queda antes del partido.
      const lastFinish = Math.max(...list.map((x) => x.match.finishedAt ?? x.start));
      closesAt = lastFinish + AFTER_LAST_MS;
    } else if (anyLive) {
      closesAt = lastStart + LIVE_CAP_MS;
    } else {
      closesAt = lastStart + UNFINISHED_GRACE_MS;
    }
    windows.push({ day, opensAt: first - BEFORE_FIRST_MS, closesAt });
  }
  return windows.sort((a, b) => a.opensAt - b.opensAt);
}

/** ¿Hay alguna ventana abierta en este instante? */
export function windowOpenAt(windows: readonly MesaWindow[], now: number): MesaWindow | null {
  return windows.find((w) => now >= w.opensAt && now < w.closesAt) ?? null;
}

/** La próxima ventana que todavía no abrió (la de hoy, si faltan horas, o la de un día futuro). */
export function nextWindow(windows: readonly MesaWindow[], now: number): MesaWindow | null {
  return windows.find((w) => w.opensAt > now) ?? null;
}

/**
 * ¿Se puede gestionar este partido ahora? Solo si tiene hora y su día tiene la ventana abierta: un partido de otro
 * día (o sin programar) no se juega hoy aunque sea del mismo torneo.
 */
export function matchOpenAt(windows: readonly MesaWindow[], match: { date: string; time: string }, now: number): boolean {
  if (matchStartMs(match.date, match.time) === null) return false;
  return windowOpenAt(windows.filter((w) => w.day === match.date), now) !== null;
}
