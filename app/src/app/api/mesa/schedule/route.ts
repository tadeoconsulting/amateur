import { Role } from "@prisma/client";
import { prisma } from "@/_lib/prisma";
import { forbidden, requireUser } from "@/_lib/auth";
import { CLUB_REF_SELECT } from "@/_lib/club-public";
import { assignedTournaments, tournamentWindows } from "@/_lib/mesa-server";
import { nextWindow, windowOpenAt } from "@/_lib/mesa-window";

/**
 * El inicio de la mesa (especificación 011): sus torneos, si su ventana de acceso está abierta ahora y los partidos
 * del día de juego (el de la ventana abierta o, si está cerrada, el del próximo turno). Solo para una cuenta de mesa.
 */
export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!auth.user.roles.includes(Role.MESA)) return forbidden();

  const now = Date.now();
  const assigned = await assignedTournaments(auth.user.id);

  const tournaments = await Promise.all(
    assigned.map(async ({ tournament }) => {
      const windows = await tournamentWindows(tournament.id);
      const open = windowOpenAt(windows, now);
      const next = open ? null : nextWindow(windows, now);
      const shownDay = open?.day ?? next?.day ?? null;

      const matches = shownDay
        ? await prisma.match.findMany({
            where: { tournamentId: tournament.id, date: new Date(`${shownDay}T00:00:00Z`) },
            select: {
              id: true, time: true, status: true, period: true, homeScore: true, awayScore: true, matchday: true, location: true,
              homeTeam: { select: CLUB_REF_SELECT },
              awayTeam: { select: CLUB_REF_SELECT },
            },
            orderBy: [{ time: "asc" }],
          })
        : [];

      return {
        id: tournament.id,
        name: tournament.name,
        open: open !== null,
        window: open ? { day: open.day, opensAt: open.opensAt, closesAt: open.closesAt } : null,
        next: next ? { day: next.day, opensAt: next.opensAt } : null,
        day: shownDay,
        matches,
      };
    })
  );

  return Response.json({ now, tournaments });
}
