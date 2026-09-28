import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { canManageClub, forbidden, requireUser } from "@/_lib/auth";

// Cancela una invitación personal pendiente que el club todavía no envió a través de un
// tercero: el destinatario deja de poder aceptarla (ver especificación 005, "limitaciones
// conocidas" — antes no existía forma de retirarla).
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; invitationId: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id, invitationId } = await params;
  if (!(await canManageClub(auth.user, id))) return forbidden();

  const invitation = await prisma.playerInvitation.findUnique({
    where: { id: invitationId },
    select: { id: true, clubId: true, status: true },
  });
  if (!invitation || invitation.clubId !== id) {
    return Response.json({ error: "Invitación no encontrada" }, { status: 404 });
  }
  if (invitation.status !== "pending") {
    return Response.json({ error: "Esta invitación ya no está pendiente" }, { status: 409 });
  }

  await prisma.playerInvitation.update({ where: { id: invitationId }, data: { status: "cancelled" } });
  return Response.json({ success: true });
}
