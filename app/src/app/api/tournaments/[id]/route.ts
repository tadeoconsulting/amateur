import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageTournament, forbidden, pick, readJson, requireUser } from "@/_lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      organizer: { select: { id: true, firstName: true, lastName: true } },
      teams: {
        include: { club: { select: { id: true, name: true, shortName: true, logoUrl: true } } },
        orderBy: { groupName: "asc" },
      },
      _count: { select: { matches: true, teams: true } },
    },
  });

  if (!tournament) {
    return Response.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  const matchesPlayed = await prisma.match.count({
    where: { tournamentId: id, status: "finalizado" },
  });

  return Response.json({
    ...tournament,
    matchesPlayed,
    totalMatches: tournament._count.matches,
  });
}

// Campos que el organizador puede editar. organizerId no está: un torneo no cambia de dueño por acá.
const EDITABLE = ["name", "format", "status", "sportType", "maxTeams", "minTeams", "startDate", "endDate", "location", "category"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!(await canManageTournament(auth.user, id))) return forbidden();

  const body = await readJson(request);
  if (!body) return badRequest();

  const data: Record<string, unknown> = pick(body, EDITABLE);
  for (const key of ["startDate", "endDate"] as const) {
    if (data[key] !== undefined && data[key] !== null) {
      const date = new Date(data[key] as string);
      if (Number.isNaN(date.getTime())) return badRequest(`${key} no es una fecha válida`);
      data[key] = date;
    }
  }
  if (Object.keys(data).length === 0) return badRequest("No hay campos para actualizar");

  try {
    const tournament = await prisma.tournament.update({ where: { id }, data });
    return Response.json(tournament);
  } catch {
    return Response.json({ error: "Error al actualizar torneo" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!(await canManageTournament(auth.user, id))) return forbidden();

  try {
    await prisma.tournament.delete({ where: { id } });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Error al eliminar torneo" }, { status: 500 });
  }
}
