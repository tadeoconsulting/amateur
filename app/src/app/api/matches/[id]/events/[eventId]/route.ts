import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { canManageMatch, forbidden, requireUser } from "@/_lib/auth";
import { changesScore, isEventType, statFor } from "@/_lib/match-live";

/**
 * Deshace una jugada: la borra y revierte su efecto en el marcador y en las estadísticas del
 * jugador. Solo mientras el partido está en juego (para corregir uno terminado, se reabre).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id, eventId } = await params;
  if (!(await canManageMatch(auth.user, id))) return forbidden();

  const event = await prisma.matchEvent.findFirst({ where: { id: eventId, matchId: id } });
  if (!event) return Response.json({ error: "Jugada no encontrada" }, { status: 404 });

  const match = await prisma.match.findUnique({
    where: { id },
    select: { status: true, homeTeamId: true, tournamentId: true },
  });
  if (!match) return Response.json({ error: "Partido no encontrado" }, { status: 404 });
  if (match.status !== "en_curso") {
    return Response.json({ error: "Reabre el partido para corregir sus jugadas" }, { status: 409 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.matchEvent.delete({ where: { id: eventId } });

      if (isEventType(event.type) && changesScore(event.type)) {
        // where score > 0: el marcador nunca queda negativo, aunque se haya editado a mano.
        if (event.teamId === match.homeTeamId) {
          await tx.match.updateMany({ where: { id, homeScore: { gt: 0 } }, data: { homeScore: { decrement: 1 } } });
        } else {
          await tx.match.updateMany({ where: { id, awayScore: { gt: 0 } }, data: { awayScore: { decrement: 1 } } });
        }
      }

      const stat = isEventType(event.type) ? statFor(event.type) : null;
      if (stat && event.playerId) {
        await tx.playerStats.updateMany({
          where: { playerId: event.playerId, tournamentId: match.tournamentId, [stat]: { gt: 0 } },
          data: { [stat]: { decrement: 1 } },
        });
      }
    });
    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete event error:", error);
    return Response.json({ error: "Error al deshacer la jugada" }, { status: 500 });
  }
}
