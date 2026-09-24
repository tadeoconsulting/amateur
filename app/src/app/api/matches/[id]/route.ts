import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageMatch, forbidden, readJson, requireUser } from "@/_lib/auth";
import { isRealDate, isTbd, penaltyWinner } from "@/_lib/fixture";
import { canTransition, canTransitionPhase, isMatchPhase, isMatchStatus, MATCH_PHASES, type MatchPhase, type MatchStatus } from "@/_lib/match-live";

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
      tournament: { select: { id: true, name: true, format: true, minutesPerHalf: true, extraTimeMinutes: true } },
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
 * Edita un partido: marcador, estado, fase y programación (día, hora y sede).
 *
 * El estado sigue el ciclo programado → en_curso → finalizado (ver canTransition):
 * - Al empezar se guarda `startedAt` (el cronómetro sale de ahí) y el marcador arranca 0-0.
 * - Al terminar el marcador nunca queda vacío, porque las tablas ignoran los partidos sin
 *   marcador. Cuando termina el último partido del torneo, el torneo pasa a "finalizado"
 *   (y vuelve a "en_curso" si se reabre uno).
 *
 * Un partido `decisive` (de un cuadro de eliminación) no puede terminar empatado: si el
 * marcador sigue igual, hay que pasarlo a `phase: "tiempo_extra"` y, si hace falta, a
 * "penales" (ver especificación 007) antes de poder finalizarlo. Al finalizar con un
 * ganador, si el partido tiene `nextMatchId`, se completa automáticamente el slot que le
 * toca en el partido siguiente.
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
  const { homeScore, awayScore, status, phase, date, time, location } = body;

  if ((homeScore !== undefined && !isScore(homeScore)) || (awayScore !== undefined && !isScore(awayScore))) {
    return badRequest("El marcador debe ser un entero mayor o igual a 0");
  }
  if (status !== undefined && !isMatchStatus(status)) {
    return badRequest("status debe ser programado, en_curso o finalizado");
  }
  if (phase !== undefined && !isMatchPhase(phase)) {
    return badRequest(`phase debe ser una de: ${MATCH_PHASES.join(", ")}`);
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
      decisive: true,
      phase: true,
      winnerTeamId: true,
      nextMatchId: true,
      nextMatchSlot: true,
      penaltyHomeScore: true,
      penaltyAwayScore: true,
      _count: { select: { events: true } },
      tournament: { select: { format: true } },
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
    // Un partido "por definir" (sin equipos todavía, en un cuadro de eliminación) no choca por equipo.
    const teamIds = [current.homeTeamId, current.awayTeamId].filter((teamId): teamId is string => teamId !== null);
    const clashConditions = [
      ...(teamIds.length ? [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }] : []),
      ...(next.location ? [{ location: next.location }] : []),
    ];
    if (next.time !== "" && clashConditions.length > 0) {
      const clash = await prisma.match.findFirst({
        where: {
          tournamentId: current.tournamentId,
          id: { not: id },
          date: next.date,
          time: next.time,
          OR: clashConditions,
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

  // ─── Fase (solo partidos `decisive`, que no admiten empate) ───
  if (phase !== undefined) {
    if (!current.decisive) return conflict("Este partido admite empate: no tiene fases");
    if (current.status !== "en_curso") return conflict("Solo se cambia de fase mientras el partido está en juego");
    if (phase !== current.phase) {
      if (!canTransitionPhase(current.phase as MatchPhase, phase)) {
        return conflict(`No se puede pasar de "${current.phase}" a "${phase}"`);
      }
      const homeNow = data.homeScore !== undefined ? (data.homeScore as number | null) : current.homeScore;
      const awayNow = data.awayScore !== undefined ? (data.awayScore as number | null) : current.awayScore;
      if (homeNow !== awayNow) return conflict("Solo se pasa de fase si el partido sigue empatado");
    }
    data.phase = phase;
  }

  // ─── Estado ───
  const from = current.status as MatchStatus;
  const to = status as MatchStatus | undefined;
  // Un partido "por definir" (cuadro de eliminación sin resolver todavía) no se puede jugar.
  if ((to === "en_curso" || to === "finalizado") && isTbd(current)) {
    return conflict("Los equipos de este partido todavía no están definidos");
  }

  // Reabrir un partido decisivo que ya tenía ganador: se desarma ese resultado (y, si el
  // ganador ya había pasado a un partido siguiente, hace falta que ese siga intacto).
  const reopeningDecided = from === "finalizado" && to !== undefined && to !== "finalizado" && current.decisive && !!current.winnerTeamId;
  let clearNextMatchSlot = false;
  if (reopeningDecided && current.nextMatchId) {
    const next = await prisma.match.findUnique({
      where: { id: current.nextMatchId },
      select: { status: true, homeScore: true, awayScore: true, _count: { select: { events: true } } },
    });
    const untouched = next && next.status === "programado" && next.homeScore === null && next.awayScore === null && next._count.events === 0;
    if (!untouched) return conflict("Primero deshaz el resultado del partido siguiente");
    clearNextMatchSlot = true;
  }

  let winnerTeamId: string | null | undefined;
  if (to !== undefined && to !== from) {
    if (!canTransition(from, to)) return conflict(`No se puede pasar un partido de ${from} a ${to}`);

    if (to === "en_curso") {
      data.startedAt = current.startedAt ?? new Date();
      if (current.homeScore === null && data.homeScore === undefined) data.homeScore = 0;
      if (current.awayScore === null && data.awayScore === undefined) data.awayScore = 0;
      if (reopeningDecided) { data.winnerTeamId = null; winnerTeamId = null; }
    } else if (to === "finalizado") {
      if (current.homeScore === null && data.homeScore === undefined) data.homeScore = 0;
      if (current.awayScore === null && data.awayScore === undefined) data.awayScore = 0;

      if (current.decisive) {
        const homeFinal = (data.homeScore as number | null | undefined) ?? current.homeScore ?? 0;
        const awayFinal = (data.awayScore as number | null | undefined) ?? current.awayScore ?? 0;
        const currentPhase = (data.phase as MatchPhase | undefined) ?? (current.phase as MatchPhase);

        if (homeFinal !== awayFinal) {
          winnerTeamId = homeFinal > awayFinal ? current.homeTeamId : current.awayTeamId;
        } else if (currentPhase !== "penales") {
          return conflict("Este partido no puede terminar empatado: pasa a tiempo extra o a penales");
        } else {
          const [homeTaken, awayTaken] = await Promise.all([
            prisma.matchEvent.count({ where: { matchId: id, type: "penal_definicion", teamId: current.homeTeamId } }),
            prisma.matchEvent.count({ where: { matchId: id, type: "penal_definicion", teamId: current.awayTeamId } }),
          ]);
          const homeScored = current.penaltyHomeScore ?? 0;
          const awayScored = current.penaltyAwayScore ?? 0;
          const side = penaltyWinner(homeScored, homeTaken - homeScored, awayScored, awayTaken - awayScored);
          if (!side) return conflict("La tanda de penales no terminó: falta patear");
          winnerTeamId = side === "home" ? current.homeTeamId : current.awayTeamId;
        }
        data.winnerTeamId = winnerTeamId;
      }
    } else if (to === "programado") {
      if (current._count.events > 0) return conflict("El partido ya tiene jugadas registradas: no se puede volver a programado");
      data.startedAt = null;
      data.homeScore = null;
      data.awayScore = null;
      if (current.decisive) data.phase = "regulacion";
      if (reopeningDecided) { data.winnerTeamId = null; winnerTeamId = null; }
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

      // Ganador de un cruce de eliminación: completa el slot que le toca en el partido siguiente.
      if (data.status === "finalizado" && current.nextMatchId && typeof winnerTeamId === "string") {
        await tx.match.update({
          where: { id: current.nextMatchId },
          data: { [current.nextMatchSlot === "home" ? "homeTeamId" : "awayTeamId"]: winnerTeamId },
        });
      } else if (clearNextMatchSlot && current.nextMatchId) {
        await tx.match.update({
          where: { id: current.nextMatchId },
          data: { [current.nextMatchSlot === "home" ? "homeTeamId" : "awayTeamId"]: null },
        });
      }

      // El torneo termina cuando termina su último partido, y se reabre si se reabre uno.
      // En "copa" (especificación 007) eso no alcanza: terminar la fase de grupos dejaba, en
      // ese momento, cero partidos pendientes (el cuadro todavía no existe), así que el
      // torneo se daba por terminado antes de jugarse el cuadro. Hace falta además que el
      // cuadro ya se haya armado (algún partido `decisive`) para dar el torneo por terminado.
      if (data.status === "finalizado") {
        const pending = await tx.match.count({ where: { tournamentId: current.tournamentId, status: { not: "finalizado" } } });
        const bracketReady =
          current.tournament?.format !== "copa" ||
          (await tx.match.count({ where: { tournamentId: current.tournamentId, decisive: true } })) > 0;
        if (pending === 0 && bracketReady) await tx.tournament.update({ where: { id: current.tournamentId }, data: { status: "finalizado" } });
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
