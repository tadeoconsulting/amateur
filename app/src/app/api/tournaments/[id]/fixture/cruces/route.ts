import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, forbidden, isAdmin, readJson, requireUser } from "@/_lib/auth";
import { isRealDate } from "@/_lib/fixture";
import { changedMatches, validateFixtureEdit, type EditableMatch } from "@/_lib/fixture-edit";
import { CLUB_REF_SELECT } from "@/_lib/club-public";

/**
 * Editar los cruces de un fixture ya armado (especificación 017): cambiar el equipo de un partido y mover un partido a
 * otra fecha. Lo hace el organizador del torneo (o un admin). Solo liga y grupos: los partidos de un cuadro de
 * eliminación (`decisive`) no se editan a mano.
 */

const TIME_RE = /^(([01]\d|2[0-3]):[0-5]\d)?$/;
const conflict = (error: string) => Response.json({ error }, { status: 409 });

/** Los partidos editables del torneo, con `locked` en los que ya no se pueden tocar. */
async function loadEditable(tournamentId: string): Promise<EditableMatch[]> {
  const rows = await prisma.match.findMany({
    where: { tournamentId, decisive: false, homeTeamId: { not: null }, awayTeamId: { not: null } },
    select: {
      id: true,
      matchday: true,
      groupName: true,
      homeTeamId: true,
      awayTeamId: true,
      date: true,
      time: true,
      location: true,
      status: true,
      _count: { select: { events: true } },
    },
    orderBy: [{ matchday: "asc" }, { date: "asc" }, { time: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    matchday: r.matchday,
    groupName: r.groupName,
    homeTeamId: r.homeTeamId as string,
    awayTeamId: r.awayTeamId as string,
    date: r.date.toISOString().slice(0, 10),
    time: r.time,
    location: r.location,
    locked: r.status !== "programado" || r._count.events > 0,
  }));
}

/** Entra solo quien organiza el torneo (o un admin). */
async function authorize(tournamentId: string) {
  const auth = await requireUser();
  if ("response" in auth) return { response: auth.response };
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId }, select: { organizerId: true, deletedAt: true } });
  if (!tournament || tournament.deletedAt) return { response: Response.json({ error: "Torneo no encontrado" }, { status: 404 }) };
  if (!isAdmin(auth.user) && tournament.organizerId !== auth.user.id) return { response: forbidden() };
  return { ok: true as const };
}

/** Los partidos que se pueden editar y los equipos del torneo, para armar el editor. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await authorize(id);
  if ("response" in access) return access.response;

  const matches = await loadEditable(id);
  const teamIds = [...new Set(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
  const teams = await prisma.club.findMany({ where: { id: { in: teamIds } }, select: CLUB_REF_SELECT });
  return Response.json({ matches, teams });
}

/**
 * Guarda los cambios. Cuerpo: `{ matches: [{ id, matchday, homeTeamId, awayTeamId, date, time, location }] }`, solo los
 * que cambiaron. Se valida todo junto (nadie dos veces en una fecha, la cantidad por fecha no cambia, partidos que ya
 * empezaron intactos, sin choques de horario) y se guarda todo o nada.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await authorize(id);
  if ("response" in access) return access.response;

  const body = await readJson(request);
  if (!body || !Array.isArray(body.matches)) return badRequest("matches debe ser una lista");

  const patches: Omit<EditableMatch, "groupName" | "locked">[] = [];
  for (const raw of body.matches as unknown[]) {
    const p = (raw ?? {}) as Record<string, unknown>;
    if (
      typeof p.id !== "string" ||
      !Number.isInteger(p.matchday) ||
      (p.matchday as number) < 1 ||
      typeof p.homeTeamId !== "string" ||
      typeof p.awayTeamId !== "string" ||
      typeof p.date !== "string" ||
      !isRealDate(p.date) ||
      typeof p.time !== "string" ||
      !TIME_RE.test(p.time) ||
      typeof p.location !== "string" ||
      p.location.trim().length > 200
    ) {
      return badRequest("Cada partido necesita id, matchday, homeTeamId, awayTeamId, date (YYYY-MM-DD), time (HH:MM o vacío) y location");
    }
    patches.push({ id: p.id, matchday: p.matchday as number, homeTeamId: p.homeTeamId, awayTeamId: p.awayTeamId, date: p.date, time: p.time, location: p.location.trim() });
  }
  if (new Set(patches.map((p) => p.id)).size !== patches.length) return badRequest("Hay partidos repetidos en la lista");

  const original = await loadEditable(id);
  if (original.length === 0) return conflict("Este torneo no tiene un fixture de liga o grupos para editar");
  const known = new Set(original.map((m) => m.id));
  if (patches.some((p) => !known.has(p.id))) return badRequest("Hay partidos que no son de este fixture");

  const edited = original.map((m) => {
    const p = patches.find((x) => x.id === m.id);
    return p ? { ...m, ...p } : m;
  });
  const problem = validateFixtureEdit(original, edited);
  if (problem) return conflict(problem);

  const changed = changedMatches(original, edited);
  if (changed.length === 0) return Response.json({ updated: 0 });

  await prisma.$transaction(
    changed.map((m) =>
      prisma.match.update({
        where: { id: m.id },
        data: { matchday: m.matchday, homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId, date: new Date(`${m.date}T00:00:00Z`), time: m.time, location: m.location },
      })
    )
  );
  return Response.json({ updated: changed.length });
}
