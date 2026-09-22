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
