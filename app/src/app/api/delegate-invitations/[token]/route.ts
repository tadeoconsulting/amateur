import { type NextRequest } from "next/server";
import { prisma } from "@/_lib/prisma";
import { effectiveStatus, maskEmail } from "@/_lib/profile-invitation";

/**
 * Lo que ve quien abre el enlace de una invitación a ser delegado de un equipo temporal (especificación 009,
 * entrega 4). Público, como el resto de las invitaciones: el token es el secreto. Solo devuelve el nombre y el
 * color del equipo, hasta cuándo vale y con qué correo entrar (enmascarado).
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length > 100) return Response.json({ error: "La invitación no existe o fue cancelada" }, { status: 404 });

  const invitation = await prisma.delegateInvitation.findUnique({
    where: { token },
    select: { status: true, email: true, expiresAt: true, club: { select: { name: true, color: true, logoUrl: true, isTemporary: true } } },
  });
  if (!invitation) return Response.json({ error: "La invitación no existe o fue cancelada" }, { status: 404 });

  const status = effectiveStatus(invitation.status, invitation.expiresAt, new Date());
  if (status === "expired") return Response.json({ error: "La invitación venció. Pide una nueva a quien te la envió.", code: "expired" }, { status: 410 });
  if (status !== "pending") return Response.json({ error: "Esta invitación ya fue usada o se canceló.", code: "used" }, { status: 410 });
  if (!invitation.club.isTemporary) return Response.json({ error: "Este equipo ya tiene delegado.", code: "official" }, { status: 410 });

  return Response.json({
    clubName: invitation.club.name,
    clubColor: invitation.club.color,
    clubLogoUrl: invitation.club.logoUrl,
    expiresAt: invitation.expiresAt,
    // Con correo: la invitación es para esa cuenta (se muestra enmascarado). Sin correo: es un enlace para compartir.
    emailHint: invitation.email ? maskEmail(invitation.email) : null,
  });
}
