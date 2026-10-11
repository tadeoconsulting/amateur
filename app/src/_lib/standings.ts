// Tabla de posiciones: lógica pura, sin Prisma. La usan la API de standings y, en "copa",
// armar el cuadro de eliminación a partir de quién queda arriba en cada grupo.

export type StandingTeam = { clubId: string; groupName: string | null };
export type StandingMatch = {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
};

export type StandingRow = {
  clubId: string;
  groupName: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

/**
 * Victoria 3, empate 1, derrota 0. Orden: puntos, diferencia de gol, goles a favor (sin
 * enfrentamiento directo). Solo cuentan los partidos con marcador y los dos equipos ya
 * definidos (un partido "por definir" de un cuadro de eliminación no cuenta).
 *
 * Ordena globalmente (mezclando grupos si los hay); para una tabla por grupo, agrupar el
 * resultado por `groupName` y listo, el orden relativo dentro de cada grupo ya es correcto.
 */
export function computeStandings(teams: StandingTeam[], matches: StandingMatch[]): StandingRow[] {
  const standings: Record<string, StandingRow> = {};

  for (const team of teams) {
    standings[team.clubId] = {
      clubId: team.clubId,
      groupName: team.groupName,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    };
  }

  for (const match of matches) {
    if (match.homeScore === null || match.awayScore === null) continue;
    if (match.homeTeamId === null || match.awayTeamId === null) continue; // "por definir": no cuenta

    const home = standings[match.homeTeamId];
    const away = standings[match.awayTeamId];
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (match.homeScore < match.awayScore) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }
  }

  return Object.values(standings)
    .map((s) => ({ ...s, goalDifference: s.goalsFor - s.goalsAgainst }))
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
}

export type LiveStandingRow = StandingRow & {
  /** Lugar en la tabla incluyendo los partidos que se están jugando (como si terminaran así). */
  position: number;
  /** Lugar en la tabla oficial, solo con los partidos finalizados. */
  officialPosition: number;
  /** ¿Este equipo está jugando ahora? */
  live: boolean;
  /** Puntos que le suma el partido en vivo con el marcador de ahora (0, 1 o 3). */
  pointsDelta: number;
};

/**
 * La tabla "en vivo": suma a la oficial los partidos que se están jugando, con el marcador de este momento, como si
 * terminaran así. Es solo una proyección: no se guarda nada, y cuando el partido finaliza, la oficial pasa a ser
 * igual. Cada fila lleva su lugar de ahora (`position`), el oficial (`officialPosition`), si juega ahora (`live`) y
 * cuántos puntos le da el marcador de ahora (`pointsDelta`). Sin partidos en vivo, es la oficial.
 */
export function computeLiveStandings(teams: StandingTeam[], finished: StandingMatch[], inPlay: StandingMatch[]): LiveStandingRow[] {
  const official = computeStandings(teams, finished);
  const projected = inPlay.length > 0 ? computeStandings(teams, [...finished, ...inPlay]) : official;

  const officialPosition = new Map(official.map((row, i) => [row.clubId, i + 1]));
  const officialPoints = new Map(official.map((row) => [row.clubId, row.points]));
  const playing = new Set<string>();
  for (const m of inPlay) {
    if (m.homeScore === null || m.awayScore === null || m.homeTeamId === null || m.awayTeamId === null) continue;
    playing.add(m.homeTeamId);
    playing.add(m.awayTeamId);
  }

  return projected.map((row, i) => ({
    ...row,
    position: i + 1,
    officialPosition: officialPosition.get(row.clubId) ?? i + 1,
    live: playing.has(row.clubId),
    pointsDelta: row.points - (officialPoints.get(row.clubId) ?? 0),
  }));
}

/**
 * Cuántos lugares subió (positivo) o bajó (negativo) cada equipo de esta lista respecto de la tabla oficial. La lista
 * es la que se muestra (toda la tabla o un solo grupo) y va en el orden en vivo; el lugar oficial se toma entre
 * esos mismos equipos, así que en un torneo con grupos cada grupo se mide solo contra sí mismo.
 */
export function placeChanges(rows: readonly { clubId: string; officialPosition?: number }[]): Map<string, number> {
  const changes = new Map<string, number>();
  if (rows.some((r) => r.officialPosition === undefined)) return changes;
  const officialOrder = [...rows].sort((a, b) => (a.officialPosition as number) - (b.officialPosition as number));
  const officialRank = new Map(officialOrder.map((r, i) => [r.clubId, i]));
  rows.forEach((r, i) => {
    const change = (officialRank.get(r.clubId) ?? i) - i;
    if (change !== 0) changes.set(r.clubId, change);
  });
  return changes;
}
