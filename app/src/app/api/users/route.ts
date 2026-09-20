import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { Role } from "@prisma/client";
import {
  badRequest,
  hashPassword,
  isAdmin,
  normalizeEmail,
  readJson,
  requireRole,
  requireUser,
  validatePassword,
} from "@/_lib/auth";

const NON_ADMIN_SEARCH_MIN = 2;
const NON_ADMIN_MAX_RESULTS = 25;

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const admin = isAdmin(auth.user);

  const search = request.nextUrl.searchParams.get("search")?.trim();
  const roleParam = request.nextUrl.searchParams.get("role");

  // Los buscadores de jugadores y delegados usan este endpoint sin ser admin: necesitan
  // encontrar gente por nombre, pero no volcar la base de usuarios completa.
  if (!admin && (!search || search.length < NON_ADMIN_SEARCH_MIN)) {
    return Response.json([]);
  }

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      ...(admin ? [{ email: { contains: search, mode: "insensitive" } }] : []),
    ];
  }

  if (roleParam && (Object.values(Role) as string[]).includes(roleParam)) {
    where.roles = { some: { role: roleParam } };
  }

  const users = await prisma.user.findMany({
    where,
    include: {
      roles: true,
      ownedClubs: { select: { id: true, name: true } },
      playerProfile: { include: { club: { select: { id: true, name: true } } } },
      _count: { select: { tournaments: true } },
    },
    orderBy: { createdAt: "desc" },
    ...(admin ? {} : { take: NON_ADMIN_MAX_RESULTS }),
  });

  return Response.json(
    users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      avatarUrl: u.avatarUrl,
      roles: u.roles.map((r) => r.role),
      playerProfile: u.playerProfile
        ? {
            id: u.playerProfile.id,
            position: u.playerProfile.position,
            club: u.playerProfile.club,
          }
        : null,
      // Datos personales y de contacto: solo para admins.
      ...(admin && {
        email: u.email,
        phone: u.phone,
        gender: u.gender,
        department: u.department,
        birthDate: u.birthDate,
        organization: u.organization,
        createdAt: u.createdAt,
        ownedClubs: u.ownedClubs,
        tournamentsCount: u._count.tournaments,
      }),
    }))
  );
}

// Crear usuarios a mano es cosa de admins (panel /admin/usuarios).
export async function POST(request: NextRequest) {
  const auth = await requireRole();
  if ("response" in auth) return auth.response;

  try {
    const body = await readJson(request);
    if (!body) return badRequest();

    const { firstName, lastName, dni, phone, gender, department, birthDate, organization, roles, player } = body;
    const email = normalizeEmail(body.email);

    if (!email || typeof firstName !== "string" || !firstName.trim() || typeof lastName !== "string" || !lastName.trim()) {
      return badRequest("email, firstName y lastName son requeridos");
    }

    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) {
      return Response.json({ error: "El correo ya está registrado" }, { status: 409 });
    }

    // Si el admin no define contraseña se genera una temporal y se devuelve una sola vez.
    let temporaryPassword: string | undefined;
    let password = body.password;
    if (password === undefined || password === "") {
      temporaryPassword = randomBytes(12).toString("base64url");
      password = temporaryPassword;
    }
    const passwordError = validatePassword(password);
    if (passwordError) return badRequest(passwordError);

    const validRoles = Object.values(Role) as string[];
    const requestedRoles = Array.isArray(roles) ? roles : ["JUGADOR"];
    const userRoles = requestedRoles.filter((r): r is Role => typeof r === "string" && validRoles.includes(r));
    if (userRoles.length === 0) return badRequest("Debe tener al menos un rol válido");

    const playerData = player && typeof player === "object" ? (player as Record<string, unknown>) : null;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password as string),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dni: typeof dni === "string" && dni ? dni : null,
        phone: typeof phone === "string" && phone ? phone : null,
        gender: typeof gender === "string" && gender ? gender : null,
        department: typeof department === "string" && department ? department : null,
        birthDate: typeof birthDate === "string" && birthDate ? new Date(birthDate) : null,
        organization: typeof organization === "string" && organization ? organization : null,
        roles: { create: userRoles.map((role) => ({ role })) },
        ...(userRoles.includes(Role.JUGADOR) && playerData
          ? {
              playerProfile: {
                create: {
                  position: typeof playerData.position === "string" ? playerData.position : null,
                  number: playerData.number ? Number(playerData.number) : null,
                  clubId: typeof playerData.clubId === "string" && playerData.clubId ? playerData.clubId : null,
                },
              },
            }
          : {}),
      },
      include: { roles: true, playerProfile: true },
    });

    return Response.json(
      {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles.map((r) => r.role),
        playerProfile: user.playerProfile,
        ...(temporaryPassword && { temporaryPassword }),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin create user error:", error);
    return Response.json({ error: "Error al crear usuario" }, { status: 500 });
  }
}
