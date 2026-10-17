import { type NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/_lib/prisma";
import { createSession, getCurrentUser, hashPassword, isAdmin, normalizeEmail, readJson, unauthorized, validatePassword } from "@/_lib/auth";
import { checkDelegateAccept, signupEmail } from "@/_lib/delegate-invitation";
import { makeClubOfficial, OfficializeConflict } from "@/_lib/club-official-server";
import { sendWelcomeEmail } from "@/_lib/welcome-email";

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/**
 * Acepta una invitación a ser delegado de un equipo temporal (especificación 009, entrega 4). La cuenta de quien la
 * acepta pasa a ser dueña del equipo, que deja de ser temporal (lo mismo que hace "Oficializar"). El equipo sigue
 * inscrito en sus torneos. Un enlace se usa una sola vez: si dos personas lo abren a la vez, solo una lo consigue.
 *
 * - **Con sesión:** acepta con esa cuenta (cuerpo vacío).
 * - **Sin sesión:** crea la cuenta en el mismo paso, con `{ firstName, lastName, password }`. El correo es el de la
 *   invitación; si el enlace no lleva correo (para compartir) hay que mandarlo en `email`. Así quien recibe el correo
 *   puede poner su contraseña sin pasar antes por un registro aparte. Si ese correo ya tiene cuenta, responde `409`
 *   con `code: "account_exists"`: tiene que iniciar sesión.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const viewer = await getCurrentUser();
  const body = (await readJson(request)) ?? {};
  // Sin sesión solo se puede aceptar creando la cuenta; sin datos para crearla, es como antes: hay que iniciar sesión.
  if (!viewer && body.password === undefined && body.firstName === undefined) return unauthorized();

  const { token } = await params;
  const invitation = token && token.length <= 100
    ? await prisma.delegateInvitation.findUnique({
        where: { token },
        select: { id: true, clubId: true, status: true, email: true, expiresAt: true, club: { select: { name: true, isTemporary: true } } },
      })
    : null;
  if (!invitation) return Response.json({ error: "La invitación no existe o fue cancelada" }, { status: 404 });

  // ─── Con sesión: acepta con esa cuenta ───
  if (viewer) {
    const ownedClubs = await prisma.club.count({ where: { ownerId: viewer.id } });
    const check = checkDelegateAccept({
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      now: new Date(),
      email: invitation.email,
      sessionEmail: viewer.email,
      sessionIsAdmin: isAdmin(viewer),
      sessionOwnedClubs: ownedClubs,
      clubIsTemporary: invitation.club.isTemporary,
    });
    if (!check.ok) return Response.json({ error: check.message, code: check.code }, { status: check.status });
    return accept(invitation, viewer.id);
  }

  // ─── Sin sesión: crea la cuenta y acepta ───
  const email = signupEmail(invitation.email, normalizeEmail(body.email));
  const firstName = text(body.firstName);
  // El apellido puede venir vacío si la persona escribió una sola palabra como nombre (como en el registro).
  const lastName = text(body.lastName);
  if (!email) return Response.json({ error: "Escribe tu correo", code: "invalid" }, { status: 400 });
  if (!firstName) return Response.json({ error: "Escribe tu nombre", code: "invalid" }, { status: 400 });
  const passwordError = validatePassword(body.password);
  if (passwordError) return Response.json({ error: passwordError, code: "invalid" }, { status: 400 });

  // Una cuenta nueva no es administradora ni dirige otro equipo: solo importa que la invitación siga vigente.
  const check = checkDelegateAccept({
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    now: new Date(),
    email: invitation.email,
    sessionEmail: email,
    sessionIsAdmin: false,
    sessionOwnedClubs: 0,
    clubIsTemporary: invitation.club.isTemporary,
  });
  if (!check.ok) return Response.json({ error: check.message, code: check.code }, { status: check.status });

  const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
  if (existing) {
    return Response.json(
      { error: "Ya existe una cuenta con ese correo. Inicia sesión para aceptar la invitación.", code: "account_exists" },
      { status: 409 }
    );
  }

  let userId: string;
  try {
    const user = await prisma.user.create({
      data: { email, passwordHash: await hashPassword(body.password as string), firstName, lastName, roles: { create: [{ role: Role.CLUB_OWNER }] } },
      select: { id: true },
    });
    userId = user.id;
  } catch (error) {
    // Dos pedidos con el mismo correo a la vez: el segundo choca con el índice único.
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") {
      return Response.json({ error: "Ya existe una cuenta con ese correo. Inicia sesión para aceptar la invitación.", code: "account_exists" }, { status: 409 });
    }
    console.error("Create delegate account error:", error);
    return Response.json({ error: "No se pudo crear la cuenta. Inténtalo de nuevo." }, { status: 500 });
  }

  const accepted = await accept(invitation, userId);
  if (accepted.ok) {
    await createSession(userId);
    // La cuenta se creó acá, sin pasar por el registro: se le da la bienvenida igual (como delegado).
    sendWelcomeEmail({ email, firstName, roles: [Role.CLUB_OWNER] }, request.nextUrl.origin);
    return accepted;
  }
  // La invitación se usó mientras tanto: no se deja una cuenta suelta que la persona no pidió.
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  return accepted;
}

async function accept(invitation: { id: string; clubId: string; club: { name: string } }, userId: string) {
  try {
    await makeClubOfficial(invitation.clubId, userId, { acceptInvitationId: invitation.id });
    return Response.json({ status: "accepted", clubName: invitation.club.name });
  } catch (error) {
    if (error instanceof OfficializeConflict) {
      return Response.json({ error: "Esta invitación ya fue usada o se canceló.", code: "used" }, { status: 410 });
    }
    console.error("Accept delegate invitation error:", error);
    return Response.json({ error: "No se pudo completar. Inténtalo de nuevo." }, { status: 500 });
  }
}
