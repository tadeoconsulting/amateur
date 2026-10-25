import { prisma } from "@/_lib/prisma";
import { requireRole } from "@/_lib/auth";
import { groupTeams } from "@/_lib/admin-teams";

/**
 * Los equipos inscritos en los torneos de la plataforma (Admin → Torneos → Equipos), cada uno una sola vez con los
 * torneos donde juega y su organizador. Solo un admin. Solo lectura y solo lo necesario para mirar: el escudo, el nombre,
 * si es oficial o temporal y cuántos jugadores tiene; nada del contacto del delegado. Los torneos eliminados no cuentan.
 */
export async function GET() {
  // Sin roles en la lista: solo pasa un ADMIN.
  const auth = await requireRole();
  if ("response" in auth) return auth.response;

  const enrollments = await prisma.tournamentTeam.findMany({
    where: { tournament: { deletedAt: null } },
    select: {
      club: { select: { id: true, name: true, shortName: true, logoUrl: true, color: true, isTemporary: true, _count: { select: { players: true } } } },
      tournament: { select: { id: true, name: true, status: true, organizerId: true, organizer: { select: { firstName: true, lastName: true } } } },
    },
  });

  return Response.json(
    groupTeams(
      enrollments.map(({ club, tournament }) => ({
        club: { id: club.id, name: club.name, shortName: club.shortName, logoUrl: club.logoUrl, color: club.color, isTemporary: club.isTemporary, playerCount: club._count.players },
        tournament: {
          id: tournament.id,
          name: tournament.name,
          status: tournament.status,
          organizerId: tournament.organizerId,
          organizerName: `${tournament.organizer.firstName} ${tournament.organizer.lastName}`.trim(),
        },
      }))
    )
  );
}
