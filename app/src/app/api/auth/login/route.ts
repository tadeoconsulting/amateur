import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, createSession, normalizeEmail, readJson, verifyPassword } from "@/_lib/auth";
import { ADMIN_USE_OWN_LOGIN_MESSAGE } from "@/_lib/admin-roles";

export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return badRequest("Email y contraseña requeridos");
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      include: { roles: true, playerProfiles: { select: { id: true } } },
    });

    // Siempre se hace la comparación, exista o no el usuario, y el error es el mismo.
    const valid = await verifyPassword(password, user?.passwordHash);
    if (!user || !valid) {
      return Response.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
    }

    // Los administradores no entran por el login público: tienen el suyo (/admin/login). Se dice
    // recién con la clave correcta, para no confirmar a cualquiera qué correos son de admin.
    if (user.roles.some((r) => r.role === "ADMIN")) {
      return Response.json({ error: ADMIN_USE_OWN_LOGIN_MESSAGE }, { status: 403 });
    }

    await createSession(user.id);

    return Response.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      organization: user.organization,
      roles: user.roles.map((r) => r.role),
      hasPlayerProfile: user.playerProfiles.length > 0,
    });
  } catch (error) {
    console.error("Login error:", error);
    return Response.json({ error: "Error al iniciar sesión" }, { status: 500 });
  }
}
