import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const ownerId = request.nextUrl.searchParams.get("ownerId");
  const search = request.nextUrl.searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (ownerId) where.ownerId = ownerId;
  if (search) where.name = { contains: search, mode: "insensitive" };

  const clubs = await prisma.club.findMany({
    where,
    include: {
      _count: { select: { players: true, categories: true } },
      owner: { select: { firstName: true, lastName: true } },
    },
    orderBy: { name: "asc" },
  });

  return Response.json(
    clubs.map((c) => ({
      id: c.id,
      name: c.name,
      shortName: c.shortName,
      logoUrl: c.logoUrl,
      color: c.color,
      delegadoNombre: c.delegadoNombre,
      delegadoTel: c.delegadoTel,
      delegadoEmail: c.delegadoEmail,
      playerCount: c._count.players,
      categoriesCount: c._count.categories,
      owner: c.owner,
    }))
  );
}

export async function POST(request: NextRequest) {
  try {
    const { name, shortName, color, delegadoNombre, delegadoTel, delegadoEmail, ownerId } = await request.json();

    if (!name || !shortName || !ownerId) {
      return Response.json({ error: "name, shortName y ownerId requeridos" }, { status: 400 });
    }

    const club = await prisma.club.create({
      data: {
        name,
        shortName,
        color,
        delegadoNombre: delegadoNombre || null,
        delegadoTel: delegadoTel || null,
        delegadoEmail: delegadoEmail || null,
        ownerId,
      },
    });

    return Response.json(club, { status: 201 });
  } catch (error) {
    console.error("Create club error:", error);
    return Response.json({ error: "Error al crear club" }, { status: 500 });
  }
}
