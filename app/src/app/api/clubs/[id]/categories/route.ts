import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageClub, forbidden, readJson, requireUser } from "@/_lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

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
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!(await canManageClub(auth.user, id))) return forbidden();

  const body = await readJson(request);
  if (!body) return badRequest();
  const { name, gender, ageType, maxAge, minAge, dtId } = body;

  if (typeof name !== "string" || !name.trim() || typeof gender !== "string" || !gender) {
    return badRequest("name y gender requeridos");
  }

  // El DT tiene que ser del staff de este mismo club.
  if (typeof dtId === "string" && dtId) {
    const staff = await prisma.staffMember.findFirst({ where: { id: dtId, clubId: id }, select: { id: true } });
    if (!staff) return badRequest("El DT no pertenece al staff de este club");
  }

  try {
    const category = await prisma.teamCategory.create({
      data: {
        name: name.trim(),
        gender,
        ageType: typeof ageType === "string" ? ageType : null,
        maxAge: Number.isInteger(maxAge) ? (maxAge as number) : null,
        minAge: Number.isInteger(minAge) ? (minAge as number) : null,
        clubId: id,
        dtId: typeof dtId === "string" && dtId ? dtId : null,
      },
    });
    return Response.json(category, { status: 201 });
  } catch (error) {
    console.error("Create category error:", error);
    return Response.json({ error: "Error al crear categoría" }, { status: 500 });
  }
}
