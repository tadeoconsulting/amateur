import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageMatch, forbidden, readJson, requireUser } from "@/_lib/auth";
import { isRealDate } from "@/_lib/fixture";
import { canTransition, isMatchStatus, type MatchStatus } from "@/_lib/match-live";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: true,
      awayTeam: true,
      events: { orderBy: [{ minute: "asc" }, { createdAt: "asc" }] },
      tournament: { select: { id: true, name: true, format: true, minutesPerHalf: true } },
    },
  });

  if (!match) {
    return Response.json({ error: "Partido no encontrado" }, { status: 404 });
  }

  return Response.json(match);
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const isScore = (value: unknown) => value === null || (Number.isInteger(value) && (value as number) >= 0);

const conflict = (error: string) => Response.json({ error }, { status: 409 });

/**
 * Edita un partido: marcador, estado y programación (día, hora y sede).
 *
 * El estado sigue el ciclo programado → en_curso → finalizado (ver canTransition):
 * - Al empezar se guarda `startedAt` (el cronómetro sale de ahí) y el marcador arranca 0-0.
 * - Al terminar el marcador nunca queda vacío, porque las tablas ignoran los partidos sin
 *   marcador. Cuando termina el último partido del torneo, el torneo pasa a "finalizado"
 *   (y vuelve a "en_curso" si se reabre uno).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!(await canManageMatch(auth.user, id))) return forbidden();

  const body = await readJson(request);
  if (!body) return badRequest();
  const { homeScore, awayScore, status, date, time, location } = body;

  if ((homeScore !== undefined && !isScore(homeScore)) || (awayScore !== undefined && !isScore(awayScore))) {
    return badRequest("El marcador debe ser un entero mayor o igual a 0");
  }
  if (status !== undefined && !isMatchStatus(status)) {
    return badRequest("status debe ser programado, en_curso o finalizado");
  }

  // Programación del partido: día (YYYY-MM-DD), hora (HH:MM, 24 h) y sede.
  const scheduling = date !== undefined || time !== undefined || location !== undefined;
  if (scheduling) {
    if (date !== undefined && (typeof date !== "string" || !isRealDate(date))) {
      return badRequest("date debe tener el formato YYYY-MM-DD");
    }
    if (time !== undefined && (typeof time !== "string" || !TIME_RE.test(time))) {
      return badRequest("time debe tener el formato HH:MM (24 horas)");
    }
    if (location !== undefined && (typeof location !== "string" || location.trim().length > 200)) {
      return badRequest("location debe ser un texto de hasta 200 caracteres");
    }
  }

  const current = await prisma.match.findUnique({
    where: { id },
    select: {
      status: true,
      tournamentId: true,
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      startedAt: true,
      date: true,
      time: true,
      location: true,
      _count: { select: { events: true } },
    },
  });
  if (!current) return Response.json({ error: "Partido no encontrado" }, { status: 404 });

  const data: Record<string, unknown> = {};

  // ─── Programación ───
  if (scheduling) {
    if (current.status !== "programado") {
      return conflict("Solo se puede reprogramar un partido que todavía no empezó");
    }
    const next = {
      date: typeof date === "string" ? new Date(`${date}T00:00:00Z`) : current.date,
      time: typeof time === "string" ? time : current.time,
      location: typeof location === "string" ? location.trim() : current.location,
    };
    // No puede haber otro partido del torneo a la misma hora con un mismo equipo o en la misma sede.
    if (next.time !== "") {
      const clash = await prisma.match.findFirst({
        where: {
          tournamentId: current.tournamentId,
          id: { not: id },
          date: next.date,
          time: next.time,
          OR: [
            { homeTeamId: { in: [current.homeTeamId, current.awayTeamId] } },
            { awayTeamId: { in: [current.homeTeamId, current.awayTeamId] } },
            ...(next.location ? [{ location: next.location }] : []),
          ],
        },
        select: { id: true },
      });
      if (clash) return conflict("Ese horario choca con otro partido del torneo (mismo equipo o misma sede)");
    }
    if (date !== undefined) data.date = next.date;
    if (time !== undefined) data.time = next.time;
    if (location !== undefined) data.location = next.location;
  }

  // ─── Marcador ───
  if (homeScore !== undefined) data.homeScore = homeScore as number | null;
  if (awayScore !== undefined) data.awayScore = awayScore as number | null;

  // ─── Estado ───
  const from = current.status as MatchStatus;
  const to = status as MatchStatus | undefined;
  if (to !== undefined && to !== from) {
    if (!canTransition(from, to)) return conflict(`No se puede pasar un partido de ${from} a ${to}`);

    if (to === "en_curso") {
      data.startedAt = current.startedAt ?? new Date();
      if (current.homeScore === null && data.homeScore === undefined) data.homeScore = 0;
      if (current.awayScore === null && data.awayScore === undefined) data.awayScore = 0;
    } else if (to === "finalizado") {
      if (current.homeScore === null && data.homeScore === undefined) data.homeScore = 0;
      if (current.awayScore === null && data.awayScore === undefined) data.awayScore = 0;
    } else if (to === "programado") {
      if (current._count.events > 0) return conflict("El partido ya tiene jugadas registradas: no se puede volver a programado");
      data.startedAt = null;
      data.homeScore = null;
      data.awayScore = null;
    }
    data.status = to;
  }

  if (Object.keys(data).length === 0) return badRequest("No hay campos para actualizar");
  // Un partido terminado no puede quedar con el marcador vacío (las tablas lo ignorarían).
  if (data.homeScore === null || data.awayScore === null) {
    if ((data.status ?? current.status) === "finalizado") return badRequest("Un partido finalizado necesita marcador");
  }

  try {
    const match = await prisma.$transaction(async (tx) => {
      const updated = await tx.match.update({
        where: { id },
        data,
        include: { homeTeam: true, awayTeam: true },
      });

      // El torneo termina cuando termina su último partido, y se reabre si se reabre uno.
      if (data.status === "finalizado") {
        const pending = await tx.match.count({ where: { tournamentId: current.tournamentId, status: { not: "finalizado" } } });
        if (pending === 0) await tx.tournament.update({ where: { id: current.tournamentId }, data: { status: "finalizado" } });
      } else if (data.status === "en_curso" || data.status === "programado") {
        await tx.tournament.updateMany({
          where: { id: current.tournamentId, status: "finalizado" },
          data: { status: "en_curso" },
        });
      }
      return updated;
    });

    return Response.json(match);
  } catch {
    return Response.json({ error: "Error al actualizar partido" }, { status: 500 });
  }
}
