import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, forbidden, pick, readJson, requireUser } from "@/_lib/auth";
import { parseTournamentFields } from "@/_lib/tournament-input";
import { seedLeagueBracket } from "@/_lib/fixture";
import { defaultFinalName } from "@/_lib/season";
import { SEASON_SELECT, canManageSeason, createSeasonTournament, findSeason, seasonGeneral, seasonSummary, stageOf } from "@/_lib/season-server";

/**
 * Genera la fase final con los `finalTeams` primeros de la tabla General, una vez terminado el Clausura.
 *
 *   { startDate, name?, location? }
 *
 * Llaves: un torneo `eliminacion` con los clasificados cruzados mejor contra peor (1.º con el último...).
 * Liguilla: un torneo `liga` sin llaves con los clasificados en el orden de la General.
 * Con "ninguna" no hay fase final: el campeón es el primero de la General.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const season = await findSeason(id);
  if (!season) return Response.json({ error: "Temporada no encontrada" }, { status: 404 });
  if (!canManageSeason(auth.user, season)) return forbidden();

  if (season.finalFormat === "ninguna" || season.finalTeams === null) {
    return Response.json({ error: "Esta temporada no tiene fase final: gana el primero de la tabla General" }, { status: 409 });
  }
  const clausura = stageOf(season, "clausura");
  if (!clausura || clausura.status !== "finalizado") {
    return Response.json({ error: "La fase final se genera cuando termina el Clausura" }, { status: 409 });
  }
  if (stageOf(season, "final")) return Response.json({ error: "La fase final ya está generada" }, { status: 409 });

  const body = await readJson(request);
  if (!body) return badRequest();
  if (body.startDate === undefined) return badRequest("Falta startDate");
  const parsed = parseTournamentFields(pick(body, ["name", "startDate", "location"]), "update");
  if ("error" in parsed) return badRequest(parsed.error);

  // La configuración se validó con el cupo de la Apertura; acá ya se sabe cuántos equipos hay de verdad.
  const general = await seasonGeneral(season);
  if (season.finalTeams > general.length) {
    return Response.json(
      { error: `La temporada tiene ${general.length} equipos: no pueden clasificar ${season.finalTeams}. Cambia cuántos clasifican.` },
      { status: 409 }
    );
  }
  const qualified = general.slice(0, season.finalTeams).map((r) => r.clubId);
  const llaves = season.finalFormat === "llaves";

  const tournament = await createSeasonTournament({
    season,
    stage: "final",
    from: clausura.id,
    name: (parsed.data.name as string | undefined) ?? defaultFinalName(season.name),
    startDate: parsed.data.startDate as Date,
    location: parsed.data.location as string | undefined,
    format: llaves ? "eliminacion" : "liga",
    // planBracket empareja en el orden de inscripción: en ese orden van ya los cruces mejor contra peor.
    clubIds: llaves ? seedLeagueBracket(qualified) : qualified,
  });
  if ("error" in tournament) return Response.json({ error: tournament.error }, { status: 409 });

  const updated = await prisma.season.findUniqueOrThrow({ where: { id }, select: SEASON_SELECT });
  return Response.json({ tournamentId: tournament.id, qualified, season: await seasonSummary(updated) }, { status: 201 });
}
