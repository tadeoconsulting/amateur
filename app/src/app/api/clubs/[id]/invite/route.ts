import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageClub, forbidden, normalizeEmail, readJson, requireUser } from "@/_lib/auth";
import { INVITE_DAYS } from "@/_lib/invite";
import { enviarCorreo } from "@/_lib/email";
import { invitacionJugador } from "@/_lib/email-templates";

/** Manda el correo de una invitación a un jugador (nueva o reenviada). Nunca lanza. */
async function enviarInvitacionJugador(
  request: NextRequest,
  clubId: string,
  inviter: { firstName: string; lastName: string },
  email: string
) {
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { name: true } });
  return enviarCorreo({
    to: email,
    ...invitacionJugador({
      clubName: club?.name ?? "un club",
      inviterName: `${inviter.firstName} ${inviter.lastName}`.trim(),
      // Con la sesión cerrada, el proxy lo manda a iniciar sesión y vuelve acá.
      url: `${request.nextUrl.origin}/jugador/equipos`,
      days: INVITE_DAYS,
    }),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!(await canManageClub(auth.user, id))) return forbidden();

  const body = await readJson(request);

  // Se invita por correo, o por userId (jugador de la comunidad): así el buscador no necesita
  // mostrar el correo de nadie, y el servidor lo busca.
  let email = normalizeEmail(body?.email);
  if (!email && typeof body?.userId === "string") {
    const target = await prisma.user.findUnique({ where: { id: body.userId }, select: { email: true } });
    if (!target) return Response.json({ error: "Jugador no encontrado" }, { status: 404 });
    email = target.email.toLowerCase();
  }
  if (!email) {
    return badRequest("Indica el correo (email) o el jugador (userId)");
  }

  const alreadyMember = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, playerProfiles: { some: { clubId: id } } },
    select: { id: true },
  });
  if (alreadyMember) return Response.json({ error: "Ya es parte del club" }, { status: 409 });

  // Si ya tiene una invitación vigente a este club, se devuelve esa en vez de crear otra.
  const pending = await prisma.playerInvitation.findFirst({
    where: { clubId: id, email: { equals: email, mode: "insensitive" }, status: "pending", expiresAt: { gt: new Date() } },
  });
  if (pending) {
    // Igual que con el staff: volver a invitar reenvía el correo (la invitación pudo crearse antes
    // de que hubiera proveedor de correo).
    const emailed = (await enviarInvitacionJugador(request, id, auth.user, pending.email)) === "sent";
    return Response.json({ id: pending.id, token: pending.token, email: pending.email, expiresAt: pending.expiresAt, alreadyInvited: true, emailed });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_DAYS);

  try {
    // Quien invita es siempre el usuario de la sesión, no un valor enviado por el cliente.
    const invitation = await prisma.playerInvitation.create({
      data: { email, clubId: id, invitedBy: auth.user.id, expiresAt },
    });

    // El jugador ve la invitación en "Mis equipos" al entrar; el correo es el aviso. Si no sale
    // (sin proveedor configurado, o falló), la invitación existe igual.
    const result = await enviarInvitacionJugador(request, id, auth.user, email);

    return Response.json({
      id: invitation.id,
      token: invitation.token,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      emailed: result === "sent",
    }, { status: 201 });
  } catch (error) {
    console.error("Invite error:", error);
    return Response.json({ error: "Error al crear invitación" }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  // Los tokens de invitación son secretos: solo los ve quien gestiona el club.
  if (!(await canManageClub(auth.user, id))) return forbidden();

  const invitations = await prisma.playerInvitation.findMany({
    where: { clubId: id },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(invitations);
}
