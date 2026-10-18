import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest } from "@/_lib/auth";
import { requireClubManager } from "@/_lib/club-gestion-guard";
import { addDays, attendanceSummary, fromPeru, isAttendanceStatus, isDate, peruToday, type AttendanceStatus } from "@/_lib/club-training";
import { compareByLastName, fullName, playerIdentity } from "@/_lib/player-identity";

const DEFAULT_WINDOW_DAYS = 90;

// Los promedios de asistencia del club (especificación 015, entrega 2): del club, de cada categoría y de cada jugador.
// Por omisión mira los últimos 90 días; `categoria` filtra a una categoría.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const now = new Date();
  const hasta = request.nextUrl.searchParams.get("hasta") ?? peruToday(now);
  const desde = request.nextUrl.searchParams.get("desde") ?? addDays(hasta, -DEFAULT_WINDOW_DAYS);
  const categoria = request.nextUrl.searchParams.get("categoria");
  if (!isDate(desde) || !isDate(hasta)) return badRequest("Las fechas deben tener la forma AAAA-MM-DD");
  if (categoria) {
    const exists = await prisma.teamCategory.findFirst({ where: { id: categoria, clubId: id }, select: { id: true } });
    if (!exists) return badRequest("La categoría no pertenece a este club");
  }

  const sessions = await prisma.trainingSession.findMany({
    // El día `hasta` entra completo.
    where: { clubId: id, startsAt: { gte: fromPeru(desde, "00:00"), lt: fromPeru(addDays(hasta, 1), "00:00") }, ...(categoria ? { categoryId: categoria } : {}) },
    select: { id: true, categoryId: true, status: true, attendances: { select: { playerId: true, status: true } } },
  });
  const summary = attendanceSummary(
    sessions.map((s) => ({ sessionId: s.id, categoryId: s.categoryId, status: s.status, marks: s.attendances.filter((a): a is { playerId: string; status: AttendanceStatus } => isAttendanceStatus(a.status)) }))
  );

  const [categories, profiles] = await Promise.all([
    prisma.teamCategory.findMany({ where: { clubId: id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.playerProfile.findMany({
      where: { OR: [{ clubId: id, status: "activo", ...(categoria ? { categoryId: categoria } : {}) }, { id: { in: [...summary.players.keys()] } }] },
      select: { id: true, firstName: true, lastName: true, user: { select: { firstName: true, lastName: true, avatarUrl: true } }, category: { select: { name: true } } },
    }),
  ]);

  const players = profiles
    .map((p) => {
      const who = playerIdentity({ user: p.user, firstName: p.firstName, lastName: p.lastName });
      const c = summary.players.get(p.id) ?? { presente: 0, ausente: 0, justificado: 0, percent: null };
      return { who, row: { playerId: p.id, name: fullName(who), provisional: who.provisional, categoryName: p.category?.name ?? null, ...c } };
    })
    // Los de menor asistencia primero (los que no tienen datos al final), y por apellido entre iguales.
    .sort((a, b) => (a.row.percent ?? 101) - (b.row.percent ?? 101) || compareByLastName(a.who, b.who))
    .map((p) => p.row);

  return Response.json({
    desde,
    hasta,
    club: { percent: summary.clubPercent, sessions: summary.sessions },
    categories: categories.map((c) => ({ id: c.id, name: c.name, ...(summary.byCategory.get(c.id) ?? { sessions: 0, percent: null }) })),
    players,
  });
}
