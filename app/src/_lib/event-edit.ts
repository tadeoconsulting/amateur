// Editar una jugada ya registrada (especificación 018): corregir el minuto y cambiar o asignar el jugador de un gol o de
// una tarjeta, sin perder el minuto en que ocurrió. Lógica pura y sin dependencias de la base: la usan la API, la pantalla
// en vivo y las pruebas.
export type PlayerStat = "goals" | "yellowCards" | "redCards";

/**
 * La estadística de jugador que suma una jugada, o null si no suma ninguna. Es la misma regla que `statFor` de
 * `match-live.ts` (aquí se repite porque esta librería no importa a otras en tiempo de ejecución); la prueba
 * `event-edit.test.mjs` comprueba que las dos coinciden.
 */
export function statOf(type: string, scored?: boolean | null): PlayerStat | null {
  if (type === "gol" || (type === "penal" && scored === true)) return "goals";
  if (type === "tarjeta_amarilla") return "yellowCards";
  if (type === "tarjeta_roja") return "redCards";
  return null;
}

/**
 * ¿Se le puede cambiar el jugador a esta jugada? Solo a las que cuentan en las estadísticas de un jugador: un gol, una
 * tarjeta o un penal convertido (que es gol del que lo patea). Un cambio tiene dos jugadores y un penal errado o la
 * tanda no suman nada: quedan fuera.
 */
export function playerEditable(type: string, scored?: boolean | null): boolean {
  return statOf(type, scored) !== null;
}

export type EventEdit = { minute?: number; playerId?: string | null };

/**
 * Lo que se puede cambiar de una jugada: el `minute` (entero de 0 a 200, igual que al registrarla) y el `playerId` (un id,
 * o `null` para dejarla sin jugador). Hace falta al menos uno de los dos.
 */
export function parseEventEdit(body: unknown): { ok: true; edit: EventEdit } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Se esperaba un objeto con minute y/o playerId." };
  const { minute, playerId } = body as Record<string, unknown>;
  const edit: EventEdit = {};

  if (minute !== undefined) {
    if (!Number.isInteger(minute) || (minute as number) < 0 || (minute as number) > 200) {
      return { ok: false, error: "minute debe ser un entero entre 0 y 200" };
    }
    edit.minute = minute as number;
  }
  if (playerId !== undefined) {
    if (playerId !== null && (typeof playerId !== "string" || playerId.trim() === "")) {
      return { ok: false, error: "playerId debe ser un id de jugador, o null para dejarla sin jugador" };
    }
    edit.playerId = playerId === null ? null : (playerId as string);
  }
  if (edit.minute === undefined && edit.playerId === undefined) return { ok: false, error: "Indica minute y/o playerId" };
  return { ok: true, edit };
}

/**
 * Cómo se mueven las estadísticas al cambiar el jugador de una jugada: a quién se le quita uno y a quién se le suma.
 * `null` si no cambia nada (la jugada no cuenta en las estadísticas, o es el mismo jugador).
 */
export function statMove(
  type: string,
  scored: boolean | null | undefined,
  from: string | null,
  to: string | null
): { stat: PlayerStat; decrement: string | null; increment: string | null } | null {
  if (from === to) return null;
  const stat = statOf(type, scored);
  if (!stat) return null;
  return { stat, decrement: from, increment: to };
}

/** Las jugadas se pueden corregir en juego y también ya finalizado (la mesa, dentro de su horario; sin reabrir el partido). */
export const canEditEventIn = (status: string) => status === "en_curso" || status === "finalizado";

/**
 * Borrar una jugada cambia el marcador. En juego, siempre; ya finalizado, solo si el partido no es decisivo: en un cuadro de
 * eliminación el marcador define quién avanza, y eso se corrige reabriendo el partido.
 */
export const canDeleteEventIn = (status: string, decisive: boolean) => status === "en_curso" || (status === "finalizado" && !decisive);
