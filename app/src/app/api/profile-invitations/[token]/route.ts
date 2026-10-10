import { type NextRequest } from "next/server";
import { prisma } from "@/_lib/prisma";
import { effectiveStatus, maskEmail } from "@/_lib/profile-invitation";

/**
 * Lo que ve quien abre el enlace de una invitación a reclamar un perfil provisional (especificación 009,
 * entrega 3). Público, como el resto de las invitaciones: el token es el secreto. Solo devuelve lo mínimo para
 * que la persona reconozca su perfil —su nombre y el equipo— y con qué correo entrar (enmascarado). Nunca el
 * DNI ni la fecha de nacimiento: el DNI es justo lo que tiene que escribir para confirmar.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length > 100) return Response.json({ error: "La invitación no existe o fue cancelada" }, { status: 404 });

  const invitation = await prisma.profileInvitation.findUnique({
    where: { token },
    select: {
      status: true, attempts: true, email: true, expiresAt: true,
      profile: { select: { userId: true, firstName: true, lastName: true, club: { select: { name: true, color: true } } } },
    },
  });
  if (!invitation) return Response.json({ error: "La invitación no existe o fue cancelada" }, { status: 404 });

  const status = effectiveStatus(invitation.status, invitation.expiresAt, new Date());
  if (status === "locked") return Response.json({ error: "Esta invitación se bloqueó por demasiados intentos. Pide una nueva a quien te la envió.", code: "locked" }, { status: 423 });
  if (status === "expired") return Response.json({ error: "La invitación venció. Pide una nueva a quien te la envió.", code: "expired" }, { status: 410 });
  if (status !== "pending" || invitation.profile.userId !== null) {
    return Response.json({ error: "Esta invitación ya fue usada o se canceló.", code: "used" }, { status: 410 });
  }

  return Response.json({
    playerName: `${invitation.profile.firstName ?? ""} ${invitation.profile.lastName ?? ""}`.trim(),
    clubName: invitation.profile.club?.name ?? null,
    clubColor: invitation.profile.club?.color ?? null,
    expiresAt: invitation.expiresAt,
    // Con correo: la invitación es para esa cuenta (se muestra enmascarado). Sin correo: es un enlace para compartir.
    emailHint: invitation.email ? maskEmail(invitation.email) : null,
  });
}
