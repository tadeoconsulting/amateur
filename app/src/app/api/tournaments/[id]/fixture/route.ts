import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { badRequest, forbidden, isAdmin, readJson, requireUser } from "@/_lib/auth";
import {
  planBracket,
  planFixture,
  scheduleBracketOneDay,
  scheduleFixture,
  seedCopaBracket,
  slotMinutesFor,
  type MatchdayConfig,
  type OneDayConfig,
} from "@/_lib/fixture";
import { computeStandings } from "@/_lib/standings";
import { OPEN_STATUSES } from "@/_lib/tournament-labels";

const conflict = (error: string) => Response.json({ error }, { status: 409 });

const TOURNAMENT_FIXTURE_SELECT = {
  status: true,
  format: true,
  location: true,
  startDate: true,
  minutesPerHalf: true,
  minTeams: true,
  groupsAdvancePerGroup: true,
  organizerId: true,
  // Orden de inscripción: de acá sale la semilla 1 del cuadro de eliminación (y, ya de paso,
  // hace explícito lo que "liga" siempre asumió sin garantizarlo).
  teams: {
    select: { clubId: true, groupName: true, club: { select: { name: true } } },
    orderBy: { enrolledAt: "asc" as const },
  },
} satisfies Prisma.TournamentSelect;

type TournamentForFixture = Prisma.TournamentGetPayload<{ select: typeof TOURNAMENT_FIXTURE_SELECT }>;

/** Lo que llega del cliente para el único día de un relámpago. */
function toOneDayConfig(value: unknown): OneDayConfig | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  return { date: String(v.date), startTime: String(v.startTime), endTime: String(v.endTime) };
}

/** Lo que llega del cliente para una fecha; la validación de fondo la hace scheduleFixture. */
function toConfig(value: unknown): MatchdayConfig | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.days)) return null;
  return {
    days: v.days as number[],
    startDate: String(v.startDate),
    endDate: String(v.endDate),
    startTime: String(v.startTime),
    endTime: String(v.endTime),
    venue: v.venue as MatchdayConfig["venue"],
  };
}

/**
 * Inicia el torneo: arma los cruces con los equipos inscritos y crea los partidos.
 *
 *   { mode: "auto", matchdays: [ { days, startDate, endDate, startTime, endTime, venue }, ... ] }
 *       una configuración por fecha; los partidos quedan con día, hora y sede.
 *   { mode: "manual" }
 *       los partidos quedan sin programar (time "") para configurarlos uno por uno.
 *
 * `replace: true` vuelve a generar un fixture existente, siempre que ningún partido
 * haya empezado. El torneo pasa a "en_curso" y ya no admite más equipos.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({ where: { id }, select: TOURNAMENT_FIXTURE_SELECT });
  if (!tournament) {
    return Response.json({ error: "Torneo no encontrado" }, { status: 404 });
  }
  if (!isAdmin(auth.user) && tournament.organizerId !== auth.user.id) return forbidden();

  const body = await readJson(request);
  if (!body) return badRequest();
  const validModes = tournament.format === "copa" ? ["auto", "manual", "bracket"] : ["auto", "manual"];
  if (!validModes.includes(body.mode as string)) {
    return badRequest(`mode debe ser ${validModes.map((m) => `"${m}"`).join(" o ")}`);
  }
  const replace = body.replace === true;

  // "copa" es dos pasos: primero la fase de grupos (como "grupos"), y recién cuando termina,
  // con mode: "bracket", se arma el cuadro de eliminación entre los mejores de cada grupo.
  // Tiene su propio flujo completo: no comparte las validaciones genéricas de abajo, porque
  // tener partidos de grupos ya creados es justamente lo esperado, no un conflicto.
  if (tournament.format === "copa") {
    return handleCopaFixture(tournament, id, body, replace);
  }

  const existing = await prisma.match.findMany({
    where: { tournamentId: id },
    select: { status: true, _count: { select: { events: true } } },
  });
  if (existing.length > 0) {
    if (!replace) return conflict("El torneo ya tiene un fixture. Para volver a generarlo hay que reemplazarlo.");
    if (existing.some((m) => m.status !== "programado" || m._count.events > 0)) {
      return conflict("Ya hay partidos jugados o en juego: no se puede reemplazar el fixture");
    }
  } else if (!OPEN_STATUSES.includes(tournament.status)) {
    return conflict("El torneo ya empezó");
  }

  if (tournament.minTeams && tournament.teams.length < tournament.minTeams) {
    return conflict(`Faltan equipos: el mínimo para empezar es ${tournament.minTeams}`);
  }

  // Cuadro de eliminación (eliminacion y relampago comparten el mismo cuadro; lo único que
  // cambia es el calendario). Sin programación todavía para "eliminacion": cada partido se
  // configura uno por uno, igual que el modo manual de liga/grupos.
  if (tournament.format === "eliminacion" || tournament.format === "relampago") {
    const bracket = planBracket(tournament.teams.map((t) => t.clubId));
    if (!bracket.ok) return conflict(bracket.error);

    let rows: { homeTeamId: string | null; awayTeamId: string | null; round: number; date: Date; time: string; location: string }[];

    if (tournament.format === "relampago" && body.mode === "auto") {
      const day = toOneDayConfig(body.day);
      if (!day) return badRequest("day debe indicar date, startTime y endTime");
      const scheduled = scheduleBracketOneDay(bracket.matches, day, {
        slotMinutes: slotMinutesFor(tournament.minutesPerHalf),
        location: tournament.location,
      });
      if (!scheduled.ok) return badRequest(scheduled.error);
      rows = scheduled.matches.map((m) => ({ ...m, date: new Date(`${m.date}T00:00:00Z`) }));
    } else {
      // "manual" (o "eliminacion", que todavía no tiene "auto"): sin programar.
      rows = bracket.matches.map((m) => ({ ...m, date: tournament.startDate, time: "", location: "" }));
    }

    const matchIds = await prisma.$transaction(async (tx) => {
      if (existing.length > 0) await tx.match.deleteMany({ where: { tournamentId: id } });

      const ids: string[] = [];
      for (const r of rows) {
        const created = await tx.match.create({
          data: {
            tournamentId: id,
            homeTeamId: r.homeTeamId,
            awayTeamId: r.awayTeamId,
            date: r.date,
            time: r.time,
            location: r.location,
            matchday: r.round,
            decisive: true,
          },
          select: { id: true },
        });
        ids.push(created.id);
      }
      // Segunda pasada: recién acá se conocen los ids reales, para conectar cada partido
      // con aquel al que pasa quien lo gane.
      for (let i = 0; i < bracket.matches.length; i++) {
        const next = bracket.matches[i].nextMatchIndex;
        if (next === null) continue;
        await tx.match.update({
          where: { id: ids[i] },
          data: { nextMatchId: ids[next], nextMatchSlot: bracket.matches[i].nextMatchSlot },
        });
      }
      await tx.tournament.update({ where: { id }, data: { status: "en_curso" } });
      return ids;
    });

    return Response.json({ mode: "bracket", totalRounds: bracket.totalRounds, matches: matchIds.length }, { status: 201 });
  }

  const plan = planFixture(
    tournament.teams.map((t) => ({ id: t.clubId, groupName: t.groupName })),
    tournament.format
  );
  if (!plan.ok) return conflict(plan.error);

  const names = new Map(tournament.teams.map((t) => [t.clubId, t.club.name]));
  let rows: { matchday: number; homeTeamId: string; awayTeamId: string; groupName: string | null; date: Date; time: string; location: string }[];

  if (body.mode === "manual") {
    // Sin día ni hora: se marcan con time "" y date = inicio del torneo hasta que se configuren.
    rows = plan.matches.map((m) => ({ ...m, date: tournament.startDate, time: "", location: "" }));
  } else {
    const configs = Array.isArray(body.matchdays) ? body.matchdays.map(toConfig) : null;
    if (!configs || configs.some((c) => c === null)) return badRequest("matchdays debe ser una lista de configuraciones");

    const scheduled = scheduleFixture(plan.matches, configs as MatchdayConfig[], {
      slotMinutes: slotMinutesFor(tournament.minutesPerHalf),
      tournamentLocation: tournament.location,
      teamName: (teamId) => names.get(teamId) ?? "el local",
    });
    if (!scheduled.ok) return Response.json({ error: scheduled.error, matchday: scheduled.matchday }, { status: 400 });

    rows = scheduled.matches.map((m) => ({ ...m, date: new Date(`${m.date}T00:00:00Z`) }));
  }

  await prisma.$transaction(async (tx) => {
    if (existing.length > 0) await tx.match.deleteMany({ where: { tournamentId: id } });
    await tx.match.createMany({ data: rows.map((r) => ({ tournamentId: id, ...r })) });
    await tx.tournament.update({ where: { id }, data: { status: "en_curso" } });
  });

  return Response.json({ mode: body.mode, matchdays: plan.matchdays, matches: rows.length }, { status: 201 });
}

/**
 * "copa": grupos primero, cuadro después.
 *
 *   { mode: "auto" | "manual", ... }  arma la fase de grupos, igual que "grupos".
 *   { mode: "bracket" }               una vez que la fase de grupos terminó, arma el cuadro
 *                                     de eliminación con los mejores de cada grupo.
 */
async function handleCopaFixture(tournament: TournamentForFixture, id: string, body: Record<string, unknown>, replace: boolean) {
  const existing = await prisma.match.findMany({
    where: { tournamentId: id },
    select: { id: true, groupName: true, decisive: true, status: true, _count: { select: { events: true } } },
  });
  const groupMatches = existing.filter((m) => m.groupName !== null);
  const bracketMatches = existing.filter((m) => m.decisive);

  if (body.mode === "bracket") {
    if (groupMatches.length === 0) return conflict("Primero arma la fase de grupos");
    if (groupMatches.some((m) => m.status !== "finalizado")) {
      return conflict("La fase de grupos todavía no terminó");
    }
    if (bracketMatches.length > 0) {
      if (!replace) return conflict("El cuadro ya existe. Para volver a generarlo hay que reemplazarlo.");
      if (bracketMatches.some((m) => m.status !== "programado" || m._count.events > 0)) {
        return conflict("Ya hay partidos del cuadro jugados o en juego: no se puede reemplazar");
      }
    }

    const groupNames = [...new Set(tournament.teams.map((t) => t.groupName).filter((g): g is string => g !== null))].sort();
    if (groupNames.length === 0) return conflict("Los equipos no tienen grupo asignado");

    const finishedGroupMatches = await prisma.match.findMany({
      where: { tournamentId: id, groupName: { not: null } },
      select: { homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true, groupName: true },
    });
    const standings = computeStandings(
      tournament.teams.map((t) => ({ clubId: t.clubId, groupName: t.groupName })),
      finishedGroupMatches
    );
    const standingsByGroup = new Map<string, typeof standings>();
    for (const row of standings) {
      if (!row.groupName) continue;
      const list = standingsByGroup.get(row.groupName) ?? [];
      list.push(row);
      standingsByGroup.set(row.groupName, list);
    }

    const advance = tournament.groupsAdvancePerGroup ?? 2;
    const groupsRanked = groupNames.map((name) => (standingsByGroup.get(name) ?? []).slice(0, advance).map((r) => r.clubId));
    if (groupsRanked.some((g) => g.length < advance)) {
      return conflict(`Algún grupo no tiene los ${advance} equipos que clasifican`);
    }

    const bracket = planBracket(seedCopaBracket(groupsRanked));
    if (!bracket.ok) return conflict(bracket.error);

    const matchIds = await prisma.$transaction(async (tx) => {
      if (bracketMatches.length > 0) await tx.match.deleteMany({ where: { id: { in: bracketMatches.map((m) => m.id) } } });

      const ids: string[] = [];
      for (const m of bracket.matches) {
        const created = await tx.match.create({
          data: {
            tournamentId: id,
            homeTeamId: m.homeTeamId,
            awayTeamId: m.awayTeamId,
            date: tournament.startDate,
            time: "",
            location: "",
            matchday: m.round,
            decisive: true,
          },
          select: { id: true },
        });
        ids.push(created.id);
      }
      for (let i = 0; i < bracket.matches.length; i++) {
        const next = bracket.matches[i].nextMatchIndex;
        if (next === null) continue;
        await tx.match.update({
          where: { id: ids[i] },
          data: { nextMatchId: ids[next], nextMatchSlot: bracket.matches[i].nextMatchSlot },
        });
      }
      return ids;
    });

    return Response.json({ mode: "bracket", totalRounds: bracket.totalRounds, matches: matchIds.length }, { status: 201 });
  }

  // mode "auto" | "manual": arma la fase de grupos. Una vez que existe el cuadro, ya no se
  // puede rehacer (deshacerlo primero, si hace falta, es tarea de una funcionalidad futura).
  if (bracketMatches.length > 0) return conflict("El cuadro ya se generó: ya no se puede rehacer la fase de grupos");

  if (groupMatches.length > 0) {
    if (!replace) return conflict("El torneo ya tiene un fixture. Para volver a generarlo hay que reemplazarlo.");
    if (groupMatches.some((m) => m.status !== "programado" || m._count.events > 0)) {
      return conflict("Ya hay partidos jugados o en juego: no se puede reemplazar el fixture");
    }
  } else if (!OPEN_STATUSES.includes(tournament.status)) {
    return conflict("El torneo ya empezó");
  }
  if (tournament.minTeams && tournament.teams.length < tournament.minTeams) {
    return conflict(`Faltan equipos: el mínimo para empezar es ${tournament.minTeams}`);
  }

  const plan = planFixture(
    tournament.teams.map((t) => ({ id: t.clubId, groupName: t.groupName })),
    "grupos"
  );
  if (!plan.ok) return conflict(plan.error);

  const names = new Map(tournament.teams.map((t) => [t.clubId, t.club.name]));
  let rows: { matchday: number; homeTeamId: string; awayTeamId: string; groupName: string | null; date: Date; time: string; location: string }[];

  if (body.mode === "manual") {
    rows = plan.matches.map((m) => ({ ...m, date: tournament.startDate, time: "", location: "" }));
  } else {
    const configs = Array.isArray(body.matchdays) ? body.matchdays.map(toConfig) : null;
    if (!configs || configs.some((c) => c === null)) return badRequest("matchdays debe ser una lista de configuraciones");

    const scheduled = scheduleFixture(plan.matches, configs as MatchdayConfig[], {
      slotMinutes: slotMinutesFor(tournament.minutesPerHalf),
      tournamentLocation: tournament.location,
      teamName: (teamId) => names.get(teamId) ?? "el local",
    });
    if (!scheduled.ok) return Response.json({ error: scheduled.error, matchday: scheduled.matchday }, { status: 400 });

    rows = scheduled.matches.map((m) => ({ ...m, date: new Date(`${m.date}T00:00:00Z`) }));
  }

  await prisma.$transaction(async (tx) => {
    if (groupMatches.length > 0) await tx.match.deleteMany({ where: { tournamentId: id } });
    await tx.match.createMany({ data: rows.map((r) => ({ tournamentId: id, ...r })) });
    await tx.tournament.update({ where: { id }, data: { status: "en_curso" } });
  });

  return Response.json({ mode: body.mode, matchdays: plan.matchdays, matches: rows.length }, { status: 201 });
}

/** Deshace el fixture: borra los partidos y el torneo vuelve a estar abierto a inscripción. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({ where: { id }, select: { status: true, organizerId: true } });
  if (!tournament) {
    return Response.json({ error: "Torneo no encontrado" }, { status: 404 });
  }
  if (!isAdmin(auth.user) && tournament.organizerId !== auth.user.id) return forbidden();
  if (tournament.status === "finalizado") return conflict("El torneo ya terminó");

  const matches = await prisma.match.findMany({
    where: { tournamentId: id },
    select: { status: true, _count: { select: { events: true } } },
  });
  if (matches.some((m) => m.status !== "programado" || m._count.events > 0)) {
    return conflict("Ya hay partidos jugados o en juego: no se puede deshacer el fixture");
  }

  await prisma.$transaction([
    prisma.match.deleteMany({ where: { tournamentId: id } }),
    prisma.tournament.update({ where: { id }, data: { status: "inscripcion" } }),
  ]);
  return Response.json({ deleted: matches.length });
}
