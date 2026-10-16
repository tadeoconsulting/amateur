import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, forbidden, pick, readJson, requireUser } from "@/_lib/auth";
import { parseTournamentFields } from "@/_lib/tournament-input";
import { defaultClausuraName } from "@/_lib/season";
import { SEASON_SELECT, canManageSeason, createSeasonTournament, findSeason, seasonSummary, stageOf } from "@/_lib/season-server";

/**
 * Crea el Clausura de la temporada: una liga con la configuración y los equipos de la Apertura, que tiene
 * que estar terminada (decisión C).
 *
 *   { startDate, name?, location? }
 *
 * El nombre por omisión es "Clausura" y el año de la Apertura. Después se genera el fixture como siempre.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const season = await findSeason(id);
  if (!season) return Response.json({ error: "Temporada no encontrada" }, { status: 404 });
  if (!canManageSeason(auth.user, season)) return forbidden();

  const apertura = stageOf(season, "apertura");
  if (!apertura) return Response.json({ error: "La temporada no tiene Apertura" }, { status: 409 });
  if (stageOf(season, "clausura")) return Response.json({ error: "La temporada ya tiene Clausura" }, { status: 409 });
  if (apertura.status !== "finalizado") {
    return Response.json({ error: "El Clausura se crea cuando termina la Apertura" }, { status: 409 });
  }

  const body = await readJson(request);
  if (!body) return badRequest();
  if (body.startDate === undefined) return badRequest("Falta startDate");
  const parsed = parseTournamentFields(pick(body, ["name", "startDate", "location"]), "update");
  if ("error" in parsed) return badRequest(parsed.error);

  const teams = await prisma.tournamentTeam.findMany({ where: { tournamentId: apertura.id }, select: { clubId: true }, orderBy: { enrolledAt: "asc" } });
  const tournament = await createSeasonTournament({
    season,
    stage: "clausura",
    from: apertura.id,
    name: (parsed.data.name as string | undefined) ?? defaultClausuraName(apertura.startDate),
    startDate: parsed.data.startDate as Date,
    location: parsed.data.location as string | undefined,
    format: "liga",
    clubIds: teams.map((t) => t.clubId),
  });
  if ("error" in tournament) return Response.json({ error: tournament.error }, { status: 409 });

  const updated = await prisma.season.findUniqueOrThrow({ where: { id }, select: SEASON_SELECT });
  return Response.json({ tournamentId: tournament.id, season: await seasonSummary(updated) }, { status: 201 });
}
