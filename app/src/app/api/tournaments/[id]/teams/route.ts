import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageClub, forbidden, isAdmin, readJson, requireUser } from "@/_lib/auth";
import { OPEN_STATUSES } from "@/_lib/tournament-labels";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const teams = await prisma.tournamentTeam.findMany({
    where: { tournamentId: id },
    include: {
      club: {
        select: {
          id: true,
          name: true,
          shortName: true,
          logoUrl: true,
          color: true,
          isTemporary: true,
          delegadoNombre: true,
          _count: { select: { players: true } },
        },
      },
    },
    orderBy: { groupName: "asc" },
  });

  return Response.json(teams);
}

/**
 * Inscribe un equipo en el torneo. Dos formas:
 *   { clubId, groupName? }                      un club que ya existe
 *   { newClub: { name, shortName, color? } }    crea un equipo temporal y lo inscribe
 *
 * Inscribe el organizador del torneo (o un admin); el dueño de un club también puede
 * inscribir el suyo. Solo el organizador puede crear equipos temporales.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const { id } = await params;
  const body = await readJson(request);
  if (!body) return badRequest();

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { id: true, status: true, maxTeams: true, organizerId: true, _count: { select: { teams: true } } },
  });
  if (!tournament) {
    return Response.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  const isOrganizer = isAdmin(user) || tournament.organizerId === user.id;
  const groupName = typeof body.groupName === "string" && body.groupName ? body.groupName : null;

  // Equipo temporal: se crea y se inscribe en un solo paso.
  if (body.newClub !== undefined) {
    if (!isOrganizer) return forbidden();

    const input = body.newClub as Record<string, unknown> | null;
    const name = typeof input?.name === "string" ? input.name.trim() : "";
    const shortName = typeof input?.shortName === "string" ? input.shortName.trim() : "";
    const color = input?.color;
    if (!name || name.length > 80) return badRequest("El nombre del equipo debe tener entre 1 y 80 caracteres");
    if (!shortName || shortName.length > 12) return badRequest("El nombre corto debe tener entre 1 y 12 caracteres");
    if (color !== undefined && color !== null && (typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color))) {
      return badRequest("color debe tener formato #RRGGBB");
    }

    if (!OPEN_STATUSES.includes(tournament.status)) {
      return Response.json({ error: "El torneo ya empezó: no se pueden agregar equipos" }, { status: 409 });
    }
    if (tournament._count.teams >= tournament.maxTeams) {
      return Response.json({ error: "El torneo ya tiene todos sus equipos" }, { status: 409 });
    }

    const enrollment = await prisma.$transaction(async (tx) => {
      const club = await tx.club.create({
        data: { name, shortName, color: typeof color === "string" ? color : null, ownerId: user.id, isTemporary: true },
      });
      return tx.tournamentTeam.create({
        data: { tournamentId: id, clubId: club.id, groupName },
        include: { club: true },
      });
    });
    return Response.json(enrollment, { status: 201 });
  }

  // Club que ya existe.
  const clubId = body.clubId;
  if (typeof clubId !== "string" || !clubId) {
    return badRequest("clubId requerido");
  }

  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { id: true, ownerId: true, isTemporary: true } });
  if (!club) {
    return Response.json({ error: "Club no encontrado" }, { status: 404 });
  }
  // Un equipo temporal es de quien lo creó: nadie más puede inscribirlo en otro torneo.
  if (club.isTemporary && club.ownerId !== user.id && !isAdmin(user)) {
    return forbidden();
  }

  if (!isOrganizer && !(await canManageClub(user, clubId))) return forbidden();

  if (!OPEN_STATUSES.includes(tournament.status)) {
    return Response.json({ error: "El torneo ya empezó: no se pueden agregar equipos" }, { status: 409 });
  }
  if (tournament._count.teams >= tournament.maxTeams) {
    return Response.json({ error: "El torneo ya tiene todos sus equipos" }, { status: 409 });
  }

  try {
    const enrollment = await prisma.tournamentTeam.create({
      data: { tournamentId: id, clubId, groupName },
      include: { club: true },
    });
    return Response.json(enrollment, { status: 201 });
  } catch {
    return Response.json({ error: "El equipo ya está inscrito" }, { status: 409 });
  }
}
