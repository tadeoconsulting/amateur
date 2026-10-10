import { type NextRequest } from "next/server";
import { prisma } from "@/_lib/prisma";
import { isAdmin, requireUser } from "@/_lib/auth";
import { checkDelegateAccept } from "@/_lib/delegate-invitation";
import { makeClubOfficial, OfficializeConflict } from "@/_lib/club-official-server";

/**
 * Acepta una invitación a ser delegado de un equipo temporal (especificación 009, entrega 4). Exige sesión: es la
 * cuenta de quien la acepta la que pasa a ser dueña del equipo, que deja de ser temporal (lo mismo que hace
 * "Oficializar"). El equipo sigue inscrito en sus torneos. Un enlace se usa una sola vez: si dos personas lo
 * abren a la vez, solo una lo consigue.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { token } = await params;
  const invitation = token && token.length <= 100
    ? await prisma.delegateInvitation.findUnique({
        where: { token },
        select: { id: true, clubId: true, status: true, email: true, expiresAt: true, club: { select: { name: true, isTemporary: true } } },
      })
    : null;
  if (!invitation) return Response.json({ error: "La invitación no existe o fue cancelada" }, { status: 404 });

  const ownedClubs = await prisma.club.count({ where: { ownerId: auth.user.id } });
  const check = checkDelegateAccept({
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    now: new Date(),
    email: invitation.email,
    sessionEmail: auth.user.email,
    sessionIsAdmin: isAdmin(auth.user),
    sessionOwnedClubs: ownedClubs,
    clubIsTemporary: invitation.club.isTemporary,
  });
  if (!check.ok) return Response.json({ error: check.message, code: check.code }, { status: check.status });

  try {
    await makeClubOfficial(invitation.clubId, auth.user.id, { acceptInvitationId: invitation.id });
    return Response.json({ status: "accepted", clubName: invitation.club.name });
  } catch (error) {
    if (error instanceof OfficializeConflict) {
      return Response.json({ error: "Esta invitación ya fue usada o se canceló.", code: "used" }, { status: 410 });
    }
    console.error("Accept delegate invitation error:", error);
    return Response.json({ error: "No se pudo completar. Inténtalo de nuevo." }, { status: 500 });
  }
}
