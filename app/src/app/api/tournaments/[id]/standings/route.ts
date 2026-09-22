import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { computeStandings } from "@/_lib/standings";

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

  const rows = computeStandings(
    teams.map((t) => ({ clubId: t.clubId, groupName: t.groupName })),
    matches
  );

  const club = new Map(teams.map((t) => [t.clubId, t.club]));
  return Response.json(
    rows.map((row, i) => ({
      position: i + 1,
      ...row,
      clubName: club.get(row.clubId)?.name ?? "",
      shortName: club.get(row.clubId)?.shortName ?? "",
      logoUrl: club.get(row.clubId)?.logoUrl ?? null,
    }))
  );
}
