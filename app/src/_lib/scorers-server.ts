import type { Prisma } from "@prisma/client";
import { isAdmin, type CurrentUser } from "./auth";
import { isMinorOn, playerIdentity, publicName } from "./player-identity";

/** Lo que hace falta de cada ficha para mostrarla en una tabla de goleadores. */
export const SCORER_PLAYER_INCLUDE = {
  player: {
    include: {
      user: { select: { firstName: true, lastName: true, avatarUrl: true, birthDate: true } },
      club: { select: { name: true, shortName: true, ownerId: true } },
    },
  },
} satisfies Prisma.PlayerStatsInclude;

export type ScorerStatRow = Prisma.PlayerStatsGetPayload<{ include: typeof SCORER_PLAYER_INCLUDE }>;

/**
 * Las filas públicas de una tabla de goleadores, en el orden recibido. La usan la del torneo y la general
 * de una temporada (especificación 012), así que las dos esconden igual a los menores.
 */
export function scorerRows(stats: readonly ScorerStatRow[], organizerId: string | undefined, viewer: CurrentUser | null) {
  const today = new Date().toISOString().slice(0, 10);
  return stats.map((s, i) => {
    const who = playerIdentity(s.player);
    // Un menor de 18 sale abreviado ("Luigui F.") salvo para quien lo gestiona: un admin, el organizador o el delegado de su club.
    const manages = viewer !== null && (isAdmin(viewer) || viewer.id === organizerId || viewer.id === s.player.club?.ownerId);
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
  });
}
