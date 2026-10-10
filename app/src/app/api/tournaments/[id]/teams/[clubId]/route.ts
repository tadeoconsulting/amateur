import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageClub, canManageTournament, forbidden, getCurrentUser, isAdmin, readJson, requireUser } from "@/_lib/auth";
import { compareByLastName, isMinorOn, playerIdentity, publicName } from "@/_lib/player-identity";
import { OPEN_STATUSES } from "@/_lib/tournament-labels";

/**
 * La página pública de un club dentro de un torneo (`/{organizador}/{torneo}/equipo/{club}`): el club, su grupo y su
 * plantilla con los goles que lleva en este torneo. Público: nada de contacto del delegado, y de los jugadores solo
 * el nombre, la posición, el número y los goles —nunca el DNI ni la fecha de nacimiento—. Un menor de 18 sale con su
 * primer nombre y la inicial de su apellido ("Luigui F."), salvo para quien lo gestiona (un admin, el organizador del
 * torneo o el delegado del club), que lo ve completo. Los partidos y la tabla salen de sus lecturas públicas de siempre.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string; clubId: string }> }) {
  const { id, clubId } = await params;

  const enrollment = await prisma.tournamentTeam.findFirst({
    where: { tournamentId: id, clubId, tournament: { deletedAt: null } },
    select: {
      groupName: true,
      club: { select: { id: true, name: true, shortName: true, logoUrl: true, color: true, ownerId: true } },
      tournament: { select: { id: true, name: true, format: true, playoffTeams: true, slug: true, organizerId: true, organizer: { select: { organizerSlug: true } } } },
    },
  });
  if (!enrollment) return Response.json({ error: "Este equipo no juega en este torneo" }, { status: 404 });
  const { club, tournament } = enrollment;

  const viewer = await getCurrentUser();
  const seesFull = viewer !== null && (isAdmin(viewer) || viewer.id === tournament.organizerId || viewer.id === club.ownerId);
  const today = new Date().toISOString().slice(0, 10);

  const profiles = await prisma.playerProfile.findMany({
    where: { clubId, status: { notIn: ["en_espera", "inactivo"] } },
    include: {
      user: { select: { firstName: true, lastName: true, birthDate: true } },
      stats: { where: { tournamentId: id }, select: { goals: true } },
    },
  });
  const players = profiles
    .map((p) => ({ p, who: playerIdentity(p) }))
    .sort((a, b) => compareByLastName(a.who, b.who))
    .map(({ p, who }) => ({
      id: p.id,
      name: publicName(who, !seesFull && isMinorOn(who.birthDate, today)),
      position: p.position,
      number: p.number,
      goals: p.stats.reduce((sum, s) => sum + s.goals, 0),
    }));

  return Response.json({
    club: { id: club.id, name: club.name, shortName: club.shortName, logoUrl: club.logoUrl, color: club.color },
    groupName: enrollment.groupName,
    tournament: { id: tournament.id, name: tournament.name, format: tournament.format, playoffTeams: tournament.playoffTeams, slug: tournament.slug, organizerSlug: tournament.organizer.organizerSlug },
    players,
  });
}

/**
 * Asigna (o quita) el grupo de un equipo ya inscrito — lo pide el formato "grupos" (y la fase
 * de grupos de "copa") antes de poder armar el fixture: ver `planFixture` en `_lib/fixture.ts`.
 * Solo el organizador del torneo, y solo mientras las inscripciones siguen abiertas.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; clubId: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id, clubId } = await params;
  if (!(await canManageTournament(auth.user, id))) return forbidden();

  const tournament = await prisma.tournament.findUnique({ where: { id }, select: { status: true } });
  if (!tournament) return Response.json({ error: "Torneo no encontrado" }, { status: 404 });
  if (!OPEN_STATUSES.includes(tournament.status)) {
    return Response.json({ error: "El torneo ya empezó: no se pueden cambiar los grupos" }, { status: 409 });
  }

  const body = await readJson(request);
  if (!body || (body.groupName !== null && typeof body.groupName !== "string")) {
    return badRequest("groupName inválido");
  }
  const groupName = typeof body.groupName === "string" ? body.groupName.trim() || null : null;

  const { count } = await prisma.tournamentTeam.updateMany({ where: { tournamentId: id, clubId }, data: { groupName } });
  if (count === 0) return Response.json({ error: "El equipo no está inscrito en este torneo" }, { status: 404 });

  return Response.json({ success: true, groupName });
}

// Quita un equipo del torneo. Lo hace el organizador (o un admin), o el dueño del
// club para retirar el suyo.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; clubId: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const { id, clubId } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { status: true, organizerId: true },
  });
  if (!tournament) {
    return Response.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  const isOrganizer = isAdmin(user) || tournament.organizerId === user.id;
  if (!isOrganizer && !(await canManageClub(user, clubId))) return forbidden();

  if (!OPEN_STATUSES.includes(tournament.status)) {
    return Response.json({ error: "El torneo ya empezó: no se pueden quitar equipos" }, { status: 409 });
  }

  const matches = await prisma.match.count({
    where: { tournamentId: id, OR: [{ homeTeamId: clubId }, { awayTeamId: clubId }] },
  });
  if (matches > 0) {
    return Response.json({ error: "El equipo ya tiene partidos programados en este torneo" }, { status: 409 });
  }

  const { count } = await prisma.tournamentTeam.deleteMany({ where: { tournamentId: id, clubId } });
  if (count === 0) {
    return Response.json({ error: "El equipo no está inscrito en este torneo" }, { status: 404 });
  }

  // Un equipo temporal existe solo para este torneo: al quitarlo se borra también.
  // Si ya tiene jugadores u otros datos asociados se conserva (la base lo impide).
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { isTemporary: true } });
  if (club?.isTemporary) {
    const otherEnrollments = await prisma.tournamentTeam.count({ where: { clubId } });
    if (otherEnrollments === 0) {
      await prisma.club.delete({ where: { id: clubId } }).catch(() => {});
    }
  }

  return Response.json({ success: true });
}
