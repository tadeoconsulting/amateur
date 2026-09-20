import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { badRequest, canManageTournament, forbidden, readJson, requireUser } from "@/_lib/auth";
import { parseTournamentFields } from "@/_lib/tournament-input";

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
        include: {
          club: {
            select: { id: true, name: true, shortName: true, logoUrl: true, color: true, isTemporary: true, delegadoNombre: true },
          },
        },
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

// El organizador puede editar los campos que valida parseTournamentFields.
// organizerId no está entre ellos: un torneo no cambia de dueño por acá.
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

  const parsed = parseTournamentFields(body, "update");
  if ("error" in parsed) return badRequest(parsed.error);
  const data = parsed.data as Prisma.TournamentUpdateInput;

  // No se puede bajar el cupo por debajo de los equipos que ya están inscritos.
  if (typeof parsed.data.maxTeams === "number") {
    const enrolled = await prisma.tournamentTeam.count({ where: { tournamentId: id } });
    if (parsed.data.maxTeams < enrolled) {
      return badRequest(`Ya hay ${enrolled} equipos inscritos: maxTeams no puede ser menor`);
    }
  }

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
