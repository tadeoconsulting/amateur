import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageMatch, forbidden, readJson, requireUser } from "@/_lib/auth";

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
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!(await canManageMatch(auth.user, id))) return forbidden();

  const body = await readJson(request);
  if (!body) return badRequest();
  const { type, minute, playerId, teamId, detail } = body;

  if (typeof type !== "string" || !type || !Number.isInteger(minute) || (minute as number) < 0) {
    return badRequest("type y minute requeridos");
  }

  try {
    // Todo en una transacción: el evento, el marcador y las estadísticas se guardan
    // juntos o no se guarda nada. Los incrementos son atómicos, así que dos goles
    // simultáneos no se pisan.
    const event = await prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({ where: { id } });
      if (!match) return null;

      const created = await tx.matchEvent.create({
        data: {
          matchId: id,
          type,
          minute: minute as number,
          playerId: typeof playerId === "string" ? playerId : null,
          teamId: typeof teamId === "string" ? teamId : null,
          detail: typeof detail === "string" ? detail : null,
        },
      });

      if (type === "gol" && (teamId === match.homeTeamId || teamId === match.awayTeamId)) {
        if (teamId === match.homeTeamId) {
          await tx.match.updateMany({ where: { id, homeScore: null }, data: { homeScore: 0 } });
          await tx.match.update({ where: { id }, data: { homeScore: { increment: 1 } } });
        } else {
          await tx.match.updateMany({ where: { id, awayScore: null }, data: { awayScore: 0 } });
          await tx.match.update({ where: { id }, data: { awayScore: { increment: 1 } } });
        }
      }

      if (typeof playerId === "string") {
        const inc: { goals?: number; yellowCards?: number; redCards?: number } = {};
        if (type === "gol") inc.goals = 1;
        if (type === "tarjeta_amarilla") inc.yellowCards = 1;
        if (type === "tarjeta_roja") inc.redCards = 1;

        if (Object.keys(inc).length > 0) {
          await tx.playerStats.upsert({
            where: { playerId_tournamentId: { playerId, tournamentId: match.tournamentId } },
            update: {
              ...(inc.goals && { goals: { increment: 1 } }),
              ...(inc.yellowCards && { yellowCards: { increment: 1 } }),
              ...(inc.redCards && { redCards: { increment: 1 } }),
            },
            create: { playerId, tournamentId: match.tournamentId, ...inc },
          });
        }
      }

      return created;
    });

    if (!event) {
      return Response.json({ error: "Partido no encontrado" }, { status: 404 });
    }
    return Response.json(event, { status: 201 });
  } catch (error) {
    console.error("Create event error:", error);
    return Response.json({ error: "Error al registrar evento" }, { status: 500 });
  }
}
