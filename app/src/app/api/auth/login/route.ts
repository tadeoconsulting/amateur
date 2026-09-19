import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { roles: true, playerProfile: true },
    });

    if (!user) {
      return Response.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    // In production, compare with bcrypt
    if (user.passwordHash !== `hashed_${password}`) {
      return Response.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    return Response.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      roles: user.roles.map((r) => r.role),
      hasPlayerProfile: !!user.playerProfile,
    });
  } catch (error) {
    console.error("Login error:", error);
    return Response.json({ error: "Error al iniciar sesión" }, { status: 500 });
  }
}
