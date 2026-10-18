import { type NextRequest } from "next/server";
import { prisma } from "@/_lib/prisma";
import { isAdmin, requireUser } from "@/_lib/auth";
import { canDo } from "@/_lib/club-delegate";
import { clubRoleFor } from "@/_lib/club-delegate-server";

/** Cancela una invitación de co-delegado pendiente (especificación 014): su enlace deja de funcionar. Principal o admin. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; invitationId: string }> }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id, invitationId } = await params;

  const invitation = await prisma.coDelegateInvitation.findFirst({ where: { id: invitationId, clubId: id }, select: { id: true, status: true } });
  if (!invitation) return Response.json({ error: "Invitación no encontrada" }, { status: 404 });
  if (!canDo(await clubRoleFor(auth.user.id, isAdmin(auth.user), id), "manage_delegates")) {
    return Response.json({ error: "No tienes permiso para esta acción" }, { status: 403 });
  }
  if (invitation.status !== "pending") return Response.json({ error: "Esta invitación ya no está pendiente" }, { status: 409 });

  await prisma.coDelegateInvitation.updateMany({ where: { id: invitationId, status: "pending" }, data: { status: "cancelled" } });
  return Response.json({ success: true });
}
