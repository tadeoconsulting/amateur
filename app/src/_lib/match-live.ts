// Reglas del partido en vivo: estados, tipos de evento y cronómetro.
//
// Sin dependencias a propósito (lo usan el servidor, las pantallas y las pruebas unitarias).

/** Estados de un partido. "en_curso" es el partido que se está jugando. */
export const MATCH_STATUSES = ["programado", "en_curso", "finalizado"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const isMatchStatus = (value: unknown): value is MatchStatus =>
  (MATCH_STATUSES as readonly unknown[]).includes(value);

/**
 * A qué estado se puede pasar desde cada uno:
 * - programado → en_curso (se da inicio) o finalizado (se carga el resultado directo)
 * - en_curso → finalizado, o programado si todavía no se registró nada (se inició por error)
 * - finalizado → en_curso (se reabre para corregir)
 */
const TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  programado: ["en_curso", "finalizado"],
  en_curso: ["finalizado", "programado"],
  finalizado: ["en_curso"],
};

export function canTransition(from: MatchStatus, to: MatchStatus) {
  return from === to || TRANSITIONS[from].includes(to);
}

/** Tipos de evento que se guardan. Los que no tienen efecto en el marcador solo quedan en la crónica.
 * "penal_definicion" es un intento de la tanda de penales (ver especificación 007): no es un gol
 * de juego, así que no suma al marcador ni a las estadísticas del jugador; suma al conteo de
 * penales (`Match.penaltyHomeScore`/`penaltyAwayScore`) solo si `scored` es `true`. */
export const EVENT_TYPES = ["gol", "tarjeta_amarilla", "tarjeta_roja", "sustitucion", "penal", "penal_definicion"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const isEventType = (value: unknown): value is EventType => (EVENT_TYPES as readonly unknown[]).includes(value);

/** Solo el gol cambia el marcador. */
export const changesScore = (type: EventType) => type === "gol";

/** Estadística de jugador que sube con cada tipo de evento (null si no cuenta ninguna). */
export function statFor(type: EventType): "goals" | "yellowCards" | "redCards" | null {
  if (type === "gol") return "goals";
  if (type === "tarjeta_amarilla") return "yellowCards";
  if (type === "tarjeta_roja") return "redCards";
  return null;
}

/** El evento de la pantalla en vivo → el tipo que se guarda. */
export const EVENT_TYPE_FROM_ACTION: Record<string, EventType> = {
  gol: "gol",
  amarilla: "tarjeta_amarilla",
  roja: "tarjeta_roja",
  cambio: "sustitucion",
  penal: "penal",
};

/** El tipo guardado → el nombre que usan las pantallas (inverso de EVENT_TYPE_FROM_ACTION). */
export const ACTION_FROM_EVENT_TYPE: Record<string, "gol" | "amarilla" | "roja" | "cambio" | "penal"> = {
  gol: "gol",
  tarjeta_amarilla: "amarilla",
  tarjeta_roja: "roja",
  sustitucion: "cambio",
  penal: "penal",
};

export const EVENT_TITLES: Record<EventType, string> = {
  gol: "¡Gooooolllll!",
  tarjeta_amarilla: "Tarjeta amarilla",
  tarjeta_roja: "Tarjeta roja",
  sustitucion: "Cambio",
  penal: "¡Penal!",
  penal_definicion: "Penal (definición)",
};

// ─── Fases de un partido decisivo (especificación 007) ─────────────────────
// Solo importan en un partido `decisive` (no puede terminar empatado). En cualquier otro
// partido la fase queda siempre en "regulacion" y no se usa.

export const MATCH_PHASES = ["regulacion", "tiempo_extra", "penales"] as const;
export type MatchPhase = (typeof MATCH_PHASES)[number];

export const isMatchPhase = (value: unknown): value is MatchPhase =>
  (MATCH_PHASES as readonly unknown[]).includes(value);

/** La fase solo avanza (regulación → tiempo extra → penales), nunca se salta una ni retrocede;
 * bajarla es cosa de reabrir el partido entero, no de un cambio de fase suelto. */
const PHASE_TRANSITIONS: Record<MatchPhase, MatchPhase[]> = {
  regulacion: ["tiempo_extra"],
  tiempo_extra: ["penales"],
  penales: [],
};

export function canTransitionPhase(from: MatchPhase, to: MatchPhase) {
  return from === to || PHASE_TRANSITIONS[from].includes(to);
}

/** Minutos transcurridos desde que empezó el partido (0 si todavía no empezó). */
export function liveMinute(startedAt: string | Date | null | undefined, now: number) {
  if (!startedAt) return 0;
  const started = typeof startedAt === "string" ? Date.parse(startedAt) : startedAt.getTime();
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Math.floor((now - started) / 60_000));
}

/** Segundos transcurridos (para el cronómetro mm:ss). */
export function liveSeconds(startedAt: string | Date | null | undefined, now: number) {
  if (!startedAt) return 0;
  const started = typeof startedAt === "string" ? Date.parse(startedAt) : startedAt.getTime();
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Math.floor((now - started) / 1000));
}

/** Duración prevista de un partido: dos tiempos, o 70 minutos si el torneo no la definió. */
export function matchDurationMinutes(minutesPerHalf: number | null | undefined) {
  return minutesPerHalf && minutesPerHalf > 0 ? minutesPerHalf * 2 : 70;
}

/**
 * Cuánto pasada la duración prevista se da un partido por colgado: tiempo agregado, prórroga y
 * penales caben de sobra en una hora. Más que eso es un partido que nadie finalizó — el
 * cronómetro llegó a marcar 8428 minutos (casi seis días) en uno olvidado en vivo.
 */
export const STALE_AFTER_EXTRA_MINUTES = 60;

/** Minutos a partir de los cuales un partido en vivo se considera colgado. */
export function staleAfterMinutes(minutesPerHalf: number | null | undefined) {
  return matchDurationMinutes(minutesPerHalf) + STALE_AFTER_EXTRA_MINUTES;
}

/** Igual que `liveSeconds`, pero el cronómetro se detiene donde el partido se da por colgado. */
export function clockSeconds(startedAt: string | Date | null | undefined, now: number, minutesPerHalf: number | null | undefined) {
  return Math.min(liveSeconds(startedAt, now), staleAfterMinutes(minutesPerHalf) * 60);
}

/** ¿Lleva tanto en vivo que seguramente terminó y nadie lo finalizó? */
export function isStale(startedAt: string | Date | null | undefined, now: number, minutesPerHalf: number | null | undefined) {
  return liveSeconds(startedAt, now) > staleAfterMinutes(minutesPerHalf) * 60;
}

/** "3 h" / "6 días": cuánto lleva en vivo, para avisar de un partido colgado. */
export function formatLiveFor(startedAt: string | Date | null | undefined, now: number) {
  const hours = Math.floor(liveSeconds(startedAt, now) / 3600);
  return hours < 48 ? `${hours} h` : `${Math.floor(hours / 24)} días`;
}

// ─── Los dos tiempos (especificación 010) ──────────────────────────────────
// Un partido que se inicia empieza en "primer_tiempo"; el organizador lo pasa a "descanso"
// (el cronómetro se detiene) y luego a "segundo_tiempo". `null` es un partido que empezó
// antes de que existieran los tiempos: sigue con su cronómetro único, sin descanso.

export const MATCH_PERIODS = ["primer_tiempo", "descanso", "segundo_tiempo"] as const;
export type MatchPeriod = (typeof MATCH_PERIODS)[number];

export const isMatchPeriod = (value: unknown): value is MatchPeriod =>
  (MATCH_PERIODS as readonly unknown[]).includes(value);

export const PERIOD_LABELS: Record<MatchPeriod, string> = {
  primer_tiempo: "1.er tiempo",
  descanso: "Descanso",
  segundo_tiempo: "2.º tiempo",
};

/** primer_tiempo → descanso → segundo_tiempo; del descanso se puede volver al primero (se tocó sin querer). */
const PERIOD_TRANSITIONS: Record<MatchPeriod, MatchPeriod[]> = {
  primer_tiempo: ["descanso"],
  descanso: ["segundo_tiempo", "primer_tiempo"],
  segundo_tiempo: [],
};

export function canTransitionPeriod(from: MatchPeriod | null, to: MatchPeriod) {
  if (from === null) return false;
  return from === to || PERIOD_TRANSITIONS[from].includes(to);
}

/** Un descanso que dura más que esto se da por olvidado. */
export const STALE_BREAK_MINUTES = 120;

/** Minutos de cada tiempo: los del torneo, o la mitad de la duración por defecto. */
export function halfMinutes(minutesPerHalf: number | null | undefined) {
  return matchDurationMinutes(minutesPerHalf) / 2;
}

type Instant = string | Date | null | undefined;

const toMs = (value: Instant) => {
  if (!value) return null;
  const ms = typeof value === "string" ? Date.parse(value) : value.getTime();
  return Number.isNaN(ms) ? null : ms;
};

/** Lo que el cronómetro necesita saber de un partido. */
export interface ClockSource {
  startedAt?: Instant;
  period?: string | null;
  firstHalfEndedAt?: Instant;
  secondHalfStartedAt?: Instant;
}

/**
 * El cronómetro de un partido en vivo, ya con los tiempos:
 * - 1.er tiempo (o sin tiempos): corre desde el inicio, sin tope (el tiempo agregado pasa del minuto del torneo).
 * - descanso: queda congelado en lo que duró el primer tiempo.
 * - 2.º tiempo: sigue desde los minutos de un tiempo (35 + lo que lleve del segundo).
 * `stale` avisa de un partido olvidado: el cronómetro se detiene y se pide finalizarlo.
 */
export function matchClock(match: ClockSource, now: number, minutesPerHalf: number | null | undefined) {
  const period = isMatchPeriod(match.period) ? match.period : null;
  const started = toMs(match.startedAt);
  const firstEnded = toMs(match.firstHalfEndedAt);
  const secondStarted = toMs(match.secondHalfStartedAt);
  const staleSeconds = staleAfterMinutes(minutesPerHalf) * 60;

  let raw: number;
  let stale: boolean;
  if (period === "descanso" && started !== null && firstEnded !== null) {
    raw = Math.max(0, Math.floor((firstEnded - started) / 1000));
    stale = now - firstEnded > STALE_BREAK_MINUTES * 60_000;
  } else if (period === "segundo_tiempo" && secondStarted !== null) {
    raw = halfMinutes(minutesPerHalf) * 60 + Math.max(0, Math.floor((now - secondStarted) / 1000));
    stale = raw > staleSeconds;
  } else {
    raw = liveSeconds(match.startedAt, now);
    stale = raw > staleSeconds;
  }
  const seconds = period === "descanso" ? raw : Math.min(raw, staleSeconds);
  return { seconds, minute: Math.floor(seconds / 60), stale, period };
}

/** En qué tiempo se registra una jugada nueva (1, 2, o null si el partido no tiene tiempos). */
export function halfForEvent(period: string | null | undefined): 1 | 2 | null {
  if (period === "segundo_tiempo") return 2;
  if (period === "primer_tiempo" || period === "descanso") return 1;
  return null;
}


/** Cómo se separa la cronología en dos tiempos: por el tiempo guardado en cada jugada (`half`) o, en un partido sin tiempos, por el minuto. */
export function splitHalves<T extends { minute: number; half?: number | null }>(events: T[], minutesPerHalf: number | null | undefined) {
  if (events.some((e) => e.half != null)) {
    return { firstHalf: events.filter((e) => e.half !== 2), secondHalf: events.filter((e) => e.half === 2) };
  }
  const limit = minutesPerHalf && minutesPerHalf > 0 ? minutesPerHalf : 45;
  const cut = events.findIndex((e) => e.minute > limit);
  return cut === -1 ? { firstHalf: events, secondHalf: [] } : { firstHalf: events.slice(0, cut), secondHalf: events.slice(cut) };
}

