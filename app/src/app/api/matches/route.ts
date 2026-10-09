import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageTournament, forbidden, readJson, requireUser } from "@/_lib/auth";
import { CLUB_REF_SELECT } from "@/_lib/club-public";
import { isRealDate } from "@/_lib/fixture";
import { CLASH_MESSAGE, hasScheduleClash } from "@/_lib/match-schedule";
import { OPEN_STATUSES } from "@/_lib/tournament-labels";

// "" = hora por definir.
const TIME_RE = /^(([01]\d|2[0-3]):[0-5]\d)?$/;

export async function GET(request: NextRequest) {
  const tournamentId = request.nextUrl.searchParams.get("tournamentId");
  const status = request.nextUrl.searchParams.get("status");
  const group = request.nextUrl.searchParams.get("group");
  const matchday = request.nextUrl.searchParams.get("matchday");
  const clubId = request.nextUrl.searchParams.get("clubId");
  // El id de USUARIO del jugador (no de PlayerProfile): sus partidos son los del club al que
  // pertenece ahora mismo. Sin este filtro, la pantalla de un jugador pedía TODOS los partidos
  // de la plataforma sin importar si tenía club — un jugador recién registrado, sin equipo
  // todavía, veía el fixture completo de cualquier torneo ajeno.
  const playerId = request.nextUrl.searchParams.get("playerId");

  // Los partidos de los torneos de un organizador: la pestaña "Partidos" de un organizador pedía
  // TODOS los de la plataforma, así que uno recién registrado veía los de cualquier otro.
  const organizerId = request.nextUrl.searchParams.get("organizerId");

  const where: Record<string, unknown> = {};
  if (tournamentId) where.tournamentId = tournamentId;
  // Los partidos de un torneo eliminado no salen en ninguna lista.
  where.tournament = { deletedAt: null, ...(organizerId ? { organizerId } : {}) };
  if (status) where.status = status;
  if (group) where.groupName = group;
  if (matchday) where.matchday = parseInt(matchday);
  if (clubId) where.OR = [{ homeTeamId: clubId }, { awayTeamId: clubId }];
  if (playerId) {
    where.OR = [
      { homeTeam: { players: { some: { userId: playerId } } } },
      { awayTeam: { players: { some: { userId: playerId } } } },
    ];
  }

  const matches = await prisma.match.findMany({
    where,
    include: {
      homeTeam: { select: CLUB_REF_SELECT },
      awayTeam: { select: CLUB_REF_SELECT },
      _count: { select: { events: true } },
      // El nombre del torneo, para las pantallas que agrupan partidos de varios torneos
      // (la actividad del jugador).
      tournament: { select: { id: true, name: true, minutesPerHalf: true, logoUrl: true } },
    },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });

  return Response.json(matches);
}

/**
 * Agrega un partido al fixture de un torneo que ya empezó (el organizador programa a mano los
 * que faltan: una fecha nueva, un cruce que quedó afuera). Los equipos tienen que estar
 * inscritos en el torneo; la hora puede quedar vacía ("Por definir"). Si el torneo ya figuraba
 * como finalizado, vuelve a "en_curso": hay un partido pendiente.
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    const body = await readJson(request);
    if (!body) return badRequest();

    const { tournamentId, homeTeamId, awayTeamId, date, time, location, matchday, groupName } = body;

    if (
      typeof tournamentId !== "string" || typeof homeTeamId !== "string" || typeof awayTeamId !== "string" ||
      typeof date !== "string" || !isRealDate(date) || typeof time !== "string" || !TIME_RE.test(time)
    ) {
      return badRequest("Campos requeridos faltantes o inválidos (date: YYYY-MM-DD, time: HH:MM o vacío)");
    }
    if (homeTeamId === awayTeamId) {
      return badRequest("El equipo local y el visitante deben ser distintos");
    }
    if (location !== undefined && (typeof location !== "string" || location.trim().length > 200)) {
      return badRequest("location debe ser un texto de hasta 200 caracteres");
    }
    if (matchday !== undefined && (!Number.isInteger(matchday) || (matchday as number) < 1 || (matchday as number) > 99)) {
      return badRequest("matchday debe ser un entero entre 1 y 99");
    }

    if (!(await canManageTournament(auth.user, tournamentId))) return forbidden();

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId }, select: { status: true } });
    if (!tournament) return Response.json({ error: "Torneo no encontrado" }, { status: 404 });
    if (OPEN_STATUSES.includes(tournament.status)) {
      return Response.json({ error: "El torneo todavía no empezó: el fixture se arma al iniciarlo" }, { status: 409 });
    }

    const enrolled = await prisma.tournamentTeam.count({ where: { tournamentId, clubId: { in: [homeTeamId, awayTeamId] } } });
    if (enrolled !== 2) return badRequest("Los dos equipos deben estar inscritos en el torneo");

    const day = new Date(`${date}T00:00:00Z`);
    const place = typeof location === "string" ? location.trim() : "";
    if (await hasScheduleClash({ tournamentId, date: day, time, homeTeamId, awayTeamId, location: place })) {
      return Response.json({ error: CLASH_MESSAGE }, { status: 409 });
    }

    const match = await prisma.$transaction(async (tx) => {
      const created = await tx.match.create({
        data: {
          tournamentId,
          homeTeamId,
          awayTeamId,
          date: day,
          time,
          location: place,
          matchday: Number.isInteger(matchday) ? (matchday as number) : 1,
          groupName: typeof groupName === "string" && groupName.trim() ? groupName.trim() : null,
        },
        include: { homeTeam: { select: CLUB_REF_SELECT }, awayTeam: { select: CLUB_REF_SELECT } },
      });
      await tx.tournament.updateMany({ where: { id: tournamentId, status: "finalizado" }, data: { status: "en_curso" } });
      return created;
    });

    return Response.json(match, { status: 201 });
  } catch (error) {
    console.error("Create match error:", error);
    return Response.json({ error: "Error al crear partido" }, { status: 500 });
  }
}
