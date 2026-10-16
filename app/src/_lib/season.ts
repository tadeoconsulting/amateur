// Temporadas al estilo Liga 1 (especificación 012): lógica pura, sin Prisma ni alias "@/".
// La usan las rutas de /api/seasons y se prueba directo con `npm run test:unit`.
//
// Sin imports de valores a propósito (Node los corre tal cual en las pruebas): la tabla la arma
// `computeStandings` y la siembra `seedLeagueBracket` en el servidor, y acá llegan ya calculadas.

import type { StandingRow } from "./standings.ts";

export const SEASON_STAGES = ["apertura", "clausura", "final"] as const;
export type SeasonStage = (typeof SEASON_STAGES)[number];

/** Llaves (eliminación directa), liguilla (todos contra todos) o ninguna (gana el primero de la General). */
export const FINAL_FORMATS = ["llaves", "liguilla", "ninguna"] as const;
export type FinalFormat = (typeof FINAL_FORMATS)[number];

/** Clasificados posibles a llaves: los mismos que las llaves de liga (`PLAYOFF_SIZES`), para cruzar mejor contra peor. */
export const FINAL_BRACKET_SIZES = [2, 4, 8, 16] as const;
/** Con 2 una liguilla sería un solo partido: para eso están las llaves. */
export const MIN_LIGUILLA_TEAMS = 3;

export function isFinalFormat(value: unknown): value is FinalFormat {
  return typeof value === "string" && (FINAL_FORMATS as readonly string[]).includes(value);
}

/**
 * Valida el tipo de fase final y cuántos clasifican. `maxTeams` es el tope: los equipos de la temporada
 * (o el cupo de la Apertura mientras todavía se inscriben). Con "ninguna", `finalTeams` queda en null.
 */
export function parseFinalConfig(
  finalFormat: unknown,
  finalTeams: unknown,
  maxTeams: number
): { ok: true; finalFormat: FinalFormat; finalTeams: number | null } | { ok: false; error: string } {
  if (!isFinalFormat(finalFormat)) return { ok: false, error: `finalFormat debe ser ${FINAL_FORMATS.map((f) => `"${f}"`).join(", ")}` };
  if (finalFormat === "ninguna") return { ok: true, finalFormat, finalTeams: null };
  if (typeof finalTeams !== "number" || !Number.isInteger(finalTeams)) {
    return { ok: false, error: "finalTeams debe ser un número entero" };
  }
  if (finalTeams > maxTeams) {
    return { ok: false, error: `No pueden clasificar más equipos (${finalTeams}) que los de la temporada (${maxTeams})` };
  }
  if (finalFormat === "llaves" && !(FINAL_BRACKET_SIZES as readonly number[]).includes(finalTeams)) {
    return { ok: false, error: `A las llaves clasifican ${FINAL_BRACKET_SIZES.join(", ")} equipos` };
  }
  if (finalFormat === "liguilla" && finalTeams < MIN_LIGUILLA_TEAMS) {
    return { ok: false, error: `A una liguilla clasifican al menos ${MIN_LIGUILLA_TEAMS} equipos` };
  }
  return { ok: true, finalFormat, finalTeams };
}

/**
 * ¿Este partido suma a la tabla General? Solo los finalizados de la fase de liga: los de las llaves de
 * cada fase (`decisive`) no. Quien llama ya dejó afuera los de la fase final.
 */
export function countsForGeneral(match: { status: string; decisive: boolean }): boolean {
  return match.status === "finalizado" && !match.decisive;
}

export type ChampionTournament = { format: string; status: string; playoffTeams: number | null };
export type ChampionMatch = { decisive: boolean; nextMatchId: string | null; winnerTeamId: string | null; status: string };

/**
 * Campeón de un torneo terminado, o null si todavía no lo hay. En una liga sin llaves es el primero de
 * su tabla (`standings`, ya ordenada); con cuadro (liga con llaves o eliminación) es quien ganó la final:
 * el único partido del cuadro que no alimenta a otro.
 */
export function tournamentChampion(tournament: ChampionTournament, standings: readonly StandingRow[], matches: readonly ChampionMatch[]): string | null {
  if (tournament.status !== "finalizado") return null;
  if (tournament.format === "liga" && tournament.playoffTeams === null) return standings[0]?.clubId ?? null;
  const final = matches.find((m) => m.decisive && m.nextMatchId === null && m.status === "finalizado");
  return final?.winnerTeamId ?? null;
}

export type SeasonStatus = "apertura" | "clausura" | "final_pendiente" | "final" | "terminada";
type StageStatus = { status: string } | null | undefined;

/** En qué va la temporada, según el estado de cada uno de sus torneos. */
export function seasonStatus(finalFormat: string, stages: { apertura?: StageStatus; clausura?: StageStatus; final?: StageStatus }): SeasonStatus {
  if (!stages.clausura) return "apertura";
  if (stages.clausura.status !== "finalizado") return "clausura";
  if (finalFormat === "ninguna") return "terminada";
  if (!stages.final) return "final_pendiente";
  return stages.final.status === "finalizado" ? "terminada" : "final";
}

/**
 * Campeón de la temporada: el de la fase final o, sin fase final, el primero de la General una vez
 * terminado el Clausura. Null mientras no esté definido.
 */
export function seasonChampion(finalFormat: string, status: SeasonStatus, general: readonly StandingRow[], finalChampion: string | null): string | null {
  if (status !== "terminada") return null;
  if (finalFormat === "ninguna") return general[0]?.clubId ?? null;
  return finalChampion;
}

/**
 * ¿La General de hoy ya no da los mismos clasificados que entraron a la fase final? Pasa si se corrigió
 * un partido después de generarla (decisión G: no se recalcula, solo se avisa). Se compara quiénes, no el orden.
 */
export function finalOutdated(general: readonly StandingRow[], finalTeams: number, enrolled: readonly string[]): boolean {
  const qualified = new Set(general.slice(0, finalTeams).map((r) => r.clubId));
  return enrolled.length !== qualified.size || enrolled.some((clubId) => !qualified.has(clubId));
}

/** Nombre por omisión del Clausura: "Clausura" y el año en que empezó la Apertura. */
export function defaultClausuraName(aperturaStart: Date): string {
  return `Clausura ${aperturaStart.getUTCFullYear()}`;
}

/** Nombre por omisión de la fase final. */
export function defaultFinalName(seasonName: string): string {
  return `${seasonName} · Fase final`;
}

export type ScorerStat = { playerId: string; goals: number; matchesPlayed: number };

/**
 * Goleador general: suma por jugador los goles y partidos de cada torneo de la temporada, de más a menos
 * goles (a igualdad queda primero quien ya iba primero). Los que no hicieron goles no salen.
 */
export function sumScorers<T extends ScorerStat>(stats: readonly T[]): (T & ScorerStat)[] {
  const byPlayer = new Map<string, T & ScorerStat>();
  for (const s of stats) {
    const current = byPlayer.get(s.playerId);
    if (current) {
      current.goals += s.goals;
      current.matchesPlayed += s.matchesPlayed;
    } else {
      byPlayer.set(s.playerId, { ...s });
    }
  }
  return [...byPlayer.values()].filter((s) => s.goals > 0).sort((a, b) => b.goals - a.goals);
}
