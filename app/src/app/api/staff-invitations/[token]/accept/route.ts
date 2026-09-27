import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { forbidden, getCurrentUser, normalizeEmail, unauthorized } from "@/_lib/auth";
import { invitationProblem, resolveStaffInvitation } from "@/_lib/invite";

/**
 * La persona con sesión acepta la invitación: se le crea (o confirma) su fila de StaffMember
 * en ese club, con ese rol. A diferencia de un jugador, el staff no es exclusivo de un club:
 * aceptar nunca reemplaza nada, solo agrega.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { token } = await params;
  const resolved = await resolveStaffInvitation(token);
  if (!resolved.ok) return invitationProblem(resolved.reason);

  // La invitación es para esa cuenta, aunque otra persona tenga el token.
  if (normalizeEmail(user.email) !== normalizeEmail(resolved.invitation.email)) return forbidden();

  await prisma.staffMember.upsert({
    where: {
      userId_clubId_role: { userId: user.id, clubId: resolved.club.id, role: resolved.invitation.role },
    },
    update: {},
    create: { userId: user.id, clubId: resolved.club.id, role: resolved.invitation.role },
  });

  await prisma.staffInvitation.update({ where: { id: resolved.invitation.id }, data: { status: "accepted" } });

  return Response.json({ joined: true, club: resolved.club, role: resolved.invitation.role });
}
