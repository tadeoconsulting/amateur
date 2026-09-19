import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
  const { id } = await params;
  const body = await request.json();

  const { firstName, lastName, phone, avatarUrl, gender, department, birthDate, position } = body;

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(gender && { gender }),
        ...(department && { department }),
        ...(birthDate && { birthDate: new Date(birthDate) }),
      },
    });

    if (position) {
      await prisma.playerProfile.upsert({
        where: { userId: id },
        update: { position },
        create: { userId: id, position },
      });
    }

    if (body.roles && Array.isArray(body.roles)) {
      await prisma.userRole.deleteMany({ where: { userId: id } });
      await prisma.userRole.createMany({
        data: body.roles.map((role: string) => ({ userId: id, role })),
      });
    }

    const updated = await prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    });

    return Response.json({
      ...user,
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
  const { id } = await params;

  try {
    await prisma.user.delete({ where: { id } });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Error al eliminar usuario" }, { status: 500 });
  }
}
