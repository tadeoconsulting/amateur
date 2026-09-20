import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageClub, forbidden, pick, readJson, requireUser } from "@/_lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Requiere sesión: incluye teléfono y correo del dueño.
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

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

// ownerId no está: un club no cambia de dueño por acá.
const EDITABLE = ["name", "shortName", "logoUrl", "color", "delegadoNombre", "delegadoTel", "delegadoEmail"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!(await canManageClub(auth.user, id))) return forbidden();

  const body = await readJson(request);
  if (!body) return badRequest();

  const data: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(pick(body, EDITABLE))) {
    const required = key === "name" || key === "shortName";
    if (value === null ? required : typeof value !== "string" || (required && !value.trim())) {
      return badRequest(`${key} inválido`);
    }
    data[key] = value as string | null;
  }
  if (Object.keys(data).length === 0) return badRequest("No hay campos para actualizar");

  try {
    const club = await prisma.club.update({ where: { id }, data });
    return Response.json(club);
  } catch {
    return Response.json({ error: "Error al actualizar club" }, { status: 500 });
  }
}
