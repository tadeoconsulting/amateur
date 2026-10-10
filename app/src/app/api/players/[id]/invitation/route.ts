import { type NextRequest } from "next/server";
import { prisma } from "@/_lib/prisma";
import { badRequest, forbidden, isAdmin, normalizeEmail, readJson, requireUser } from "@/_lib/auth";
import { enviarCorreo, type ResultadoCorreo } from "@/_lib/email";
import { invitacionPerfil } from "@/_lib/email-templates";
import { newInviteToken } from "@/_lib/invite";
import { effectiveStatus, PROFILE_INVITE_DAYS } from "@/_lib/profile-invitation";

// Las invitaciones para reclamar un perfil provisional (especificación 009, entrega 3). Solo un admin.
// Una invitación es un enlace secreto (con o sin correo) que vale 7 días: el admin la crea, la reenvía, le
// cambia el correo o la cancela. Quien la recibe la acepta en /jugador/invitacion/perfil/{token}.

const ACTIVE = ["pending", "review", "locked"];

const expiry = () => new Date(Date.now() + PROFILE_INVITE_DAYS * 86_400_000);
const linkFor = (request: NextRequest, token: string) => `${request.nextUrl.origin}/jugador/invitacion/perfil/${token}`;

async function adminAndProvisional(id: string) {
  const auth = await requireUser();
  if ("response" in auth) return { response: auth.response };
  if (!isAdmin(auth.user)) return { response: forbidden() };
  const profile = await prisma.playerProfile.findUnique({
    where: { id },
    select: { id: true, userId: true, firstName: true, lastName: true, club: { select: { name: true } } },
  });
  if (!profile) return { response: Response.json({ error: "Jugador no encontrado" }, { status: 404 }) };
  if (profile.userId !== null) return { response: Response.json({ error: "Este jugador ya tiene cuenta" }, { status: 409 }) };
  return { admin: auth.user, profile };
}

async function send(request: NextRequest, admin: { firstName: string; lastName: string }, profile: { firstName: string | null; lastName: string | null; club: { name: string } | null }, email: string, token: string): Promise<ResultadoCorreo> {
  return enviarCorreo({
    to: email,
    ...invitacionPerfil({
      playerName: `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim(),
      clubName: profile.club?.name ?? "un equipo",
      inviterName: `${admin.firstName} ${admin.lastName}`.trim(),
      url: linkFor(request, token),
      days: PROFILE_INVITE_DAYS,
    }),
  });
}

const shape = (request: NextRequest, i: { id: string; token: string; email: string | null; status: string; attempts: number; expiresAt: Date; acceptedBy: { firstName: string; lastName: string; email: string } | null }) => ({
  id: i.id,
  token: i.token,
  url: linkFor(request, i.token),
  email: i.email,
  status: effectiveStatus(i.status, i.expiresAt, new Date()),
  attempts: i.attempts,
  expiresAt: i.expiresAt,
  acceptedBy: i.acceptedBy ? { name: `${i.acceptedBy.firstName} ${i.acceptedBy.lastName}`, email: i.acceptedBy.email } : null,
});

const activeOf = (profileId: string) =>
  prisma.profileInvitation.findFirst({
    where: { profileId, status: { in: ACTIVE } },
    orderBy: { createdAt: "desc" },
    include: { acceptedBy: { select: { firstName: true, lastName: true, email: true } } },
  });

/** La invitación vigente de este perfil (o `null`). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await adminAndProvisional(id);
  if ("response" in ctx) return ctx.response;
  const invitation = await activeOf(id);
  return Response.json(invitation ? shape(request, invitation) : null);
}

/**
 * Crea una invitación nueva: reemplaza la que hubiera (su enlace deja de funcionar). Con `email` también manda el
 * correo; sin él solo se crea el enlace para compartir (por ejemplo por WhatsApp). Sirve para crear, para cambiar
 * el correo y para sacar un enlace nuevo si el anterior se bloqueó.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await adminAndProvisional(id);
  if ("response" in ctx) return ctx.response;

  const body = (await readJson(request)) ?? {};
  const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
  const email = rawEmail ? normalizeEmail(rawEmail) : null;
  if (rawEmail && !email) return badRequest("El correo no es válido");

  try {
    const invitation = await prisma.$transaction(async (tx) => {
      await tx.profileInvitation.updateMany({ where: { profileId: id, status: { in: ACTIVE } }, data: { status: "cancelled" } });
      return tx.profileInvitation.create({
        data: { profileId: id, email, token: newInviteToken(), invitedBy: ctx.admin.id, expiresAt: expiry() },
        include: { acceptedBy: { select: { firstName: true, lastName: true, email: true } } },
      });
    });
    // Si el correo no sale (sin proveedor configurado, o falló), la invitación existe igual: el enlace se puede compartir a mano.
    const emailed = email ? await send(request, ctx.admin, ctx.profile, email, invitation.token) : null;
    return Response.json({ ...shape(request, invitation), emailed }, { status: 201 });
  } catch (error) {
    console.error("Profile invitation error:", error);
    return Response.json({ error: "No se pudo crear la invitación" }, { status: 500 });
  }
}

/** `{ action: "resend" }`: vuelve a mandar el correo con el mismo enlace y renueva los 7 días. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await adminAndProvisional(id);
  if ("response" in ctx) return ctx.response;

  const body = await readJson(request);
  if (!body || body.action !== "resend") return badRequest('action debe ser "resend"');

  const invitation = await activeOf(id);
  if (!invitation || invitation.status !== "pending") return Response.json({ error: "No hay una invitación vigente para reenviar" }, { status: 409 });
  if (!invitation.email) return badRequest("Esta invitación no tiene correo: comparte el enlace");

  const renewed = await prisma.profileInvitation.update({
    where: { id: invitation.id },
    data: { expiresAt: expiry() },
    include: { acceptedBy: { select: { firstName: true, lastName: true, email: true } } },
  });
  const emailed = await send(request, ctx.admin, ctx.profile, invitation.email, invitation.token);
  return Response.json({ ...shape(request, renewed), emailed });
}

/** Cancela la invitación vigente: su enlace deja de funcionar. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await adminAndProvisional(id);
  if ("response" in ctx) return ctx.response;
  await prisma.profileInvitation.updateMany({ where: { profileId: id, status: { in: ACTIVE } }, data: { status: "cancelled" } });
  return Response.json({ success: true });
}
