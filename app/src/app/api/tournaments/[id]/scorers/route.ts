import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { playerIdentity } from "@/_lib/player-identity";

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
    stats.map((s, i) => {
      const who = playerIdentity(s.player);
      return {
        position: i + 1,
        playerId: s.playerId,
        firstName: who.firstName,
        lastName: who.lastName,
        avatarUrl: who.avatarUrl,
        // Su puesto en la cancha, si lo tiene (no se muestra si está vacío). `position` ya es el lugar en la tabla.
        playerPosition: s.player.position,
        clubName: s.player.club?.name ?? "Sin equipo",
        goals: s.goals,
        matchesPlayed: s.matchesPlayed,
      };
    })
  );
}
