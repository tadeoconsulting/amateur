import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { getCurrentUser } from "@/_lib/auth";
import { SCORER_PLAYER_INCLUDE, scorerRows } from "@/_lib/scorers-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [tournament, viewer] = await Promise.all([
    prisma.tournament.findUnique({ where: { id }, select: { organizerId: true } }),
    getCurrentUser(),
  ]);

  const stats = await prisma.playerStats.findMany({
    where: { tournamentId: id, goals: { gt: 0 } },
    include: SCORER_PLAYER_INCLUDE,
    orderBy: { goals: "desc" },
  });

  return Response.json(scorerRows(stats, tournament?.organizerId, viewer));
}
