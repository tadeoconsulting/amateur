import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { isAdmin, requireUser } from "@/_lib/auth";
import { joinClub } from "@/_lib/invite";

const ACTIONS = ["accept", "decline", "cancel"] as const;
type Action = (typeof ACTIONS)[number];
const isAction = (value: string): value is Action => (ACTIONS as readonly string[]).includes(value);

/**
 * Resuelve una solicitud de un jugador para unirse a un club:
 *   POST /api/player-join-requests/:id/accept | decline | cancel
 * accept/decline los decide el dueño del club; cancel, quien la mandó — mismo patrón que
 * /api/tournament-requests/:id/:action.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const { id, action } = await params;
  if (!isAction(action)) return Response.json({ error: "Acción no válida" }, { status: 404 });

  const found = await prisma.playerJoinRequest.findUnique({
    where: { id },
    select: { id: true, status: true, userId: true, clubId: true, club: { select: { ownerId: true } } },
  });
  if (!found) return Response.json({ error: "Solicitud no encontrada" }, { status: 404 });

  const allowed =
    isAdmin(user) || (action === "cancel" ? found.userId === user.id : found.club.ownerId === user.id);
  if (!allowed) return Response.json({ error: "No tienes permiso para esta acción" }, { status: 403 });

  if (found.status !== "pending") {
    return Response.json({ error: "Esta solicitud ya fue resuelta" }, { status: 409 });
  }

  if (action !== "accept") {
    const status = action === "decline" ? "declined" : "cancelled";
    // updateMany con el estado en el filtro: si dos personas resuelven a la vez, una sola gana.
    const result = await prisma.playerJoinRequest.updateMany({
      where: { id, status: "pending" },
      data: { status, resolvedAt: new Date() },
    });
    if (result.count === 0) return Response.json({ error: "Esta solicitud ya fue resuelta" }, { status: 409 });
    return Response.json({ id, status });
  }

  const claimed = await prisma.playerJoinRequest.updateMany({
    where: { id, status: "pending" },
    data: { status: "accepted", resolvedAt: new Date() },
  });
  if (claimed.count === 0) return Response.json({ error: "Esta solicitud ya fue resuelta" }, { status: 409 });

  const result = await joinClub(found.userId, found.clubId);

  // El jugador puede haber pedido unirse a más de un club a la vez: al entrar a este, las
  // demás solicitudes pendientes quedan sin sentido.
  await prisma.playerJoinRequest.updateMany({
    where: { userId: found.userId, status: "pending", id: { not: id } },
    data: { status: "cancelled", resolvedAt: new Date() },
  });

  return Response.json({ id, status: "accepted", result });
}
