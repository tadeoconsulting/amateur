import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageClub, forbidden, isAdmin, readJson, requireUser } from "@/_lib/auth";
import { EnrollmentError, isUniqueViolation, withOpenTournament } from "@/_lib/enrollment";

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
 * Inscribe directo solo el organizador del torneo (o un admin), y solo equipos temporales,
 * suyos o de un admin. Un club de otro dueño entra por invitación y un dueño entra por
 * solicitud: ver /api/tournaments/:id/requests y la especificación 006.
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
    select: { id: true, organizerId: true },
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

    try {
      const enrollment = await withOpenTournament(id, async (tx) => {
        const club = await tx.club.create({
          data: { name, shortName, color: typeof color === "string" ? color : null, ownerId: user.id, isTemporary: true },
        });
        return tx.tournamentTeam.create({
          data: { tournamentId: id, clubId: club.id, groupName },
          include: { club: true },
        });
      });
      return Response.json(enrollment, { status: 201 });
    } catch (error) {
      return enrollmentFailure(error);
    }
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

  if (!isOrganizer) {
    if (!(await canManageClub(user, clubId))) return forbidden();
    // Un dueño no se inscribe solo: solicita y el organizador decide.
    return Response.json(
      { error: "Solicita unirte al torneo: el organizador debe aprobar la inscripción", code: "request_required" },
      { status: 403 }
    );
  }
  // El organizador no mete a un club de otro dueño sin su consentimiento: lo invita.
  if (!club.isTemporary && club.ownerId !== user.id && !isAdmin(user)) {
    return Response.json(
      { error: "Invita al equipo: su dueño debe aceptar la invitación", code: "invite_required" },
      { status: 403 }
    );
  }

  try {
    const enrollment = await withOpenTournament(id, (tx) =>
      tx.tournamentTeam.create({ data: { tournamentId: id, clubId, groupName }, include: { club: true } })
    );
    return Response.json(enrollment, { status: 201 });
  } catch (error) {
    return enrollmentFailure(error);
  }
}

function enrollmentFailure(error: unknown) {
  if (error instanceof EnrollmentError) return Response.json({ error: error.message }, { status: error.status });
  if (isUniqueViolation(error)) return Response.json({ error: "El equipo ya está inscrito" }, { status: 409 });
  throw error;
}
