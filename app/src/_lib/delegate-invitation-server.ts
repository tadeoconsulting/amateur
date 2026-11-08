import { prisma } from "./prisma";
import { enviarCorreo, type ResultadoCorreo } from "./email";
import { invitacionDelegado } from "./email-templates";
import { newInviteToken } from "./invite";
import { PROFILE_INVITE_DAYS } from "./profile-invitation";

// La invitación para ser el delegado de un equipo temporal o de un club sin delegado (especificación 009, entregas 4 y
// 5). La comparten la ruta `/api/clubs/:id/delegate-invitation` y la creación de un club sin delegado desde el admin.

export const delegateInviteExpiry = () => new Date(Date.now() + PROFILE_INVITE_DAYS * 86_400_000);

export const delegateInviteLink = (origin: string, token: string) => `${origin}/delegado/invitacion/${token}`;

export async function sendDelegateInvitationEmail(
  origin: string,
  admin: { firstName: string; lastName: string },
  clubName: string,
  email: string,
  token: string
): Promise<ResultadoCorreo> {
  return enviarCorreo({
    to: email,
    ...invitacionDelegado({ clubName, inviterName: `${admin.firstName} ${admin.lastName}`.trim(), url: delegateInviteLink(origin, token), days: PROFILE_INVITE_DAYS }),
  });
}

/**
 * Crea una invitación nueva y cancela la que hubiera (su enlace deja de funcionar). Con `email` también manda el correo;
 * sin él solo se crea el enlace para compartir. Si el correo no sale (sin proveedor configurado, o falló), la invitación
 * existe igual y `emailed` lo dice: el enlace se puede compartir a mano.
 */
export async function createDelegateInvitation(input: {
  origin: string;
  admin: { id: string; firstName: string; lastName: string };
  club: { id: string; name: string };
  email: string | null;
}) {
  const { origin, admin, club, email } = input;
  const invitation = await prisma.$transaction(async (tx) => {
    await tx.delegateInvitation.updateMany({ where: { clubId: club.id, status: "pending" }, data: { status: "cancelled" } });
    return tx.delegateInvitation.create({
      data: { clubId: club.id, email, token: newInviteToken(), invitedBy: admin.id, expiresAt: delegateInviteExpiry() },
      include: { acceptedBy: { select: { firstName: true, lastName: true, email: true } } },
    });
  });
  const emailed = email ? await sendDelegateInvitationEmail(origin, admin, club.name, email, invitation.token) : null;
  return { invitation, emailed };
}
