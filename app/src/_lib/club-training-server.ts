import { prisma } from "./prisma";
import { GENERATION_DAYS, addDays, canMarkSession, peruToday, scheduleStarts, toPeru } from "./club-training";
import { compareByLastName, fullName, playerIdentity } from "./player-identity";

// Entrenamientos de un club (especificación 015, entrega 2): lo que necesita acceso a la base. Las reglas viven en
// club-training.ts.

/**
 * Genera las sesiones de los horarios activos del club para los próximos `GENERATION_DAYS` días. Es idempotente: la clave
 * única (horario + instante) evita duplicados aunque dos pantallas lo pidan a la vez. Una sesión que el delegado ya movió
 * o canceló no se recrea ni se pisa, porque conserva su fila (aunque ya no coincida con el horario).
 */
export async function ensureTrainingSessions(clubId: string, now = new Date()) {
  const schedules = await prisma.trainingSchedule.findMany({ where: { clubId, active: true } });
  if (schedules.length === 0) return;
  const from = peruToday(now);

  const rows = schedules.flatMap((s) =>
    scheduleStarts(s, from).map((startsAt) => ({ clubId, categoryId: s.categoryId, scheduleId: s.id, startsAt, durationMin: s.durationMin, placeId: s.placeId }))
  );
  // Las sesiones de hoy que ya empezaron también se generan: el delegado pasa lista de la de hoy.
  if (rows.length > 0) await prisma.trainingSession.createMany({ data: rows, skipDuplicates: true });
}

/** Un horario cambió o se desactivó: las sesiones que todavía no empiezan, que nadie movió a mano y sin asistencia se rehacen. */
export async function resetFutureSessions(scheduleId: string, now = new Date()) {
  await prisma.trainingSession.deleteMany({ where: { scheduleId, movedManually: false, status: "programada", startsAt: { gt: now }, attendances: { none: {} } } });
}

/** La ventana de fechas (AAAA-MM-DD, hora de Perú) de una consulta de sesiones: por omisión, de hoy a 28 días. */
export function sessionWindow(now: Date, desde: string | null, hasta: string | null) {
  const from = desde ?? peruToday(now);
  const to = hasta ?? addDays(from, GENERATION_DAYS);
  return { from, to };
}

/**
 * Los jugadores que pasan lista en una sesión: los activos de su categoría (o de todo el club si no tiene), más cualquiera
 * que ya tenga una marca en ella aunque haya cambiado de categoría o salido del club.
 */
export async function trainingRoster(session: { id: string; clubId: string; categoryId: string | null }) {
  const profiles = await prisma.playerProfile.findMany({
    where: {
      OR: [
        { clubId: session.clubId, status: "activo", ...(session.categoryId ? { categoryId: session.categoryId } : {}) },
        { attendances: { some: { sessionId: session.id } } },
      ],
    },
    select: {
      id: true,
      position: true,
      number: true,
      firstName: true,
      lastName: true,
      user: { select: { firstName: true, lastName: true, avatarUrl: true } },
      category: { select: { name: true } },
    },
  });
  return profiles
    .map((p) => {
      const who = playerIdentity({ user: p.user, firstName: p.firstName, lastName: p.lastName });
      return { id: p.id, who, name: fullName(who), provisional: who.provisional, position: p.position, number: p.number, categoryName: p.category?.name ?? null };
    })
    .sort((a, b) => compareByLastName(a.who, b.who));
}

/** La categoría y el lugar de un horario o una sesión tienen que ser de este club, y el lugar no puede estar archivado. */
export async function trainingRefsError(clubId: string, categoryId: string | null, placeId: string): Promise<string | null> {
  if (categoryId !== null) {
    const category = await prisma.teamCategory.findFirst({ where: { id: categoryId, clubId }, select: { id: true } });
    if (!category) return "La categoría no pertenece a este club";
  }
  const place = await prisma.trainingPlace.findFirst({ where: { id: placeId, clubId }, select: { archivedAt: true } });
  if (!place) return "El lugar no pertenece a este club";
  if (place.archivedAt) return "Ese lugar está archivado: elige otro";
  return null;
}

/** Un horario tal como lo devuelve la API. */
export const scheduleView = (s: { id: string; categoryId: string | null; weekday: number; startTime: string; durationMin: number; placeId: string; category?: { name: string } | null; place?: { name: string } | null }) => ({
  id: s.id,
  categoryId: s.categoryId,
  categoryName: s.category?.name ?? null,
  weekday: s.weekday,
  startTime: s.startTime,
  durationMin: s.durationMin,
  placeId: s.placeId,
  placeName: s.place?.name ?? null,
});

export type SessionRow = {
  id: string;
  categoryId: string | null;
  scheduleId: string | null;
  startsAt: Date;
  durationMin: number;
  placeId: string;
  status: string;
  category: { name: string } | null;
  place: { name: string };
  attendances: { status: string }[];
};

/** Una sesión tal como la devuelve la API, con lo marcado hasta ahora. */
export function sessionView(s: SessionRow, rosterSize: number, now: Date) {
  const local = toPeru(s.startsAt);
  const count = (status: string) => s.attendances.filter((a) => a.status === status).length;
  return {
    id: s.id,
    categoryId: s.categoryId,
    categoryName: s.category?.name ?? null,
    scheduleId: s.scheduleId,
    date: local.date,
    time: local.time,
    weekday: local.weekday,
    startsAt: s.startsAt,
    durationMin: s.durationMin,
    placeId: s.placeId,
    placeName: s.place.name,
    status: s.status,
    rosterSize,
    marked: s.attendances.length,
    presente: count("presente"),
    ausente: count("ausente"),
    justificado: count("justificado"),
    canMark: canMarkSession(s, now),
  };
}

/** Cuántos jugadores activos hay por categoría (la clave "" es todo el club). */
export async function rosterSizes(clubId: string) {
  const groups = await prisma.playerProfile.groupBy({ by: ["categoryId"], where: { clubId, status: "activo" }, _count: { _all: true } });
  const byCategory = new Map(groups.map((g) => [g.categoryId, g._count._all]));
  const total = groups.reduce((sum, g) => sum + g._count._all, 0);
  return (categoryId: string | null) => (categoryId === null ? total : (byCategory.get(categoryId) ?? 0));
}
