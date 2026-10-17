import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { getCurrentUser } from "@/_lib/auth";
import { SCORER_PLAYER_INCLUDE, scorerRows } from "@/_lib/scorers-server";
import { isPublicRead, publicCacheHeaders } from "@/_lib/public-cache";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Con `?pub=1` (pantallas públicas, que se guardan en la caché de borde) la lista es la misma para todos: la pública,
  // con los menores abreviados, sin mirar quién la pide. Sin `pub`, como siempre: quien gestiona ve los nombres completos.
  const [tournament, viewer] = await Promise.all([
    prisma.tournament.findUnique({ where: { id }, select: { organizerId: true } }),
    isPublicRead(request.url) ? null : getCurrentUser(),
  ]);

  const stats = await prisma.playerStats.findMany({
    where: { tournamentId: id, goals: { gt: 0 } },
    include: SCORER_PLAYER_INCLUDE,
    orderBy: { goals: "desc" },
  });

  return Response.json(scorerRows(stats, tournament?.organizerId, viewer), { headers: publicCacheHeaders(request.url) });
}
