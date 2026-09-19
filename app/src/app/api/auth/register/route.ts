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
        birthDate: str(body.birthDate) ? new Date(str(body.birthDate) as string) : null,
        roles: { create: [{ role: "JUGADOR" }] },
      },
      include: { roles: true },
    });

    // Si se registra con un token de invitación de un club, se vincula al club.
    if (clubToken) {
      const invitation = await prisma.playerInvitation.findUnique({ where: { token: clubToken } });

      if (invitation && invitation.status === "pending" && invitation.expiresAt > new Date()) {
        await prisma.playerProfile.create({
          data: { userId: user.id, clubId: invitation.clubId, position },
        });
        await prisma.playerInvitation.update({
          where: { id: invitation.id },
          data: { status: "accepted" },
        });
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
