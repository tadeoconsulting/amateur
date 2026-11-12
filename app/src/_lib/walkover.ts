// W.O. (walkover) y resultado directo de un partido (especificación 019). Lógica pura y sin dependencias: la usan la API,
// las pantallas y las pruebas.

/**
 * Quién se presentó: "home" (el local, que gana), "away" (el visitante, que gana) o "both" (ninguno de los dos: W.O.
 * doble, pierden los dos).
 */
export const WALKOVERS = ["home", "away", "both"] as const;
export type Walkover = (typeof WALKOVERS)[number];

export const isWalkover = (value: unknown): value is Walkover => (WALKOVERS as readonly unknown[]).includes(value);

/** Los goles con que gana quien se presentó. */
export const WALKOVER_GOALS = 3;

/** El marcador que deja un W.O.: 3-0 para quien se presentó, 0-0 si no se presentó ninguno. */
export function walkoverScore(walkover: Walkover): { home: number; away: number } {
  if (walkover === "home") return { home: WALKOVER_GOALS, away: 0 };
  if (walkover === "away") return { home: 0, away: WALKOVER_GOALS };
  return { home: 0, away: 0 };
}

/** De qué lado está quien se presentó (y gana); null en un W.O. doble. */
export function walkoverWinnerSide(walkover: Walkover): "home" | "away" | null {
  return walkover === "both" ? null : walkover;
}

/** La frase que explica el W.O. («W.O.: no se presentó X»), con los nombres de los equipos. */
export function walkoverNote(walkover: Walkover, homeName: string, awayName: string): string {
  if (walkover === "both") return "W.O. doble: no se presentó ninguno de los dos equipos";
  return `W.O.: no se presentó ${walkover === "home" ? awayName : homeName}`;
}

/**
 * Lo que sobra o falta en un resultado cargado directo (sin jugarlo en vivo). Devuelve el mensaje, o null si está bien.
 *
 * Un partido de eliminación (`decisive`) no puede terminar empatado: si el marcador es empate hace falta quién avanza
 * (`winner`) y, opcionalmente, los penales (los dos juntos; el que avanza tiene que ganar la tanda). Fuera de ese caso
 * (un partido que admite empate, o un marcador con ganador) no se aceptan ni ganador ni penales.
 */
export function directResultProblem(input: {
  decisive: boolean;
  homeScore: number;
  awayScore: number;
  /** Quién avanza, si se mandó. */
  winner?: "home" | "away" | null;
  penaltyHome?: number | null;
  penaltyAway?: number | null;
}): string | null {
  const { decisive, homeScore, awayScore, winner, penaltyHome, penaltyAway } = input;
  const tiedDecisive = decisive && homeScore === awayScore;
  const hasPenalties = penaltyHome != null || penaltyAway != null;

  if (!tiedDecisive) {
    return winner || hasPenalties ? "Solo un empate en un cuadro de eliminación necesita quién avanza o los penales" : null;
  }
  if (!winner) return "Este partido no puede terminar empatado: elige quién avanza";
  if (hasPenalties) {
    if (penaltyHome == null || penaltyAway == null) return "Escribe los penales de los dos equipos, o ninguno";
    if (penaltyHome === penaltyAway) return "Los penales no pueden quedar empatados";
    if ((penaltyHome > penaltyAway ? "home" : "away") !== winner) return "Quien avanza tiene que ganar la tanda de penales";
  }
  return null;
}
