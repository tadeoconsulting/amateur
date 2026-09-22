import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { requireUser } from "@/_lib/auth";

/**
 * Solicitudes e invitaciones **pendientes** de los clubes de quien tiene la sesión,
 * con el resumen del torneo. Es lo que llena la pestaña Solicitudes del club.
 * Filtro opcional: ?tournamentId=
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const tournamentId = request.nextUrl.searchParams.get("tournamentId");
  const rows = await prisma.tournamentRequest.findMany({
    where: {
      status: "pending",
      club: { ownerId: auth.user.id },
      ...(tournamentId ? { tournamentId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      kind: true,
      status: true,
      createdAt: true,
      club: { select: { id: true, name: true, shortName: true, color: true } },
      tournament: {
        select: {
          id: true,
          name: true,
          category: true,
          startDate: true,
          location: true,
          format: true,
          modality: true,
          status: true,
          maxTeams: true,
          _count: { select: { teams: true } },
          organizer: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  return Response.json(
    rows.map(({ tournament, ...row }) => ({
      ...row,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        category: tournament.category,
        startDate: tournament.startDate,
        location: tournament.location,
        format: tournament.format,
        modality: tournament.modality,
        status: tournament.status,
        maxTeams: tournament.maxTeams,
        teamsCount: tournament._count.teams,
        organizer: tournament.organizer,
      },
    }))
  );
}
