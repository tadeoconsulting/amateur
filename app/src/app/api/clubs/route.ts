import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, isAdmin, readJson, requireRole, requireUser } from "@/_lib/auth";

export async function GET(request: NextRequest) {
  // Requiere sesión: el listado incluye los datos de contacto del delegado.
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const ownerId = request.nextUrl.searchParams.get("ownerId");
  const search = request.nextUrl.searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (ownerId) where.ownerId = ownerId;
  if (search) where.name = { contains: search, mode: "insensitive" };
  // Los equipos temporales son de quien los creó: solo él los ve, y no salen en la
  // búsqueda de equipos de la comunidad.
  if (!(ownerId && ownerId === auth.user.id)) where.isTemporary = false;

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
      ownerId: c.ownerId,
      playerCount: c._count.players,
      categoriesCount: c._count.categories,
      owner: c.owner,
    }))
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("CLUB_OWNER");
  if ("response" in auth) return auth.response;
  const { user } = auth;

  try {
    const body = await readJson(request);
    if (!body) return badRequest();

    const { name, shortName, color, delegadoNombre, delegadoTel, delegadoEmail } = body;

    if (typeof name !== "string" || !name.trim() || typeof shortName !== "string" || !shortName.trim()) {
      return badRequest("name y shortName requeridos");
    }

    // El dueño del club es quien lo crea. Solo un admin puede crearlo a nombre de otro.
    const ownerId = isAdmin(user) && typeof body.ownerId === "string" ? body.ownerId : user.id;

    const club = await prisma.club.create({
      data: {
        name: name.trim(),
        shortName: shortName.trim(),
        color: typeof color === "string" ? color : null,
        delegadoNombre: typeof delegadoNombre === "string" && delegadoNombre ? delegadoNombre : null,
        delegadoTel: typeof delegadoTel === "string" && delegadoTel ? delegadoTel : null,
        delegadoEmail: typeof delegadoEmail === "string" && delegadoEmail ? delegadoEmail : null,
        ownerId,
      },
    });

    return Response.json(club, { status: 201 });
  } catch (error) {
    console.error("Create club error:", error);
    return Response.json({ error: "Error al crear club" }, { status: 500 });
  }
}
