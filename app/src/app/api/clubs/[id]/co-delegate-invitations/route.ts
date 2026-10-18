import { type NextRequest } from "next/server";
import { prisma } from "@/_lib/prisma";
import { badRequest, isAdmin, normalizeEmail, readJson, requireUser } from "@/_lib/auth";
import { enviarCorreo } from "@/_lib/email";
import { invitacionCoDelegado } from "@/_lib/email-templates";
import { newInviteToken } from "@/_lib/invite";
import { PROFILE_INVITE_DAYS } from "@/_lib/profile-invitation";
import { canDo, coDelegateSlotsLeft, MAX_CO_DELEGATES } from "@/_lib/club-delegate";
import { clubRoleFor, coDelegateUsage } from "@/_lib/club-delegate-server";

/**
 * Crea una invitación de co-delegado (especificación 014). La crea el delegado principal o un admin. Es un enlace secreto
 * que vale 7 días y se usa una vez; con `email` también se manda por correo y solo la acepta la cuenta con ese correo; sin
 * él es un enlace para compartir (por ejemplo por WhatsApp). Las invitaciones vigentes cuentan para el tope de 3
 * co-delegados, igual que los ya aceptados.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;
  const { id } = await params;

  const club = await prisma.club.findUnique({ where: { id }, select: { id: true, name: true, isTemporary: true, ownerId: true } });
  if (!club) return Response.json({ error: "Club no encontrado" }, { status: 404 });
  const role = await clubRoleFor(user.id, isAdmin(user), id);
  if (!canDo(role, "manage_delegates")) return Response.json({ error: "No tienes permiso para esta acción" }, { status: 403 });
  if (club.isTemporary) {
    return Response.json({ error: "Este equipo todavía no tiene delegado: no puede tener co-delegados" }, { status: 409 });
  }

  const body = (await readJson(request)) ?? {};
  const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
  const email = rawEmail ? normalizeEmail(rawEmail) : null;
  if (rawEmail && !email) return badRequest("El correo no es válido");

  const usage = await coDelegateUsage(id);
  if (coDelegateSlotsLeft(usage.accepted, usage.pending) === 0) {
    return Response.json(
      { error: `El equipo ya tiene el máximo de ${MAX_CO_DELEGATES} co-delegados entre los que tiene y las invitaciones vigentes`, code: "full" },
      { status: 409 }
    );
  }

  const invitation = await prisma.coDelegateInvitation.create({
    data: {
      clubId: id,
      email,
      token: newInviteToken(),
      invitedById: user.id,
      expiresAt: new Date(Date.now() + PROFILE_INVITE_DAYS * 86_400_000),
    },
    select: { id: true, token: true, email: true, expiresAt: true },
  });

  const url = `${request.nextUrl.origin}/delegado/co-delegado/${invitation.token}`;
  // Si el correo no sale (sin proveedor configurado, o falló), la invitación existe igual: el enlace se puede compartir a mano.
  const emailed = email
    ? await enviarCorreo({ to: email, ...invitacionCoDelegado({ clubName: club.name, inviterName: `${user.firstName} ${user.lastName}`.trim(), url, days: PROFILE_INVITE_DAYS }) })
    : null;

  return Response.json({ id: invitation.id, url, email: invitation.email, expiresAt: invitation.expiresAt, emailed }, { status: 201 });
}
