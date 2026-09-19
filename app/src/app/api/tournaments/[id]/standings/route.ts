import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";

interface StandingRow {
  clubId: string;
  clubName: string;
  shortName: string;
  logoUrl: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  groupName: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const group = request.nextUrl.searchParams.get("group");

  const teams = await prisma.tournamentTeam.findMany({
    where: { tournamentId: id, ...(group ? { groupName: group } : {}) },
    include: { club: true },
  });

  const matches = await prisma.match.findMany({
    where: { tournamentId: id, status: "finalizado", ...(group ? { groupName: group } : {}) },
  });

  const standings: Record<string, StandingRow> = {};

  for (const team of teams) {
    standings[team.clubId] = {
      clubId: team.clubId,
      clubName: team.club.name,
      shortName: team.club.shortName,
      logoUrl: team.club.logoUrl,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      groupName: team.groupName,
    };
  }

  for (const match of matches) {
    if (match.homeScore === null || match.awayScore === null) continue;

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

  const sorted = Object.values(standings)
    .map((s) => ({ ...s, goalDifference: s.goalsFor - s.goalsAgainst }))
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);

  return Response.json(sorted.map((s, i) => ({ position: i + 1, ...s })));
}
