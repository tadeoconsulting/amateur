import { type NextRequest } from "next/server";
import { prisma } from "@/_lib/prisma";
import { badRequest, normalizeEmail, readJson, requireRole } from "@/_lib/auth";
import { enviarCorreo, type ResultadoCorreo } from "@/_lib/email";
import { invitacionDelegado } from "@/_lib/email-templates";
import { newInviteToken } from "@/_lib/invite";
import { effectiveStatus, PROFILE_INVITE_DAYS } from "@/_lib/profile-invitation";

// La invitación para que alguien sea el delegado de un equipo temporal (especificación 009, entrega 4). Solo un
// admin. Es un enlace secreto (con o sin correo) que vale 7 días y se usa una vez: el admin lo crea, lo reenvía, le
// cambia el correo o lo cancela. Quien lo recibe lo acepta en /delegado/invitacion/{token}.

const expiry = () => new Date(Date.now() + PROFILE_INVITE_DAYS * 86_400_000);
const linkFor = (request: NextRequest, token: string) => `${request.nextUrl.origin}/delegado/invitacion/${token}`;
const WHO = { select: { firstName: true, lastName: true, email: true } } as const;

async function adminAndTemporaryClub(id: string) {
  const auth = await requireRole(); // sin roles en la lista: solo pasa un ADMIN
  if ("response" in auth) return { response: auth.response };
  const club = await prisma.club.findUnique({ where: { id }, select: { id: true, name: true, isTemporary: true } });
  if (!club) return { response: Response.json({ error: "Club no encontrado" }, { status: 404 }) };
  if (!club.isTemporary) return { response: Response.json({ error: "Este equipo ya tiene delegado" }, { status: 409 }) };
  return { admin: auth.user, club };
}

async function send(request: NextRequest, admin: { firstName: string; lastName: string }, clubName: string, email: string, token: string): Promise<ResultadoCorreo> {
  return enviarCorreo({
    to: email,
    ...invitacionDelegado({ clubName, inviterName: `${admin.firstName} ${admin.lastName}`.trim(), url: linkFor(request, token), days: PROFILE_INVITE_DAYS }),
  });
}

type Row = { id: string; token: string; email: string | null; status: string; expiresAt: Date; acceptedAt: Date | null; acceptedBy: { firstName: string; lastName: string; email: string } | null };

const shape = (request: NextRequest, i: Row) => ({
  id: i.id,
  token: i.token,
  url: linkFor(request, i.token),
  email: i.email,
  status: effectiveStatus(i.status, i.expiresAt, new Date()),
  expiresAt: i.expiresAt,
  acceptedAt: i.acceptedAt,
  acceptedBy: i.acceptedBy ? { name: `${i.acceptedBy.firstName} ${i.acceptedBy.lastName}`, email: i.acceptedBy.email } : null,
});

const currentOf = (clubId: string) =>
  prisma.delegateInvitation.findFirst({
    where: { clubId, status: "pending" },
    orderBy: { createdAt: "desc" },
    include: { acceptedBy: WHO },
  });

/** La invitación vigente de este equipo (o `null`). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await adminAndTemporaryClub(id);
  if ("response" in ctx) return ctx.response;
  const invitation = await currentOf(id);
  return Response.json(invitation ? shape(request, invitation) : null);
}

/**
 * Crea una invitación nueva: reemplaza la que hubiera (su enlace deja de funcionar). Con `email` también manda el
 * correo; sin él solo se crea el enlace para compartir (por ejemplo por WhatsApp). Sirve para crear, para cambiar
 * el correo y para sacar un enlace nuevo si el anterior venció.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await adminAndTemporaryClub(id);
  if ("response" in ctx) return ctx.response;

  const body = (await readJson(request)) ?? {};
  const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
  const email = rawEmail ? normalizeEmail(rawEmail) : null;
  if (rawEmail && !email) return badRequest("El correo no es válido");

  try {
    const invitation = await prisma.$transaction(async (tx) => {
      await tx.delegateInvitation.updateMany({ where: { clubId: id, status: "pending" }, data: { status: "cancelled" } });
      return tx.delegateInvitation.create({
        data: { clubId: id, email, token: newInviteToken(), invitedBy: ctx.admin.id, expiresAt: expiry() },
        include: { acceptedBy: WHO },
      });
    });
    // Si el correo no sale (sin proveedor configurado, o falló), la invitación existe igual: el enlace se puede compartir a mano.
    const emailed = email ? await send(request, ctx.admin, ctx.club.name, email, invitation.token) : null;
    return Response.json({ ...shape(request, invitation), emailed }, { status: 201 });
  } catch (error) {
    console.error("Delegate invitation error:", error);
    return Response.json({ error: "No se pudo crear la invitación" }, { status: 500 });
  }
}

/** `{ action: "resend" }`: vuelve a mandar el correo con el mismo enlace y renueva los 7 días. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await adminAndTemporaryClub(id);
  if ("response" in ctx) return ctx.response;

  const body = await readJson(request);
  if (!body || body.action !== "resend") return badRequest('action debe ser "resend"');

  const invitation = await currentOf(id);
  if (!invitation) return Response.json({ error: "No hay una invitación vigente para reenviar" }, { status: 409 });
  if (!invitation.email) return badRequest("Esta invitación no tiene correo: comparte el enlace");

  const renewed = await prisma.delegateInvitation.update({ where: { id: invitation.id }, data: { expiresAt: expiry() }, include: { acceptedBy: WHO } });
  const emailed = await send(request, ctx.admin, ctx.club.name, invitation.email, invitation.token);
  return Response.json({ ...shape(request, renewed), emailed });
}

/** Cancela la invitación vigente: su enlace deja de funcionar. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await adminAndTemporaryClub(id);
  if ("response" in ctx) return ctx.response;
  await prisma.delegateInvitation.updateMany({ where: { clubId: id, status: "pending" }, data: { status: "cancelled" } });
  return Response.json({ success: true });
}
