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

  // En una liga con llaves, los partidos del cuadro no cuentan para la tabla: la tabla es la de
  // la fase de liga, la que decidió quién clasificó.
  const tournament = await prisma.tournament.findUnique({ where: { id }, select: { format: true } });
  const matches = await prisma.match.findMany({
    where: {
      tournamentId: id,
      status: "finalizado",
      ...(tournament?.format === "liga" ? { decisive: false } : {}),
      ...(group ? { groupName: group } : {}),
    },
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
      color: club.get(row.clubId)?.color ?? null,
    }))
  );
}
