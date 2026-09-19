import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, dni, phone, position, birthDate, gender, department, clubToken } = body;

    if (!email || !password || !firstName || !lastName) {
      return Response.json({ error: "Campos requeridos: email, password, firstName, lastName" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return Response.json({ error: "El correo ya está registrado" }, { status: 409 });
    }

    // In production, hash with bcrypt. Placeholder for MVP.
    const passwordHash = `hashed_${password}`;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        dni,
        phone,
        gender,
        department,
        birthDate: birthDate ? new Date(birthDate) : null,
        roles: { create: [{ role: "JUGADOR" }] },
      },
      include: { roles: true },
    });

    // If registering via club invitation token, link player to club
    if (clubToken) {
      const invitation = await prisma.playerInvitation.findUnique({
        where: { token: clubToken },
      });

      if (invitation && invitation.status === "pending" && invitation.expiresAt > new Date()) {
        await prisma.playerProfile.create({
          data: {
            userId: user.id,
            clubId: invitation.clubId,
            position: position || null,
          },
        });

        await prisma.playerInvitation.update({
          where: { id: invitation.id },
          data: { status: "accepted" },
        });
      }
    } else if (position) {
      await prisma.playerProfile.create({
        data: { userId: user.id, position },
      });
    }

    return Response.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles.map((r) => r.role),
    }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return Response.json({ error: "Error al registrar usuario" }, { status: 500 });
  }
}
