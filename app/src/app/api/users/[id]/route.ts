import { prisma } from "@/_lib/prisma";
import { adminRolesError } from "@/_lib/admin-roles";
import { type NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { badRequest, forbidden, isAdmin, readJson, requireUser } from "@/_lib/auth";
import { resolveActiveClubId } from "@/_lib/player-clubs";

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
      // Una ficha por club donde juega (puede ser más de uno). El join con el torneo (nombre) es para
      // el perfil del propio jugador (goles, tarjetas y partidos por torneo). club/category van con
      // `select` (no `include: true`): un include crudo del club traería también su inviteToken,
      // que es secreto (cualquiera con el link se une solo).
      playerProfiles: {
        orderBy: { createdAt: "asc" },
        include: {
          club: { select: { id: true, name: true, shortName: true, color: true, logoUrl: true } },
          category: { select: { id: true, name: true, gender: true } },
          stats: { include: { tournament: { select: { id: true, name: true } } } },
        },
      },
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
    organization: user.organization,
    roles: user.roles.map((r) => r.role),
    playerProfiles: user.playerProfiles,
    // El equipo con el que sale hoy (el que eligió, o el más antiguo): ver resolveActiveClubId.
    activeClubId: resolveActiveClubId(user.playerProfiles, user.activeClubId),
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

  const { firstName, lastName, phone, avatarUrl, gender, department, birthDate, organization, position, activeClubId } = body;

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
    const mixed = adminRolesError(newRoles);
    if (mixed) return badRequest(mixed);
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
        ...(organization !== undefined && { organization: organization as string | null }),
      },
    });

    // La posición es de la persona: se aplica a todas sus fichas (una por club), o se crea una ficha
    // libre si todavía no tiene ninguna.
    if (typeof position === "string" && position) {
      const updated = await prisma.playerProfile.updateMany({ where: { userId: id }, data: { position } });
      if (updated.count === 0) await prisma.playerProfile.create({ data: { userId: id, position } });
    }

    // Con qué equipo sale a la cancha: tiene que ser uno de sus equipos (o null para volver al
    // más antiguo).
    if (activeClubId !== undefined) {
      if (activeClubId !== null && typeof activeClubId !== "string") return badRequest("activeClubId inválido");
      if (activeClubId) {
        const member = await prisma.playerProfile.findFirst({ where: { userId: id, clubId: activeClubId }, select: { id: true } });
        if (!member) return badRequest("Ese no es uno de tus equipos");
      }
      await prisma.user.update({ where: { id }, data: { activeClubId } });
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
