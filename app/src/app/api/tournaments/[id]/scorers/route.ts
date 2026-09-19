import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const stats = await prisma.playerStats.findMany({
    where: { tournamentId: id, goals: { gt: 0 } },
    include: {
      player: {
        include: {
          user: { select: { firstName: true, lastName: true, avatarUrl: true } },
          club: { select: { name: true, shortName: true } },
        },
      },
    },
    orderBy: { goals: "desc" },
  });

  return Response.json(
    stats.map((s, i) => ({
      position: i + 1,
      playerId: s.playerId,
      firstName: s.player.user.firstName,
      lastName: s.player.user.lastName,
      avatarUrl: s.player.user.avatarUrl,
      clubName: s.player.club?.name ?? "Sin equipo",
      goals: s.goals,
      matchesPlayed: s.matchesPlayed,
    }))
  );
}
