import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, readJson, requireUser } from "@/_lib/auth";
import { denyResponse, matchAccess } from "@/_lib/mesa-server";
import { changesScore, isEventType, statFor } from "@/_lib/match-live";
import { canDeleteEventIn, canEditEventIn, parseEventEdit, playerEditable, statMove } from "@/_lib/event-edit";
import { publicarEventoPartido } from "@/_lib/realtime";

/**
 * Corrige una jugada ya registrada (especificación 018): su **minuto** y, en un gol o una tarjeta, su **jugador** (cambiarlo,
 * asignarlo si no tenía, o quitarlo con `null`). No toca el marcador ni quién la registró, y el minuto original se conserva
 * si no se manda uno nuevo. Si cambia el jugador, la estadística (goles o tarjetas) pasa del anterior al nuevo.
 * Sirve en juego y también con el partido finalizado (la mesa, dentro de su horario); en un partido sin empezar no hay jugadas.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id, eventId } = await params;
  const access = await matchAccess(auth.user, id);
  if (!access.ok) return denyResponse(access);

  const parsed = parseEventEdit(await readJson(request));
  if (!parsed.ok) return badRequest(parsed.error);
  const { minute, playerId } = parsed.edit;

  const event = await prisma.matchEvent.findFirst({ where: { id: eventId, matchId: id } });
  if (!event) return Response.json({ error: "Jugada no encontrada" }, { status: 404 });

  const match = await prisma.match.findUnique({ where: { id }, select: { status: true, tournamentId: true } });
  if (!match) return Response.json({ error: "Partido no encontrado" }, { status: 404 });
  if (!canEditEventIn(match.status)) {
    return Response.json({ error: "El partido todavía no empezó" }, { status: 409 });
  }

  if (playerId !== undefined) {
    if (!playerEditable(event.type, event.scored)) {
      return badRequest("Solo se puede cambiar el jugador de un gol o de una tarjeta");
    }
    if (playerId !== null) {
      // El jugador tiene que ser del equipo de la jugada, si no se le acreditaría a otro (igual que al registrarla).
      if (!event.teamId) return badRequest("Esta jugada no tiene equipo: no se le puede asignar un jugador");
      const player = await prisma.playerProfile.findUnique({ where: { id: playerId }, select: { clubId: true } });
      if (!player || player.clubId !== event.teamId) return badRequest("El jugador no pertenece al equipo de la jugada");
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.matchEvent.update({
        where: { id: eventId },
        data: {
          ...(minute !== undefined ? { minute } : {}),
          ...(playerId !== undefined ? { playerId } : {}),
        },
      });

      const move = playerId !== undefined ? statMove(event.type, event.scored, event.playerId, playerId) : null;
      if (move) {
        if (move.decrement) {
          // where > 0: la estadística nunca queda negativa, aunque se haya editado a mano.
          await tx.playerStats.updateMany({
            where: { playerId: move.decrement, tournamentId: match.tournamentId, [move.stat]: { gt: 0 } },
            data: { [move.stat]: { decrement: 1 } },
          });
        }
        if (move.increment) {
          await tx.playerStats.upsert({
            where: { playerId_tournamentId: { playerId: move.increment, tournamentId: match.tournamentId } },
            update: { [move.stat]: { increment: 1 } },
            create: { playerId: move.increment, tournamentId: match.tournamentId, [move.stat]: 1 },
          });
        }
      }
      return saved;
    });

    await publicarEventoPartido(id);
    return Response.json(updated);
  } catch (error) {
    console.error("Edit event error:", error);
    return Response.json({ error: "Error al corregir la jugada" }, { status: 500 });
  }
}

/**
 * Elimina una jugada: la borra y revierte su efecto en el marcador y en las estadísticas del jugador. En juego, siempre;
 * con el partido finalizado, también (la mesa, dentro de su horario) salvo en un cruce de eliminación, donde el marcador
 * define quién avanza y hay que reabrir el partido.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id, eventId } = await params;
  const access = await matchAccess(auth.user, id);
  if (!access.ok) return denyResponse(access);

  const event = await prisma.matchEvent.findFirst({ where: { id: eventId, matchId: id } });
  if (!event) return Response.json({ error: "Jugada no encontrada" }, { status: 404 });

  const match = await prisma.match.findUnique({
    where: { id },
    select: { status: true, decisive: true, homeTeamId: true, tournamentId: true },
  });
  if (!match) return Response.json({ error: "Partido no encontrado" }, { status: 404 });
  if (!canDeleteEventIn(match.status, match.decisive)) {
    const reopen = match.status === "finalizado" && match.decisive;
    return Response.json(
      { error: reopen ? "Este partido es un cruce de eliminación y ya terminó: reábrelo para eliminar jugadas" : "Reabre el partido para corregir sus jugadas" },
      { status: 409 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.matchEvent.delete({ where: { id: eventId } });

      if (isEventType(event.type) && changesScore(event.type, event.scored)) {
        // where score > 0: el marcador nunca queda negativo, aunque se haya editado a mano.
        if (event.teamId === match.homeTeamId) {
          await tx.match.updateMany({ where: { id, homeScore: { gt: 0 } }, data: { homeScore: { decrement: 1 } } });
        } else {
          await tx.match.updateMany({ where: { id, awayScore: { gt: 0 } }, data: { awayScore: { decrement: 1 } } });
        }
      } else if (event.type === "penal_definicion" && event.scored === true) {
        if (event.teamId === match.homeTeamId) {
          await tx.match.updateMany({ where: { id, penaltyHomeScore: { gt: 0 } }, data: { penaltyHomeScore: { decrement: 1 } } });
        } else {
          await tx.match.updateMany({ where: { id, penaltyAwayScore: { gt: 0 } }, data: { penaltyAwayScore: { decrement: 1 } } });
        }
      }

      const stat = isEventType(event.type) ? statFor(event.type, event.scored) : null;
      if (stat && event.playerId) {
        await tx.playerStats.updateMany({
          where: { playerId: event.playerId, tournamentId: match.tournamentId, [stat]: { gt: 0 } },
          data: { [stat]: { decrement: 1 } },
        });
      }
    });
    await publicarEventoPartido(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete event error:", error);
    return Response.json({ error: "Error al deshacer la jugada" }, { status: 500 });
  }
}
