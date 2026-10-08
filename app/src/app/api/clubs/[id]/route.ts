import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageClub, forbidden, isAdmin, pick, readJson, requireUser } from "@/_lib/auth";
import { omitInviteToken } from "@/_lib/club-public";
import { shortNameError } from "@/_lib/short-name";
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

  // Cualquier sesión puede pedir un club por id: su link de invitación (secreto) no sale de acá.
  return Response.json(omitInviteToken(club));
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
  if (data.shortName !== undefined) {
    const shortError = shortNameError(data.shortName);
    if (shortError) return badRequest(shortError);
    data.shortName = (data.shortName as string).trim();
  }

  try {
    const club = await prisma.club.update({ where: { id }, data });
    return Response.json(omitInviteToken(club));
  } catch {
    return Response.json({ error: "Error al actualizar club" }, { status: 500 });
  }
}

/**
 * Elimina un equipo (solo un admin). Con partidos en algún torneo no se puede: borrarlo dejaría esos
 * partidos sin equipo y falsearía tablas y resultados; primero hay que eliminar el torneo o los
 * partidos. Sin partidos, el equipo se va con sus categorías, staff, invitaciones, solicitudes e
 * inscripciones, y sus jugadores quedan libres (sin equipo, con su ficha y su cuenta).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!isAdmin(auth.user)) return forbidden();

  const { id } = await params;
  const club = await prisma.club.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!club) return Response.json({ error: "Club no encontrado" }, { status: 404 });

  const matches = await prisma.match.findMany({
    where: { OR: [{ homeTeamId: id }, { awayTeamId: id }] },
    select: { tournament: { select: { name: true } } },
  });
  if (matches.length > 0) {
    const tournaments = [...new Set(matches.map((m) => m.tournament.name))];
    return Response.json(
      {
        error: `${club.name} tiene ${matches.length} ${matches.length === 1 ? "partido" : "partidos"} en ${tournaments.join(", ")}: elimina ese torneo o sus partidos antes de eliminar el equipo`,
      },
      { status: 409 }
    );
  }

  try {
    await prisma.club.delete({ where: { id } });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "No se pudo eliminar el equipo" }, { status: 409 });
  }
}
