import { prisma } from "@/_lib/prisma";

/**
 * ¿Hay otro partido del torneo a la misma hora con alguno de estos equipos o en la misma sede?
 * Un partido sin hora ("Por definir") no choca con nada, y uno sin equipos todavía (cuadro de
 * eliminación) no choca por equipo. `excludeId` deja afuera al partido que se está editando.
 */
export async function hasScheduleClash(opts: {
  tournamentId: string;
  excludeId?: string;
  date: Date;
  time: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  location: string;
}) {
  if (opts.time === "") return false;
  const teamIds = [opts.homeTeamId, opts.awayTeamId].filter((id): id is string => id !== null);
  const or = [
    ...(teamIds.length ? [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }] : []),
    ...(opts.location ? [{ location: opts.location }] : []),
  ];
  if (or.length === 0) return false;
  const clash = await prisma.match.findFirst({
    where: {
      tournamentId: opts.tournamentId,
      ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}),
      date: opts.date,
      time: opts.time,
      OR: or,
    },
    select: { id: true },
  });
  return clash !== null;
}

export const CLASH_MESSAGE = "Ese horario choca con otro partido del torneo (mismo equipo o misma sede)";
