import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { isAdmin, requireUser } from "@/_lib/auth";
import { EnrollmentError, isUniqueViolation, withOpenTournament } from "@/_lib/enrollment";
import { isRequestAction, sideForAction, STATUS_AFTER } from "@/_lib/tournament-request";

/**
 * Resuelve una solicitud o invitación pendiente:
 *   POST /api/tournament-requests/:id/accept | decline | cancel
 * Quién puede cada acción sale de `sideForAction` (ver la especificación 006).
 * Aceptar crea la inscripción en la misma transacción.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const { id, action } = await params;
  if (!isRequestAction(action)) return Response.json({ error: "Acción no válida" }, { status: 404 });

  const found = await prisma.tournamentRequest.findUnique({
    where: { id },
    select: {
      id: true,
      kind: true,
      status: true,
      tournamentId: true,
      clubId: true,
      tournament: { select: { organizerId: true } },
      club: { select: { ownerId: true } },
    },
  });
  if (!found) return Response.json({ error: "Solicitud no encontrada" }, { status: 404 });

  const side = sideForAction(found.kind as "request" | "invite", action);
  const allowed =
    isAdmin(user) || (side === "organizer" ? found.tournament.organizerId === user.id : found.club.ownerId === user.id);
  if (!allowed) return Response.json({ error: "No tienes permiso para esta acción" }, { status: 403 });

  if (found.status !== "pending") {
    return Response.json({ error: "Esta solicitud ya fue resuelta" }, { status: 409 });
  }

  if (action !== "accept") {
    // updateMany con el estado en el filtro: si dos personas resuelven a la vez, una sola gana.
    const result = await prisma.tournamentRequest.updateMany({
      where: { id, status: "pending" },
      data: { status: STATUS_AFTER[action], resolvedAt: new Date() },
    });
    if (result.count === 0) return Response.json({ error: "Esta solicitud ya fue resuelta" }, { status: 409 });
    return Response.json({ id, status: STATUS_AFTER[action] });
  }

  try {
    const enrollment = await withOpenTournament(found.tournamentId, async (tx) => {
      const claimed = await tx.tournamentRequest.updateMany({
        where: { id, status: "pending" },
        data: { status: "accepted", resolvedAt: new Date() },
      });
      if (claimed.count === 0) throw new EnrollmentError(409, "Esta solicitud ya fue resuelta");
      return tx.tournamentTeam.create({
        data: { tournamentId: found.tournamentId, clubId: found.clubId },
        include: { club: true },
      });
    });
    return Response.json({ id, status: "accepted", enrollment });
  } catch (error) {
    if (error instanceof EnrollmentError) return Response.json({ error: error.message }, { status: error.status });
    if (isUniqueViolation(error)) return Response.json({ error: "El equipo ya está inscrito" }, { status: 409 });
    throw error;
  }
}
