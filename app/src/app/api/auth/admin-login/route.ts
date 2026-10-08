import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, createSession, normalizeEmail, readJson, verifyPassword } from "@/_lib/auth";

/**
 * Login del panel de administración (/admin/login). Solo abre sesión a una cuenta con rol ADMIN:
 * con otra, aunque la clave sea correcta, no se crea ninguna sesión. El mensaje de "no es de
 * administrador" se da recién con la clave correcta, para no revelar qué correos son de admin.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password) return badRequest("Email y contraseña requeridos");

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      include: { roles: true },
    });

    const valid = await verifyPassword(password, user?.passwordHash);
    if (!user || !valid) {
      return Response.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
    }
    if (!user.roles.some((r) => r.role === "ADMIN")) {
      return Response.json({ error: "Esta cuenta no es de administrador" }, { status: 403 });
    }

    await createSession(user.id);

    return Response.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      roles: user.roles.map((r) => r.role),
      hasPlayerProfile: false,
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return Response.json({ error: "Error al iniciar sesión" }, { status: 500 });
  }
}
