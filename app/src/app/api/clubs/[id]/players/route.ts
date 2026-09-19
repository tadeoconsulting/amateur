import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageClub, forbidden, readJson, requireUser } from "@/_lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

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

  // La fecha de nacimiento es dato personal (puede ser de menores): solo la ve quien gestiona el club.
  const canSeeBirthDate = await canManageClub(auth.user, id);

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
      birthDate: canSeeBirthDate ? p.user.birthDate : null,
    }))
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!(await canManageClub(auth.user, id))) return forbidden();

  const body = await readJson(request);
  if (!body) return badRequest();
  const { userId, position, number, categoryId } = body;

  if (typeof userId !== "string" || !userId) {
    return badRequest("userId requerido");
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) {
    return Response.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // La categoría tiene que ser de este mismo club.
  if (typeof categoryId === "string" && categoryId) {
    const category = await prisma.teamCategory.findFirst({ where: { id: categoryId, clubId: id }, select: { id: true } });
    if (!category) return badRequest("La categoría no pertenece a este club");
  }

  const data = {
    clubId: id,
    position: typeof position === "string" ? position : null,
    number: Number.isInteger(number) ? (number as number) : null,
    categoryId: typeof categoryId === "string" && categoryId ? categoryId : null,
  };

  try {
    const profile = await prisma.playerProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
    return Response.json(profile, { status: 201 });
  } catch (error) {
    console.error("Add player error:", error);
    return Response.json({ error: "Error al agregar jugador" }, { status: 500 });
  }
}
