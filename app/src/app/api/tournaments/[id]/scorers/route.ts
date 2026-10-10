import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { getCurrentUser, isAdmin } from "@/_lib/auth";
import { isMinorOn, playerIdentity, publicName } from "@/_lib/player-identity";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [tournament, viewer] = await Promise.all([
    prisma.tournament.findUnique({ where: { id }, select: { organizerId: true } }),
    getCurrentUser(),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  const stats = await prisma.playerStats.findMany({
    where: { tournamentId: id, goals: { gt: 0 } },
    include: {
      player: {
        include: {
          user: { select: { firstName: true, lastName: true, avatarUrl: true, birthDate: true } },
          club: { select: { name: true, shortName: true, ownerId: true } },
        },
      },
    },
    orderBy: { goals: "desc" },
  });

  return Response.json(
    stats.map((s, i) => {
      const who = playerIdentity(s.player);
      // Un menor de 18 sale abreviado ("Luigui F.") salvo para quien lo gestiona: un admin, el organizador o el delegado de su club.
      const manages = viewer !== null && (isAdmin(viewer) || viewer.id === tournament?.organizerId || viewer.id === s.player.club?.ownerId);
      const hide = !manages && isMinorOn(who.birthDate, today);
      const name = publicName(who, hide);
      return {
        position: i + 1,
        playerId: s.playerId,
        clubId: s.player.clubId,
        // Abreviado, el apellido va dentro de `firstName` y `lastName` queda vacío: así ninguna pantalla puede recomponer el nombre.
        firstName: hide ? name : who.firstName,
        lastName: hide ? "" : who.lastName,
        // Su foto tampoco se publica si es menor.
        avatarUrl: hide ? null : who.avatarUrl,
        // Su puesto en la cancha, si lo tiene (no se muestra si está vacío). `position` ya es el lugar en la tabla.
        playerPosition: s.player.position,
        clubName: s.player.club?.name ?? "Sin equipo",
        goals: s.goals,
        matchesPlayed: s.matchesPlayed,
      };
    })
  );
}
