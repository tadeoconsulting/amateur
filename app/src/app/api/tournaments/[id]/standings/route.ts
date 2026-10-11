import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { computeLiveStandings } from "@/_lib/standings";
import { matchClock } from "@/_lib/match-live";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const group = request.nextUrl.searchParams.get("group");

  const teams = await prisma.tournamentTeam.findMany({
    where: { tournamentId: id, ...(group ? { groupName: group } : {}) },
    include: { club: true },
  });

  // En una liga con llaves, los partidos del cuadro no cuentan para la tabla: la tabla es la de
  // la fase de liga, la que decidió quién clasificó.
  const tournament = await prisma.tournament.findUnique({ where: { id }, select: { format: true, minutesPerHalf: true } });
  // Con `live=1` (lo piden las pantallas que se muestran a la gente) la tabla suma además los partidos que se están
  // jugando, con el marcador de este momento, como si terminaran así: es una proyección, no se guarda nada y al
  // finalizar queda igual que la oficial. Sin `live`, solo cuentan los finalizados.
  const live = request.nextUrl.searchParams.get("live") === "1";
  const matches = await prisma.match.findMany({
    where: {
      tournamentId: id,
      status: live ? { in: ["finalizado", "en_curso"] } : "finalizado",
      ...(tournament?.format === "liga" ? { decisive: false } : {}),
      ...(group ? { groupName: group } : {}),
    },
    select: { status: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true, startedAt: true, period: true, firstHalfEndedAt: true, secondHalfStartedAt: true },
  });
  // Un partido que quedó "en curso" sin que nadie lo finalizara (se da por olvidado, ver matchClock) no mueve la tabla.
  const now = Date.now();
  const inPlay = matches.filter((m) => m.status === "en_curso" && !matchClock(m, now, tournament?.minutesPerHalf).stale);

  const rows = computeLiveStandings(
    teams.map((t) => ({ clubId: t.clubId, groupName: t.groupName })),
    matches.filter((m) => m.status === "finalizado"),
    inPlay
  );

  const club = new Map(teams.map((t) => [t.clubId, t.club]));
  return Response.json(
    rows.map((row) => ({
      ...row,
      clubName: club.get(row.clubId)?.name ?? "",
      shortName: club.get(row.clubId)?.shortName ?? "",
      logoUrl: club.get(row.clubId)?.logoUrl ?? null,
      color: club.get(row.clubId)?.color ?? null,
    }))
  );
}
