import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const categoryId = request.nextUrl.searchParams.get("categoryId");

  const players = await prisma.playerProfile.findMany({
    where: { clubId: id, ...(categoryId ? { categoryId } : {}) },
    include: {
      user: { select: { firstName: true, lastName: true, avatarUrl: true, birthDate: true } },
      category: { select: { name: true } },
    },
    orderBy: { user: { lastName: "asc" } },
  });

  return Response.json(
    players.map((p) => ({
      id: p.id,
      firstName: p.user.firstName,
      lastName: p.user.lastName,
      avatarUrl: p.user.avatarUrl,
      position: p.position,
      number: p.number,
      status: p.status,
      categoryName: p.category?.name,
      birthDate: p.user.birthDate,
    }))
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId, position, number, categoryId } = await request.json();

  if (!userId) {
    return Response.json({ error: "userId requerido" }, { status: 400 });
  }

  try {
    const profile = await prisma.playerProfile.upsert({
      where: { userId },
      update: { clubId: id, position, number, categoryId },
      create: { userId, clubId: id, position, number, categoryId },
    });
    return Response.json(profile, { status: 201 });
  } catch (error) {
    console.error("Add player error:", error);
    return Response.json({ error: "Error al agregar jugador" }, { status: 500 });
  }
}
