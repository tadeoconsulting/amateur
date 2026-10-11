import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageMatch, forbidden, readJson, requireUser } from "@/_lib/auth";
import { denyResponse, matchAccess } from "@/_lib/mesa-server";
import { isRealDate, isTbd, penaltyWinner } from "@/_lib/fixture";
import { CLASH_MESSAGE, hasScheduleClash } from "@/_lib/match-schedule";
import { canTransition, canTransitionPeriod, canTransitionPhase, isMatchPeriod, isMatchPhase, isMatchStatus, MATCH_PERIODS, MATCH_PHASES, type MatchPeriod, type MatchPhase, type MatchStatus } from "@/_lib/match-live";
import { publicarEventoPartido } from "@/_lib/realtime";
import { CLUB_REF_SELECT } from "@/_lib/club-public";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: { select: CLUB_REF_SELECT },
      awayTeam: { select: CLUB_REF_SELECT },
      events: { orderBy: [{ half: { sort: "asc", nulls: "first" } }, { minute: "asc" }, { createdAt: "asc" }] },
      tournament: { select: { id: true, name: true, format: true, minutesPerHalf: true, extraTimeMinutes: true, slug: true, organizer: { select: { organizerSlug: true } } } },
    },
  });

  if (!match) {
    return Response.json({ error: "Partido no encontrado" }, { status: 404 });
  }

  return Response.json(match);
}

// "" = hora por definir (el partido todavía no tiene día y hora).
const TIME_RE = /^(([01]\d|2[0-3]):[0-5]\d)?$/;

const isScore = (value: unknown) => value === null || (Number.isInteger(value) && (value as number) >= 0);

const conflict = (error: string) => Response.json({ error }, { status: 409 });

/**
 * Edita un partido: marcador, estado, fase, programación (día, hora y sede) y, mientras no
 * empezó, los equipos.
 *
 * El estado sigue el ciclo programado → en_curso → finalizado (ver canTransition):
 * - Al empezar se guarda `startedAt` (el cronómetro sale de ahí) y el marcador arranca 0-0.
 * - Los dos tiempos (especificación 010): `period` pasa de primer_tiempo a descanso (el cronómetro
 *   se congela en `firstHalfEndedAt`) y a segundo_tiempo (`secondHalfStartedAt`); del descanso se
 *   puede volver al primer tiempo, y el partido se puede finalizar desde cualquiera de los tres.
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
  const access = await matchAccess(auth.user, id);
  if (!access.ok) return denyResponse(access);

  const body = await readJson(request);
  if (!body) return badRequest();
  // La mesa (especificación 011) solo lleva el partido: estado, tiempo y fase. Nada de marcador a mano, ni de
  // programación, ni de equipos.
  const isMesa = access.kind === "mesa";
  if (isMesa && Object.keys(body).some((k) => !["status", "period", "phase"].includes(k))) {
    return forbidden();
  }
  const { homeScore, awayScore, status, phase, period, date, time, location, homeTeamId, awayTeamId } = body;

  if ((homeScore !== undefined && !isScore(homeScore)) || (awayScore !== undefined && !isScore(awayScore))) {
    return badRequest("El marcador debe ser un entero mayor o igual a 0");
  }
  if (status !== undefined && !isMatchStatus(status)) {
    return badRequest("status debe ser programado, en_curso o finalizado");
  }
  if (phase !== undefined && !isMatchPhase(phase)) {
    return badRequest(`phase debe ser una de: ${MATCH_PHASES.join(", ")}`);
  }

  if (period !== undefined && !isMatchPeriod(period)) {
    return badRequest(`period debe ser uno de: ${MATCH_PERIODS.join(", ")}`);
  }

  // Programación del partido: día (YYYY-MM-DD), hora (HH:MM, 24 h) y sede.
  const scheduling = date !== undefined || time !== undefined || location !== undefined;
  if (scheduling) {
    if (date !== undefined && (typeof date !== "string" || !isRealDate(date))) {
      return badRequest("date debe tener el formato YYYY-MM-DD");
    }
    if (time !== undefined && (typeof time !== "string" || !TIME_RE.test(time))) {
      return badRequest("time debe tener el formato HH:MM (24 horas), o vacío si está por definir");
    }
    if (location !== undefined && (typeof location !== "string" || location.trim().length > 200)) {
      return badRequest("location debe ser un texto de hasta 200 caracteres");
    }
  }

  // Cambiar los equipos de un partido que todavía no empezó (corregir un cruce mal cargado).
  const changingTeams = homeTeamId !== undefined || awayTeamId !== undefined;
  if (changingTeams && (typeof homeTeamId !== "string" || typeof awayTeamId !== "string")) {
    return badRequest("homeTeamId y awayTeamId deben venir juntos");
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
      period: true,
      firstHalfEndedAt: true,
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
      tournament: { select: { format: true, playoffTeams: true } },
    },
  });
  if (!current) return Response.json({ error: "Partido no encontrado" }, { status: 404 });

  const data: Record<string, unknown> = {};

  // ─── Equipos ───
  if (changingTeams) {
    if (current.status !== "programado" || current._count.events > 0) {
      return conflict("Solo se pueden cambiar los equipos de un partido que todavía no empezó");
    }
    if (current.decisive) return conflict("Los cruces de un cuadro de eliminación no se editan a mano");
    if (homeTeamId === awayTeamId) return badRequest("El equipo local y el visitante deben ser distintos");
    const enrolled = await prisma.tournamentTeam.count({
      where: { tournamentId: current.tournamentId, clubId: { in: [homeTeamId as string, awayTeamId as string] } },
    });
    if (enrolled !== 2) return badRequest("Los dos equipos deben estar inscritos en el torneo");
    data.homeTeamId = homeTeamId;
    data.awayTeamId = awayTeamId;
  }

  // ─── Programación ───
  if (scheduling || changingTeams) {
    if (current.status !== "programado") {
      return conflict("Solo se puede reprogramar un partido que todavía no empezó");
    }
    const next = {
      date: typeof date === "string" ? new Date(`${date}T00:00:00Z`) : current.date,
      time: typeof time === "string" ? time : current.time,
      location: typeof location === "string" ? location.trim() : current.location,
    };
    // No puede haber otro partido del torneo a la misma hora con un mismo equipo o en la misma sede.
    if (
      await hasScheduleClash({
        tournamentId: current.tournamentId,
        excludeId: id,
        ...next,
        homeTeamId: changingTeams ? (homeTeamId as string) : current.homeTeamId,
        awayTeamId: changingTeams ? (awayTeamId as string) : current.awayTeamId,
      })
    ) {
      return conflict(CLASH_MESSAGE);
    }
    if (date !== undefined) data.date = next.date;
    if (time !== undefined) data.time = next.time;
    if (location !== undefined) data.location = next.location;
  }

  // ─── Marcador ───
  if (homeScore !== undefined) data.homeScore = homeScore as number | null;
  if (awayScore !== undefined) data.awayScore = awayScore as number | null;

  // ─── Tiempo (primer tiempo, descanso, segundo tiempo) ───
  if (period !== undefined) {
    if (status !== undefined && status !== current.status) return badRequest("Cambia el tiempo y el estado por separado");
    if (current.status !== "en_curso") return conflict("Solo se cambia de tiempo mientras el partido está en juego");
    if (current.period === null) return conflict("Este partido empezó antes de que hubiera tiempos: sigue con un solo cronómetro");
    if (period !== current.period) {
      if (!canTransitionPeriod(current.period as MatchPeriod, period as MatchPeriod)) {
        return conflict(`No se puede pasar de "${current.period}" a "${period}"`);
      }
      const nowDate = new Date();
      data.period = period;
      if (period === "descanso") {
        data.firstHalfEndedAt = nowDate;
      } else if (period === "segundo_tiempo") {
        data.secondHalfStartedAt = nowDate;
      } else if (period === "primer_tiempo" && current.startedAt && current.firstHalfEndedAt) {
        // Volver al primer tiempo: el descanso no cuenta, así que el inicio se corre lo que duró.
        data.startedAt = new Date(current.startedAt.getTime() + (nowDate.getTime() - current.firstHalfEndedAt.getTime()));
        data.firstHalfEndedAt = null;
      }
    }
  }

  // ─── Fase (solo partidos `decisive`, que no admiten empate) ───
  if (phase !== undefined) {
    if (!current.decisive) return conflict("Este partido admite empate: no tiene fases");
    if (current.status !== "en_curso") return conflict("Solo se cambia de fase mientras el partido está en juego");
    const playingPeriod = (data.period as string | undefined) ?? current.period;
    if (playingPeriod === "primer_tiempo" || playingPeriod === "descanso") {
      return conflict("Primero se juegan los dos tiempos: pasa al segundo tiempo antes de ir a tiempo extra");
    }
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
  // La mesa inicia el partido y lo finaliza; reabrirlo, volverlo a "programado" o cargar el resultado directo es del organizador.
  if (isMesa && to !== undefined && to !== from && !((from === "programado" && to === "en_curso") || (from === "en_curso" && to === "finalizado"))) {
    return forbidden();
  }
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
      data.finishedAt = null;
      // Un partido que nunca empezó estrena los tiempos; uno que ya había empezado (antes de que
      // existieran) o que se reabre conserva el tiempo en que quedó.
      if (current.period === null && current.startedAt === null) data.period = "primer_tiempo";
      if (current.homeScore === null && data.homeScore === undefined) data.homeScore = 0;
      if (current.awayScore === null && data.awayScore === undefined) data.awayScore = 0;
      if (reopeningDecided) { data.winnerTeamId = null; winnerTeamId = null; }
    } else if (to === "finalizado") {
      data.finishedAt = new Date();
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
      data.finishedAt = null;
      data.period = null;
      data.firstHalfEndedAt = null;
      data.secondHalfStartedAt = null;
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
      // Las alineaciones cargadas eran de los equipos anteriores.
      if (changingTeams) await tx.matchLineup.deleteMany({ where: { matchId: id } });
      const updated = await tx.match.update({
        where: { id },
        data,
        include: { homeTeam: { select: CLUB_REF_SELECT }, awayTeam: { select: CLUB_REF_SELECT } },
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
      // Una liga con llaves es igual: al cerrarse la tabla todavía falta el cuadro.
      if (data.status === "finalizado") {
        const pending = await tx.match.count({ where: { tournamentId: current.tournamentId, status: { not: "finalizado" } } });
        const needsBracket =
          current.tournament?.format === "copa" ||
          (current.tournament?.format === "liga" && current.tournament.playoffTeams !== null);
        const bracketReady =
          !needsBracket ||
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

    await publicarEventoPartido(id);
    return Response.json(match);
  } catch {
    return Response.json({ error: "Error al actualizar partido" }, { status: 500 });
  }
}

/**
 * Quita un partido que todavía no se jugó (uno agregado de más, o un cruce que ya no va).
 * Solo si está programado, sin jugadas, y no es parte de un cuadro de eliminación (ahí cada
 * partido alimenta al siguiente). Si era el último pendiente de un torneo "en_curso" no hace
 * falta tocar nada: el torneo se cierra al terminar un partido, no al borrar uno.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!(await canManageMatch(auth.user, id))) return forbidden();

  const match = await prisma.match.findUnique({
    where: { id },
    select: { status: true, decisive: true, nextMatchId: true, _count: { select: { events: true, feedsInto: true } } },
  });
  if (!match) return Response.json({ error: "Partido no encontrado" }, { status: 404 });
  if (match.status !== "programado" || match._count.events > 0) {
    return conflict("Solo se puede quitar un partido que todavía no empezó");
  }
  if (match.decisive || match.nextMatchId || match._count.feedsInto > 0) {
    return conflict("Los partidos de un cuadro de eliminación no se quitan a mano");
  }

  try {
    await prisma.match.delete({ where: { id } });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Error al quitar el partido" }, { status: 500 });
  }
}
