import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const events = await prisma.matchEvent.findMany({
    where: { matchId: id },
    include: {
      player: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: { minute: "asc" },
  });

  return Response.json(
    events.map((e) => ({
      id: e.id,
      type: e.type,
      minute: e.minute,
      playerName: e.player ? `${e.player.user.firstName} ${e.player.user.lastName}` : null,
      teamId: e.teamId,
      detail: e.detail,
    }))
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { type, minute, playerId, teamId, detail } = await request.json();

  if (!type || minute === undefined) {
    return Response.json({ error: "type y minute requeridos" }, { status: 400 });
  }

  try {
    const event = await prisma.matchEvent.create({
      data: { matchId: id, type, minute, playerId, teamId, detail },
    });

    // Auto-update scores for goals
    if (type === "gol" && teamId) {
      const match = await prisma.match.findUnique({ where: { id } });
      if (match) {
        const isHome = teamId === match.homeTeamId;
        await prisma.match.update({
          where: { id },
          data: isHome
            ? { homeScore: (match.homeScore || 0) + 1 }
            : { awayScore: (match.awayScore || 0) + 1 },
        });
      }
    }

    // Update player stats
    if (playerId) {
      const match = await prisma.match.findUnique({ where: { id } });
      if (match) {
        const statsUpdate: Record<string, { increment: number }> = {};
        if (type === "gol") statsUpdate.goals = { increment: 1 };
        if (type === "tarjeta_amarilla") statsUpdate.yellowCards = { increment: 1 };
        if (type === "tarjeta_roja") statsUpdate.redCards = { increment: 1 };

        if (Object.keys(statsUpdate).length > 0) {
          await prisma.playerStats.upsert({
            where: {
              playerId_tournamentId: { playerId, tournamentId: match.tournamentId },
            },
            update: statsUpdate,
            create: {
              playerId,
              tournamentId: match.tournamentId,
              ...(type === "gol" ? { goals: 1 } : {}),
              ...(type === "tarjeta_amarilla" ? { yellowCards: 1 } : {}),
              ...(type === "tarjeta_roja" ? { redCards: 1 } : {}),
            },
          });
        }
      }
    }

    return Response.json(event, { status: 201 });
  } catch (error) {
    console.error("Create event error:", error);
    return Response.json({ error: "Error al registrar evento" }, { status: 500 });
  }
}
