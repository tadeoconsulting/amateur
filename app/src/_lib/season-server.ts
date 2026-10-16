// Temporadas (especificación 012): lo que necesita la base. La lógica pura está en season.ts.
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { isAdmin, type CurrentUser } from "./auth";
import { newTournamentSlug } from "./tournament-slug";
import { computeLiveStandings, computeStandings } from "./standings";
import { matchClock } from "./match-live";
import { countsForGeneral, finalOutdated, seasonChampion, seasonStatus, tournamentChampion, type SeasonStage } from "./season";

type Db = Prisma.TransactionClient | typeof prisma;

const CLUB_SELECT = { id: true, name: true, shortName: true, logoUrl: true, color: true } as const;

export const SEASON_TOURNAMENT_SELECT = {
  id: true,
  name: true,
  slug: true,
  status: true,
  format: true,
  seasonStage: true,
  playoffTeams: true,
  startDate: true,
} satisfies Prisma.TournamentSelect;

export const SEASON_SELECT = {
  id: true,
  name: true,
  slug: true,
  organizerId: true,
  finalFormat: true,
  finalTeams: true,
  deletedAt: true,
  createdAt: true,
  organizer: { select: { organizerSlug: true } },
  tournaments: { select: SEASON_TOURNAMENT_SELECT, orderBy: { startDate: "asc" as const } },
} satisfies Prisma.SeasonSelect;

export type SeasonRecord = Prisma.SeasonGetPayload<{ select: typeof SEASON_SELECT }>;
type SeasonTournament = SeasonRecord["tournaments"][number];

/** La temporada no eliminada, o null. */
export function findSeason(id: string, db: Db = prisma): Promise<SeasonRecord | null> {
  return db.season.findFirst({ where: { id, deletedAt: null }, select: SEASON_SELECT });
}

/** ¿Puede gestionarla? Su organizador o un admin. */
export function canManageSeason(user: CurrentUser, season: { organizerId: string }): boolean {
  return isAdmin(user) || season.organizerId === user.id;
}

/** El torneo de una etapa, si la temporada ya lo tiene. */
export function stageOf(season: { tournaments: SeasonTournament[] }, stage: SeasonStage): SeasonTournament | undefined {
  return season.tournaments.find((t) => t.seasonStage === stage);
}

/**
 * Si los equipos de este torneo ya no se pueden cambiar por ser parte de una temporada, el motivo; si no,
 * null. Son los de la Apertura (decisión 3): se fijan al crear el Clausura, y el Clausura y la fase final
 * nacen con los suyos.
 */
export async function seasonTeamsLock(tournamentId: string, db: Db = prisma): Promise<string | null> {
  const t = await db.tournament.findUnique({ where: { id: tournamentId }, select: { seasonId: true, seasonStage: true } });
  if (!t?.seasonId) return null;
  if (t.seasonStage === "apertura") {
    const clausura = await db.tournament.count({ where: { seasonId: t.seasonId, seasonStage: "clausura" } });
    if (clausura === 0) return null;
  }
  return "El torneo es parte de una temporada: sus equipos son los de la Apertura y no se pueden cambiar";
}

/**
 * La tabla General: los equipos de la Apertura con los partidos de liga de Apertura y Clausura (sin llaves
 * ni fase final). Con `live`, suma los que se están jugando, igual que la tabla de un torneo.
 */
export async function seasonGeneral(season: { tournaments: SeasonTournament[] }, live = false, db: Db = prisma) {
  const apertura = stageOf(season, "apertura");
  if (!apertura) return [];
  const phases = [apertura, stageOf(season, "clausura")].filter((t): t is SeasonTournament => t !== undefined);

  const [teams, matches] = await Promise.all([
    db.tournamentTeam.findMany({ where: { tournamentId: apertura.id }, include: { club: { select: CLUB_SELECT } }, orderBy: { enrolledAt: "asc" } }),
    db.match.findMany({
      where: { tournamentId: { in: phases.map((t) => t.id) }, decisive: false, status: live ? { in: ["finalizado", "en_curso"] } : "finalizado" },
      select: {
        status: true, decisive: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true,
        startedAt: true, period: true, firstHalfEndedAt: true, secondHalfStartedAt: true,
        tournament: { select: { minutesPerHalf: true } },
      },
    }),
  ]);

  // Un partido "en curso" que nadie finalizó (se da por olvidado, ver matchClock) no mueve la tabla.
  const now = Date.now();
  const inPlay = matches.filter((m) => m.status === "en_curso" && !matchClock(m, now, m.tournament.minutesPerHalf).stale);
  const rows = computeLiveStandings(
    teams.map((t) => ({ clubId: t.clubId, groupName: null })),
    matches.filter(countsForGeneral),
    inPlay
  );

  const club = new Map(teams.map((t) => [t.clubId, t.club]));
  return rows.map((row) => ({
    ...row,
    clubName: club.get(row.clubId)?.name ?? "",
    shortName: club.get(row.clubId)?.shortName ?? "",
    logoUrl: club.get(row.clubId)?.logoUrl ?? null,
    color: club.get(row.clubId)?.color ?? null,
  }));
}

/** Lo que el Clausura y la fase final heredan del torneo anterior (sin nombre, fechas, cupo ni estado). */
const INHERITED_SELECT = {
  sportType: true, category: true, logoUrl: true, location: true, modality: true, gender: true, minutesPerHalf: true,
  playersPerTeam: true, assignDelegates: true, registrationFee: true, refereeFee: true, rules: true,
  extraTimeMinutes: true, playoffTeams: true,
} satisfies Prisma.TournamentSelect;

/**
 * Crea el Clausura o la fase final: un torneo nuevo con la configuración de `from` y exactamente los
 * equipos `clubIds`, inscritos en ese orden (de ahí sale la siembra del cuadro, ver planBracket). Solo el
 * Clausura repite las llaves de la Apertura; la fase final no tiene llaves propias (es el cuadro o la liguilla).
 */
export async function createSeasonTournament(input: {
  season: { id: string; organizerId: string };
  stage: "clausura" | "final";
  from: string;
  name: string;
  startDate: Date;
  location?: string;
  format: "liga" | "eliminacion";
  clubIds: string[];
}): Promise<{ id: string } | { error: string }> {
  const { season, stage, clubIds } = input;
  const source = await prisma.tournament.findUniqueOrThrow({ where: { id: input.from }, select: INHERITED_SELECT });
  try {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.tournament.create({
        data: {
          ...source,
          name: input.name,
          format: input.format,
          startDate: input.startDate,
          location: input.location ?? source.location,
          playoffTeams: stage === "clausura" ? source.playoffTeams : null,
          maxTeams: clubIds.length,
          // Como un torneo recién creado por el asistente: en la pantalla del organizador queda listo
          // para "Iniciar torneo" (sus equipos ya están y no se pueden cambiar, ver seasonTeamsLock).
          status: "inscripcion",
          organizerId: season.organizerId,
          slug: await newTournamentSlug(season.organizerId, input.name, tx),
          seasonId: season.id,
          seasonStage: stage,
        },
        select: { id: true },
      });
      const base = Date.now();
      await tx.tournamentTeam.createMany({
        data: clubIds.map((clubId, i) => ({ tournamentId: created.id, clubId, enrolledAt: new Date(base + i) })),
      });
      return created;
    });
  } catch (error) {
    // El índice (seasonId, seasonStage) frena un segundo Clausura o una segunda fase final pedidos a la vez.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "La temporada ya tiene ese torneo, o se creó otro igual al mismo tiempo: vuelve a cargar la página" };
    }
    throw error;
  }
}

/** Campeón de un torneo de la temporada (null si todavía no terminó). */
async function championOf(t: SeasonTournament, db: Db): Promise<string | null> {
  if (t.status !== "finalizado") return null;
  const [teams, matches] = await Promise.all([
    db.tournamentTeam.findMany({ where: { tournamentId: t.id }, select: { clubId: true } }),
    db.match.findMany({
      where: { tournamentId: t.id, status: "finalizado" },
      select: { status: true, decisive: true, nextMatchId: true, winnerTeamId: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
    }),
  ]);
  const standings = computeStandings(teams.map((x) => ({ clubId: x.clubId, groupName: null })), matches.filter(countsForGeneral));
  return tournamentChampion(t, standings, matches);
}

/** La temporada como la devuelve la API: sus torneos con su campeón, su estado, el campeón de temporada y el aviso de la decisión G. */
export async function seasonSummary(season: SeasonRecord, db: Db = prisma) {
  const apertura = stageOf(season, "apertura");
  const clausura = stageOf(season, "clausura");
  const final = stageOf(season, "final");
  const status = seasonStatus(season.finalFormat, { apertura, clausura, final });

  const [general, champions, finalEnrolled, clubs] = await Promise.all([
    seasonGeneral(season, false, db),
    Promise.all(season.tournaments.map((t) => championOf(t, db))),
    final ? db.tournamentTeam.findMany({ where: { tournamentId: final.id }, select: { clubId: true } }) : Promise.resolve([]),
    apertura ? db.tournamentTeam.findMany({ where: { tournamentId: apertura.id }, select: { club: { select: CLUB_SELECT } } }) : Promise.resolve([]),
  ]);

  const club = new Map(clubs.map((c) => [c.club.id, c.club]));
  const clubRef = (clubId: string | null) => (clubId ? club.get(clubId) ?? null : null);
  const championByTournament = new Map(season.tournaments.map((t, i) => [t.id, champions[i]]));
  const champion = seasonChampion(season.finalFormat, status, general, final ? championByTournament.get(final.id) ?? null : null);

  return {
    id: season.id,
    name: season.name,
    slug: season.slug,
    organizerId: season.organizerId,
    organizerSlug: season.organizer.organizerSlug,
    finalFormat: season.finalFormat,
    finalTeams: season.finalTeams,
    status,
    createdAt: season.createdAt,
    teamsCount: clubs.length,
    tournaments: season.tournaments.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      format: t.format,
      playoffTeams: t.playoffTeams,
      stage: t.seasonStage,
      champion: clubRef(championByTournament.get(t.id) ?? null),
    })),
    champion: clubRef(champion),
    // Decisión G: si se corrigió un partido después de generar la fase final, se avisa pero no se recalcula.
    finalOutdated: final !== undefined && season.finalTeams !== null && finalOutdated(general, season.finalTeams, finalEnrolled.map((e) => e.clubId)),
  };
}
