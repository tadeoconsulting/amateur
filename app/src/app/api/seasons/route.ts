import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageTournament, forbidden, readJson, requireUser } from "@/_lib/auth";
import { parseFinalConfig } from "@/_lib/season";
import { SEASON_SELECT, seasonSummary } from "@/_lib/season-server";
import { ensureOrganizerSlug, newSeasonSlug } from "@/_lib/tournament-slug";

/** Las temporadas (no eliminadas), de un organizador con `?organizerId=`. */
export async function GET(request: NextRequest) {
  const organizerId = request.nextUrl.searchParams.get("organizerId");
  const seasons = await prisma.season.findMany({
    where: { deletedAt: null, ...(organizerId ? { organizerId } : {}) },
    select: SEASON_SELECT,
    orderBy: { createdAt: "desc" },
  });
  return Response.json(await Promise.all(seasons.map((s) => seasonSummary(s))));
}

/**
 * Crea una temporada sobre un torneo `liga` que pasa a ser su Apertura (especificación 012).
 *
 *   { name, aperturaId, finalFormat: "llaves" | "liguilla" | "ninguna", finalTeams }
 *
 * La Apertura puede estar en cualquier estado (decisión F), pero no eliminada ni en otra temporada.
 * Como sus equipos todavía pueden cambiar, `finalTeams` se compara con su cupo; al generar la fase
 * final se vuelve a comparar con los equipos de verdad.
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = await readJson(request);
  if (!body) return badRequest();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 120) return badRequest("name debe tener entre 1 y 120 caracteres");
  if (typeof body.aperturaId !== "string") return badRequest("Falta aperturaId");

  const apertura = await prisma.tournament.findUnique({
    where: { id: body.aperturaId },
    select: { id: true, format: true, organizerId: true, maxTeams: true, seasonId: true, deletedAt: true, _count: { select: { teams: true } } },
  });
  if (!apertura || apertura.deletedAt) return Response.json({ error: "Torneo no encontrado" }, { status: 404 });
  if (!(await canManageTournament(auth.user, apertura.id))) return forbidden();
  if (apertura.format !== "liga") return badRequest("La Apertura de una temporada tiene que ser una liga");
  if (apertura.seasonId) return Response.json({ error: "El torneo ya es parte de otra temporada" }, { status: 409 });

  const config = parseFinalConfig(body.finalFormat, body.finalTeams, Math.max(apertura.maxTeams, apertura._count.teams));
  if (!config.ok) return badRequest(config.error);

  await ensureOrganizerSlug(apertura.organizerId);
  try {
    const season = await prisma.$transaction(async (tx) => {
      const created = await tx.season.create({
        data: {
          name,
          organizerId: apertura.organizerId,
          slug: await newSeasonSlug(apertura.organizerId, name, tx),
          finalFormat: config.finalFormat,
          finalTeams: config.finalTeams,
        },
      });
      // Si dos temporadas reclaman la misma Apertura a la vez, solo una la consigue.
      const { count } = await tx.tournament.updateMany({
        where: { id: apertura.id, seasonId: null },
        data: { seasonId: created.id, seasonStage: "apertura" },
      });
      if (count === 0) throw new SeasonConflict();
      return tx.season.findUniqueOrThrow({ where: { id: created.id }, select: SEASON_SELECT });
    });
    return Response.json(await seasonSummary(season), { status: 201 });
  } catch (error) {
    if (error instanceof SeasonConflict) return Response.json({ error: "El torneo ya es parte de otra temporada" }, { status: 409 });
    console.error("Create season error:", error);
    return Response.json({ error: "Error al crear la temporada" }, { status: 500 });
  }
}

class SeasonConflict extends Error {}
