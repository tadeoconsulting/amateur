import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { getCurrentUser } from "@/_lib/auth";
import { sumScorers } from "@/_lib/season";
import { findSeason } from "@/_lib/season-server";
import { SCORER_PLAYER_INCLUDE, scorerRows } from "@/_lib/scorers-server";
import { isPublicRead, publicCacheHeaders } from "@/_lib/public-cache";

/**
 * Goleador general: los goles de cada jugador sumados en todos los torneos de la temporada, fase final
 * incluida (decisión D). Se suma por ficha: si un jugador cambió de club entre fases, sale dos veces.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Con `?pub=1` (pantallas públicas, que se guardan en la caché de borde) la lista es la misma para todos: la pública,
  // con los menores abreviados, sin mirar quién la pide. Sin `pub`, como siempre: quien gestiona ve los nombres completos.
  const pub = isPublicRead(request.url);
  const [season, viewer] = await Promise.all([findSeason(id), pub ? null : getCurrentUser()]);
  if (!season) return Response.json({ error: "Temporada no encontrada" }, { status: 404 });

  // Sin filtrar por goles: los partidos de un torneo en que no marcó también cuentan en `matchesPlayed`.
  const stats = await prisma.playerStats.findMany({
    where: { tournamentId: { in: season.tournaments.map((t) => t.id) } },
    include: SCORER_PLAYER_INCLUDE,
  });
  return Response.json(scorerRows(sumScorers(stats), season.organizerId, viewer), { headers: publicCacheHeaders(request.url) });
}
