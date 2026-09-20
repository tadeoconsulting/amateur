import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, forbidden, isAdmin, readJson, requireUser } from "@/_lib/auth";
import { planFixture, scheduleFixture, slotMinutesFor, type MatchdayConfig } from "@/_lib/fixture";
import { OPEN_STATUSES } from "@/_lib/tournament-labels";

const conflict = (error: string) => Response.json({ error }, { status: 409 });

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
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      status: true,
      format: true,
      location: true,
      startDate: true,
      minutesPerHalf: true,
      minTeams: true,
      organizerId: true,
      teams: { select: { clubId: true, groupName: true, club: { select: { name: true } } } },
    },
  });
  if (!tournament) {
    return Response.json({ error: "Torneo no encontrado" }, { status: 404 });
  }
  if (!isAdmin(auth.user) && tournament.organizerId !== auth.user.id) return forbidden();

  const body = await readJson(request);
  if (!body) return badRequest();
  if (body.mode !== "auto" && body.mode !== "manual") return badRequest('mode debe ser "auto" o "manual"');
  const replace = body.replace === true;

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
