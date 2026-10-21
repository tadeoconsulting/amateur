import { prisma } from "./prisma";
import { balanceCents, centsToSoles, collectionSummary, debtSummary, feeStatus, isOverdue, lastMonths, nextMonth, paidCents, peruDate, peruMonth, rankDelinquents } from "./club-fees";
import { asPaymentLike, clubFeeSettings, ensureClubFees, toCents } from "./club-fees-server";
import { addDays, attendanceSummary, fromPeru, isAttendanceStatus, sessionCounts, toPeru, weeklyAttendanceTrend, weekStart, type AttendanceStatus } from "./club-training";
import { ensureTrainingSessions } from "./club-training-server";
import { compareByLastName, fullName, playerIdentity } from "./player-identity";

// El dashboard del delegado (especificación 015, entrega 4): cobro y asistencia de un mes, con filtro por categoría. Solo
// arma lo que ya calculan las reglas puras de club-fees.ts y club-training.ts.

const TREND_WEEKS = 12;
const SERIES_MONTHS = 6;
const LIST_LIMIT = 8;

export async function clubDashboard(clubId: string, opts: { month: string; categoryId: string | null; now: Date }) {
  const { month, categoryId, now } = opts;
  const today = peruDate(now);
  const currentMonth = peruMonth(now);
  await Promise.all([ensureClubFees(clubId, now), ensureTrainingSessions(clubId, now)]);
  const { dueDay, defined } = await clubFeeSettings(clubId);

  // ── Cobro ────────────────────────────────────────────────────────────────────────────────────────────────────
  const fees = await prisma.memberFee.findMany({
    where: { clubId, ...(categoryId ? { player: { categoryId } } : {}) },
    select: {
      playerId: true,
      month: true,
      amountDue: true,
      payments: { select: { amount: true, voidedAt: true } },
      player: { select: { firstName: true, lastName: true, user: { select: { firstName: true, lastName: true, avatarUrl: true } }, category: { select: { name: true } } } },
    },
  });
  const rows = fees.map((f) => ({ ...f, dueCents: toCents(f.amountDue), paidC: paidCents(f.payments.map(asPaymentLike)) }));

  const monthsAvailable = [...new Set(rows.map((r) => r.month))].sort().reverse();
  const ofMonth = (m: string) => rows.filter((r) => r.month === m).map((r) => ({ month: m, dueCents: r.dueCents, paidCents: r.paidC }));
  const selected = ofMonth(month);
  const collection = collectionSummary(selected);
  const statusOf = (r: (typeof rows)[number]) => feeStatus(r.dueCents, r.paidC);
  const inMonth = rows.filter((r) => r.month === month);

  const series = lastMonths(month, SERIES_MONTHS).map((m) => {
    const c = collectionSummary(ofMonth(m));
    return { month: m, expected: centsToSoles(c.expectedCents), collected: centsToSoles(c.collectedCents), percent: ofMonth(m).length === 0 ? null : c.percent };
  });

  // Morosos: la deuda vencida de cada jugador a hoy (no depende del mes que se mira).
  const byPlayer = new Map<string, typeof rows>();
  for (const r of rows) byPlayer.set(r.playerId, [...(byPlayer.get(r.playerId) ?? []), r]);
  const debtors = rankDelinquents(
    [...byPlayer.entries()].map(([playerId, list]) => {
      const debt = debtSummary(list.map((r) => ({ month: r.month, dueCents: r.dueCents, paidCents: r.paidC })), dueDay, today);
      const who = playerIdentity({ user: list[0].player.user, firstName: list[0].player.firstName, lastName: list[0].player.lastName });
      return { playerId, who, name: fullName(who), categoryName: list[0].player.category?.name ?? null, ...debt };
    })
  );
  const morosos = {
    count: debtors.length,
    owed: centsToSoles(debtors.reduce((sum, d) => sum + d.owedCents, 0)),
    overdue: centsToSoles(debtors.reduce((sum, d) => sum + d.overdueCents, 0)),
    list: debtors.slice(0, LIST_LIMIT).map((d) => ({ playerId: d.playerId, name: d.name, categoryName: d.categoryName, owed: centsToSoles(d.owedCents), overdue: centsToSoles(d.overdueCents), overdueMonths: d.overdueMonths })),
  };

  // ── Asistencia ───────────────────────────────────────────────────────────────────────────────────────────────
  // El mes elegido, y las semanas que terminan con él (o con hoy, si es el mes en curso) para la tendencia.
  const monthStart = `${month}-01`;
  const monthEndExclusive = `${nextMonth(month)}-01`;
  const lastDay = addDays(monthEndExclusive, -1);
  const trendEnd = lastDay > today ? today : lastDay;
  const trendFrom = addDays(weekStart(trendEnd), -7 * (TREND_WEEKS - 1));
  const from = trendFrom < monthStart ? trendFrom : monthStart;

  const raw = await prisma.trainingSession.findMany({
    where: { clubId, startsAt: { gte: fromPeru(from, "00:00"), lt: fromPeru(monthEndExclusive, "00:00") } },
    select: { id: true, categoryId: true, status: true, startsAt: true, attendances: { select: { playerId: true, status: true } } },
  });
  const sessions = raw.map((s) => ({
    sessionId: s.id,
    categoryId: s.categoryId,
    status: s.status,
    date: toPeru(s.startsAt).date,
    marks: s.attendances.filter((a): a is { playerId: string; status: AttendanceStatus } => isAttendanceStatus(a.status)),
  }));
  const inCategory = (s: (typeof sessions)[number]) => !categoryId || s.categoryId === categoryId;
  const monthSessions = sessions.filter((s) => s.date >= monthStart && s.date < monthEndExclusive);

  const summary = attendanceSummary(monthSessions.filter(inCategory));
  const allCategories = await prisma.teamCategory.findMany({ where: { clubId }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  // El desglose por categoría compara a todas, aunque se esté filtrando una.
  const byCategorySummary = attendanceSummary(monthSessions);

  const profiles = await prisma.playerProfile.findMany({
    where: { id: { in: [...summary.players.keys()] } },
    select: { id: true, firstName: true, lastName: true, user: { select: { firstName: true, lastName: true, avatarUrl: true } }, category: { select: { name: true } } },
  });
  const lowest = profiles
    .map((p) => {
      const who = playerIdentity({ user: p.user, firstName: p.firstName, lastName: p.lastName });
      const c = summary.players.get(p.id)!;
      return { who, row: { playerId: p.id, name: fullName(who), categoryName: p.category?.name ?? null, presente: c.presente, ausente: c.ausente, justificado: c.justificado, percent: c.percent } };
    })
    .filter((p) => p.row.percent !== null)
    .sort((a, b) => (a.row.percent as number) - (b.row.percent as number) || compareByLastName(a.who, b.who))
    .slice(0, LIST_LIMIT)
    .map((p) => p.row);

  return {
    month,
    currentMonth,
    months: monthsAvailable.length > 0 ? monthsAvailable : [currentMonth],
    categories: allCategories,
    categoryId,
    cobro: {
      defined,
      expected: centsToSoles(collection.expectedCents),
      collected: centsToSoles(collection.collectedCents),
      percent: collection.percent,
      players: inMonth.length,
      paid: inMonth.filter((r) => statusOf(r) === "pagado").length,
      partial: inMonth.filter((r) => statusOf(r) === "parcial").length,
      pending: inMonth.filter((r) => statusOf(r) === "pendiente").length,
      free: inMonth.filter((r) => statusOf(r) === "sin_cuota").length,
      overdue: inMonth.filter((r) => isOverdue(month, dueDay, statusOf(r), today)).length,
      balance: centsToSoles(inMonth.reduce((sum, r) => sum + balanceCents(r.dueCents, r.paidC), 0)),
      series,
    },
    morosos,
    asistencia: {
      percent: summary.clubPercent,
      sessions: summary.sessions,
      categories: allCategories.map((c) => ({ id: c.id, name: c.name, ...(byCategorySummary.byCategory.get(c.id) ?? { sessions: 0, percent: null }) })),
      lowest,
      trend: weeklyAttendanceTrend(sessions.filter(inCategory), trendEnd, TREND_WEEKS),
    },
    sesiones: sessionCounts(monthSessions.filter(inCategory), today),
  };
}
