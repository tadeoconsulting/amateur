import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { Role } from "@prisma/client";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search");
  const role = request.nextUrl.searchParams.get("role");

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (role) {
    where.roles = { some: { role } };
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
  });

  return Response.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      avatarUrl: u.avatarUrl,
      gender: u.gender,
      department: u.department,
      birthDate: u.birthDate,
      organization: u.organization,
      createdAt: u.createdAt,
      roles: u.roles.map((r) => r.role),
      ownedClubs: u.ownedClubs,
      playerProfile: u.playerProfile
        ? {
            id: u.playerProfile.id,
            position: u.playerProfile.position,
            club: u.playerProfile.club,
          }
        : null,
      tournamentsCount: u._count.tournaments,
    }))
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, lastName, dni, phone, gender, department, birthDate, organization, roles, player } = body;

    if (!email || !firstName || !lastName) {
      return Response.json(
        { error: "email, firstName y lastName son requeridos" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return Response.json({ error: "El correo ya está registrado" }, { status: 409 });
    }

    const validRoles = Object.values(Role);
    const userRoles = (roles ?? ["JUGADOR"]).filter((r: string) =>
      validRoles.includes(r as Role)
    ) as Role[];

    const createData: Record<string, unknown> = {
      email,
      passwordHash: `hashed_temp_${Date.now()}`,
      firstName,
      lastName,
      dni: dni || null,
      phone: phone || null,
      gender: gender || null,
      department: department || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      organization: organization || null,
      roles: { create: userRoles.map((role: Role) => ({ role })) },
    };

    if (userRoles.includes(Role.JUGADOR) && player) {
      createData.playerProfile = {
        create: {
          position: player.position || null,
          number: player.number ? Number(player.number) : null,
          clubId: player.clubId || null,
        },
      };
    }

    const user = await prisma.user.create({
      data: createData as Parameters<typeof prisma.user.create>[0]["data"],
      include: { roles: true, playerProfile: true },
    });

    return Response.json(
      {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles.map((r: { role: Role }) => r.role),
        playerProfile: user.playerProfile,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin create user error:", error);
    return Response.json({ error: "Error al crear usuario" }, { status: 500 });
  }
}
