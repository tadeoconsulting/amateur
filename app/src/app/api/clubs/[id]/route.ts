import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const club = await prisma.club.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      categories: { orderBy: { name: "asc" } },
      staffMembers: {
        include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
      },
      _count: { select: { players: true } },
    },
  });

  if (!club) {
    return Response.json({ error: "Club no encontrado" }, { status: 404 });
  }

  return Response.json(club);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  try {
    const club = await prisma.club.update({ where: { id }, data: body });
    return Response.json(club);
  } catch {
    return Response.json({ error: "Error al actualizar club" }, { status: 500 });
  }
}
