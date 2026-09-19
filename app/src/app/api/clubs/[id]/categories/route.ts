import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const categories = await prisma.teamCategory.findMany({
    where: { clubId: id },
    include: { _count: { select: { players: true } } },
    orderBy: { name: "asc" },
  });

  return Response.json(
    categories.map((c) => ({
      id: c.id,
      name: c.name,
      gender: c.gender,
      ageType: c.ageType,
      maxAge: c.maxAge,
      minAge: c.minAge,
      playerCount: c._count.players,
    }))
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, gender, ageType, maxAge, minAge, dtId } = await request.json();

  if (!name || !gender) {
    return Response.json({ error: "name y gender requeridos" }, { status: 400 });
  }

  try {
    const category = await prisma.teamCategory.create({
      data: { name, gender, ageType, maxAge, minAge, clubId: id, dtId },
    });
    return Response.json(category, { status: 201 });
  } catch (error) {
    console.error("Create category error:", error);
    return Response.json({ error: "Error al crear categoría" }, { status: 500 });
  }
}
