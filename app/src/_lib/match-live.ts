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

/** Tipos de evento que se guardan. Los que no tienen efecto en el marcador solo quedan en la crónica. */
export const EVENT_TYPES = ["gol", "tarjeta_amarilla", "tarjeta_roja", "sustitucion", "penal"] as const;
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
};

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
