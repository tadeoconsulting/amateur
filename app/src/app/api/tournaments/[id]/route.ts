import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { badRequest, canManageTournament, forbidden, getCurrentUser, isAdmin, readJson, requireUser } from "@/_lib/auth";
import { parseTournamentFields } from "@/_lib/tournament-input";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      organizer: { select: { id: true, firstName: true, lastName: true, organizerSlug: true } },
      teams: {
        include: {
          club: {
            select: { id: true, name: true, shortName: true, logoUrl: true, color: true, isTemporary: true, delegadoNombre: true },
          },
        },
        orderBy: { groupName: "asc" },
      },
      sponsors: { include: { sponsor: true }, orderBy: { createdAt: "asc" } },
      _count: { select: { matches: true, teams: true } },
    },
  });

  // Un torneo eliminado es como si no existiera, salvo para un admin (que lo restaura o lo elimina del todo).
  const viewer = tournament?.deletedAt ? await getCurrentUser() : null;
  if (!tournament || (tournament.deletedAt && !(viewer && isAdmin(viewer)))) {
    return Response.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  const matchesPlayed = await prisma.match.count({
    where: { tournamentId: id, status: "finalizado" },
  });

  const { sponsors, ...rest } = tournament;

  return Response.json({
    ...rest,
    sponsors: sponsors.map((s) => ({ id: s.sponsor.id, name: s.sponsor.name, logoUrl: s.sponsor.logoUrl, website: s.sponsor.website })),
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

  // El tipo de competencia define el fixture: con partidos ya armados no se cambia (habría que
  // deshacer el fixture primero). El resto de los datos del torneo se editan en cualquier estado.
  if (typeof parsed.data.format === "string") {
    const current = await prisma.tournament.findUnique({ where: { id }, select: { format: true, _count: { select: { matches: true } } } });
    if (current && current.format !== parsed.data.format && current._count.matches > 0) {
      return Response.json({ error: "El torneo ya tiene partidos: no se puede cambiar el tipo de competencia" }, { status: 409 });
    }
  }

  // Las llaves solo existen en una liga, y con el cuadro ya armado no se cambian.
  if (parsed.data.playoffTeams !== undefined || typeof parsed.data.format === "string") {
    const current = await prisma.tournament.findUnique({
      where: { id },
      select: { format: true, playoffTeams: true, matches: { where: { decisive: true }, select: { id: true }, take: 1 } },
    });
    if (current) {
      const format = typeof parsed.data.format === "string" ? parsed.data.format : current.format;
      const next = format === "liga" ? (parsed.data.playoffTeams !== undefined ? parsed.data.playoffTeams : current.playoffTeams) : null;
      if (next !== current.playoffTeams && current.matches.length > 0) {
        return Response.json({ error: "Las llaves ya están armadas: no se puede cambiar cuántos clasifican" }, { status: 409 });
      }
      (data as Record<string, unknown>).playoffTeams = next;
    }
  }

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

/**
 * Elimina un torneo. Por omisión **se oculta** (`deletedAt`): desaparece para organizador, clubes,
 * jugadores y público, y un admin puede restaurarlo con todo (equipos, partidos, resultados) desde
 * Admin → Torneos → Eliminados. Con `?permanent=1` (solo un admin, y solo de uno ya eliminado) se
 * borra de verdad, con sus inscripciones, solicitudes, partidos, resultados y estadísticas.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const permanent = request.nextUrl.searchParams.get("permanent") === "1";

  if (permanent) {
    if (!isAdmin(auth.user)) return forbidden();
    const current = await prisma.tournament.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!current) return Response.json({ error: "Torneo no encontrado" }, { status: 404 });
    if (!current.deletedAt) {
      return Response.json({ error: "Primero hay que eliminar el torneo: solo se elimina definitivamente uno que ya está en Eliminados" }, { status: 409 });
    }
    try {
      await prisma.tournament.delete({ where: { id } });
      return Response.json({ success: true });
    } catch {
      return Response.json({ error: "Error al eliminar el torneo" }, { status: 500 });
    }
  }

  if (!(await canManageTournament(auth.user, id))) return forbidden();
  try {
    await prisma.tournament.update({ where: { id }, data: { deletedAt: new Date() } });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Error al eliminar torneo" }, { status: 500 });
  }
}
