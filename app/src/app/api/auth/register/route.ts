import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import {
  badRequest,
  createSession,
  hashPassword,
  normalizeEmail,
  readJson,
  validatePassword,
} from "@/_lib/auth";
import { invitationProblem, joinClub, resolveInvitation, type ResolvedInvitation } from "@/_lib/invite";
import { isRealDate } from "@/_lib/fixture";

const str = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    if (!body) return badRequest();

    const email = normalizeEmail(body.email);
    const firstName = str(body.firstName);
    // El apellido puede venir vacío si la persona escribió una sola palabra como nombre.
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const clubToken = str(body.clubToken);
    const position = str(body.position);

    if (!email || !firstName) {
      return badRequest("Campos requeridos: email, firstName");
    }
    const passwordError = validatePassword(body.password);
    if (passwordError) return badRequest(passwordError);

    // new Date("2026-02-31") no falla: da el 3 de marzo. Se valida que el día exista y sea razonable.
    const birthDate = str(body.birthDate);
    if (birthDate && (!isRealDate(birthDate) || birthDate < "1900-01-01" || birthDate > new Date().toISOString().slice(0, 10))) {
      return badRequest("La fecha de nacimiento no es válida");
    }

    // Con un token de invitación (link del club o invitación por correo), se valida ANTES de crear
    // la cuenta: así un link vencido avisa en vez de dejar a la persona registrada sin club.
    let invitation: Extract<ResolvedInvitation, { ok: true }> | null = null;
    if (clubToken) {
      const resolved = await resolveInvitation(clubToken);
      if (!resolved.ok) return invitationProblem(resolved.reason);
      if (resolved.kind === "email" && normalizeEmail(resolved.invitation.email) !== email) {
        return badRequest("Esta invitación es para otro correo");
      }
      invitation = resolved;
    }

    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) {
      return Response.json({ error: "El correo ya está registrado" }, { status: 409 });
    }

    const passwordHash = await hashPassword(body.password as string);

    // El rol siempre es JUGADOR al registrarse. Otros roles se piden después con
    // /api/auth/roles, y ADMIN solo lo asigna otro admin.
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        dni: str(body.dni),
        phone: str(body.phone),
        gender: str(body.gender),
        department: str(body.department),
        birthDate: birthDate ? new Date(`${birthDate}T00:00:00Z`) : null,
        roles: { create: [{ role: "JUGADOR" }] },
      },
      include: { roles: true },
    });

    // Con una invitación válida, la persona entra al club al registrarse.
    if (invitation) {
      await joinClub(user.id, invitation.club.id, { position });
      if (invitation.kind === "email") {
        await prisma.playerInvitation.update({ where: { id: invitation.invitation.id }, data: { status: "accepted" } });
      }
    } else if (position) {
      await prisma.playerProfile.create({ data: { userId: user.id, position } });
    }

    await createSession(user.id);

    return Response.json(
      {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: null,
        roles: user.roles.map((r) => r.role),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return Response.json({ error: "Error al registrar usuario" }, { status: 500 });
  }
}
