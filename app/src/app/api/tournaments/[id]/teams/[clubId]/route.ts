import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { canManageClub, forbidden, isAdmin, requireUser } from "@/_lib/auth";
import { OPEN_STATUSES } from "@/_lib/tournament-labels";

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
