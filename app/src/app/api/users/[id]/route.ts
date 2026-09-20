import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { badRequest, forbidden, isAdmin, readJson, requireUser } from "@/_lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  // El perfil completo (con correo, teléfono, etc.) es del propio usuario o de un admin.
  if (auth.user.id !== id && !isAdmin(auth.user)) return forbidden();

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      roles: true,
      playerProfile: { include: { club: true, category: true, stats: true } },
      ownedClubs: true,
    },
  });

  if (!user) {
    return Response.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  return Response.json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    gender: user.gender,
    department: user.department,
    birthDate: user.birthDate,
    roles: user.roles.map((r) => r.role),
    playerProfile: user.playerProfile,
    ownedClubs: user.ownedClubs,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user: actor } = auth;

  const { id } = await params;
  const admin = isAdmin(actor);
  if (actor.id !== id && !admin) return forbidden();

  const body = await readJson(request);
  if (!body) return badRequest();

  const { firstName, lastName, phone, avatarUrl, gender, department, birthDate, position } = body;

  // Los roles los cambia solo un admin (para uno mismo se usa /api/auth/roles).
  let newRoles: Role[] | null = null;
  if (body.roles !== undefined) {
    if (!admin) return forbidden();
    const valid = Object.values(Role) as string[];
    if (!Array.isArray(body.roles) || !body.roles.every((r) => typeof r === "string" && valid.includes(r))) {
      return badRequest("roles inválidos");
    }
    newRoles = body.roles as Role[];
    if (newRoles.length === 0) return badRequest("Debe tener al menos un rol");
    // Evita que un admin se quite el rol a sí mismo por accidente y se quede sin acceso.
    if (actor.id === id && !newRoles.includes(Role.ADMIN)) {
      return badRequest("No puedes quitarte el rol ADMIN a ti mismo");
    }
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(typeof firstName === "string" && firstName && { firstName }),
        ...(typeof lastName === "string" && lastName && { lastName }),
        ...(phone !== undefined && { phone: phone as string | null }),
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl as string | null }),
        ...(typeof gender === "string" && gender && { gender }),
        ...(typeof department === "string" && department && { department }),
        ...(typeof birthDate === "string" && birthDate && { birthDate: new Date(birthDate) }),
      },
    });

    if (typeof position === "string" && position) {
      await prisma.playerProfile.upsert({
        where: { userId: id },
        update: { position },
        create: { userId: id, position },
      });
    }

    if (newRoles) {
      await prisma.$transaction([
        prisma.userRole.deleteMany({ where: { userId: id } }),
        prisma.userRole.createMany({ data: newRoles.map((role) => ({ userId: id, role })) }),
      ]);
    }

    const updated = await prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    });

    // No se devuelve passwordHash.
    return Response.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      gender: user.gender,
      department: user.department,
      birthDate: user.birthDate,
      roles: updated?.roles.map((r) => r.role) ?? [],
    });
  } catch {
    return Response.json({ error: "Error al actualizar usuario" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (auth.user.id !== id && !isAdmin(auth.user)) return forbidden();

  try {
    await prisma.user.delete({ where: { id } });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "No se pudo eliminar: el usuario tiene datos asociados" }, { status: 409 });
  }
}
