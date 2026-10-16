import { type NextRequest } from "next/server";
import { findSeason, seasonGeneral } from "@/_lib/season-server";

/**
 * Tabla General de la temporada: Apertura y Clausura sumados, sin llaves ni fase final. Con `live=1`
 * suma los partidos que se están jugando, como la tabla de un torneo.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const season = await findSeason(id);
  if (!season) return Response.json({ error: "Temporada no encontrada" }, { status: 404 });
  return Response.json(await seasonGeneral(season, request.nextUrl.searchParams.get("live") === "1"));
}
