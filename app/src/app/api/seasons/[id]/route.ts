import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, forbidden, readJson, requireUser } from "@/_lib/auth";
import { parseFinalConfig } from "@/_lib/season";
import { SEASON_SELECT, canManageSeason, findSeason, seasonSummary, stageOf } from "@/_lib/season-server";
import { publicCacheHeaders } from "@/_lib/public-cache";

const notFound = () => Response.json({ error: "Temporada no encontrada" }, { status: 404 });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const season = await findSeason(id);
  if (!season) return notFound();
  return Response.json(await seasonSummary(season), { headers: publicCacheHeaders(request.url) });
}

/**
 * Edita el nombre y, mientras no exista la fase final, su tipo y cuántos clasifican (`409` después).
 * El slug no cambia al renombrar, igual que en un torneo.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const season = await findSeason(id);
  if (!season) return notFound();
  if (!canManageSeason(auth.user, season)) return forbidden();

  const body = await readJson(request);
  if (!body) return badRequest();
  const data: { name?: string; finalFormat?: string; finalTeams?: number | null } = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 1 || name.length > 120) return badRequest("name debe tener entre 1 y 120 caracteres");
    data.name = name;
  }

  if (body.finalFormat !== undefined || body.finalTeams !== undefined) {
    if (stageOf(season, "final")) {
      return Response.json({ error: "La fase final ya está generada: no se puede cambiar" }, { status: 409 });
    }
    const apertura = stageOf(season, "apertura");
    const cap = apertura
      ? await prisma.tournament.findUnique({ where: { id: apertura.id }, select: { maxTeams: true, _count: { select: { teams: true } } } })
      : null;
    // Con el Clausura creado los equipos ya están fijos: el tope son ellos, no el cupo.
    const max = !cap ? 0 : stageOf(season, "clausura") ? cap._count.teams : Math.max(cap.maxTeams, cap._count.teams);
    const config = parseFinalConfig(body.finalFormat ?? season.finalFormat, body.finalTeams !== undefined ? body.finalTeams : season.finalTeams, max);
    if (!config.ok) return badRequest(config.error);
    data.finalFormat = config.finalFormat;
    data.finalTeams = config.finalTeams;
  }

  const updated = await prisma.season.update({ where: { id }, data, select: SEASON_SELECT });
  return Response.json(await seasonSummary(updated));
}

/**
 * Elimina la temporada (decisión E): se oculta y sus torneos quedan desvinculados, sin borrarse. Después
 * de esto cada torneo se puede eliminar como cualquier otro.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const season = await findSeason(id);
  if (!season) return notFound();
  if (!canManageSeason(auth.user, season)) return forbidden();

  await prisma.$transaction([
    prisma.tournament.updateMany({ where: { seasonId: id }, data: { seasonId: null, seasonStage: null } }),
    prisma.season.update({ where: { id }, data: { deletedAt: new Date() } }),
  ]);
  return Response.json({ success: true });
}
