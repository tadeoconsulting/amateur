import { prisma } from "./prisma";
import { CLUB_REF_SELECT } from "./club-public";
import { balanceCents, centsToSoles, feeStatus, isOverdue, paidCents, paymentProgress, peruDate } from "./club-fees";
import { asPaymentLike, clubFeeSettings, ensureClubFees, toCents } from "./club-fees-server";
import { GENERATION_DAYS, addDays, fromPeru, isAttendanceStatus, peruToday, playerAttendance, toPeru, type AttendanceStatus } from "./club-training";
import { ensureTrainingSessions } from "./club-training-server";

// Lo que un jugador ve de SU club (especificación 015, entrega 3): sus próximos entrenamientos, su asistencia y sus pagos.
// Es privado: se lee solo de las fichas de quien tiene la sesión (nunca de un id que llegue de afuera) y de la asistencia
// solo sale la marca del propio jugador, jamás la de sus compañeros.

const ATTENDANCE_WINDOW_DAYS = 90;
const MONTHS_SHOWN = 12;

export async function playerClubProgress(userId: string, now = new Date()) {
  const today = peruToday(now);
  const profiles = await prisma.playerProfile.findMany({
    where: { userId, clubId: { not: null }, status: "activo" },
    select: { id: true, clubId: true, categoryId: true, category: { select: { name: true } }, club: { select: CLUB_REF_SELECT } },
    orderBy: { createdAt: "asc" },
  });

  const result = [];
  for (const p of profiles) {
    if (!p.clubId || !p.club) continue;
    const clubId = p.clubId;
    await Promise.all([ensureClubFees(clubId, now, p.id), ensureTrainingSessions(clubId, now)]);

    // Las sesiones de su categoría y las de todo el club (sin categoría).
    const categoryFilter = p.categoryId ? { OR: [{ categoryId: p.categoryId }, { categoryId: null }] } : { categoryId: null };

    const upcoming = await prisma.trainingSession.findMany({
      where: { clubId, ...categoryFilter, startsAt: { gte: fromPeru(today, "00:00"), lt: fromPeru(addDays(today, GENERATION_DAYS), "00:00") } },
      select: { id: true, startsAt: true, durationMin: true, status: true, category: { select: { name: true } }, place: { select: { name: true, address: true } } },
      orderBy: { startsAt: "asc" },
    });
    // Sigue siendo "próximo" mientras no termine.
    const sessions = upcoming
      .filter((s) => s.startsAt.getTime() + s.durationMin * 60_000 >= now.getTime())
      .map((s) => {
        const local = toPeru(s.startsAt);
        return { id: s.id, date: local.date, time: local.time, durationMin: s.durationMin, status: s.status, categoryName: s.category?.name ?? null, placeName: s.place.name, placeAddress: s.place.address };
      });

    // Asistencia: de las sesiones ya hechas, solo su propia marca (las de los demás no salen de la base).
    const past = await prisma.trainingSession.findMany({
      where: { clubId, ...categoryFilter, status: "programada", startsAt: { gte: fromPeru(addDays(today, -ATTENDANCE_WINDOW_DAYS), "00:00"), lt: fromPeru(addDays(today, 1), "00:00") } },
      select: { id: true, status: true, startsAt: true, category: { select: { name: true } }, _count: { select: { attendances: true } }, attendances: { where: { playerId: p.id }, select: { playerId: true, status: true } } },
      orderBy: { startsAt: "desc" },
    });
    const attendance = playerAttendance(
      past.map((s) => ({
        sessionId: s.id,
        status: s.status,
        // Una sesión realizada es la que tiene alguna marca (de cualquiera); solo se conserva la propia.
        marks: s._count.attendances === 0 ? [] : s.attendances.length > 0 ? s.attendances.filter((a): a is { playerId: string; status: AttendanceStatus } => isAttendanceStatus(a.status)) : [{ playerId: "__nadie__", status: "presente" as const }],
      })),
      p.id
    );
    const bySession = new Map(past.map((s) => [s.id, s]));

    // Pagos: sus meses, el progreso y lo que debe.
    const { dueDay } = await clubFeeSettings(clubId);
    const fees = await prisma.memberFee.findMany({
      where: { playerId: p.id, clubId },
      select: { month: true, amountDue: true, payments: { select: { amount: true, paidAt: true, voidedAt: true } } },
      orderBy: { month: "desc" },
    });
    const months = fees.map((f) => ({ month: f.month, dueCents: toCents(f.amountDue), paidCents: paidCents(f.payments.map(asPaymentLike)), payments: f.payments }));
    const progress = paymentProgress(months, dueDay, peruDate(now));

    result.push({
      club: p.club,
      playerId: p.id,
      categoryName: p.category?.name ?? null,
      sessions,
      attendance: {
        windowDays: ATTENDANCE_WINDOW_DAYS,
        percent: attendance.percent,
        presente: attendance.presente,
        ausente: attendance.ausente,
        justificado: attendance.justificado,
        recent: attendance.recent.map((r) => {
          const s = bySession.get(r.sessionId)!;
          return { date: toPeru(s.startsAt).date, time: toPeru(s.startsAt).time, categoryName: s.category?.name ?? null, status: r.status };
        }),
      },
      payments: {
        defined: months.length > 0,
        monthlyAmount: months.length > 0 ? centsToSoles(months[0].dueCents) : null,
        dueMonths: progress.dueMonths,
        paidMonths: progress.paidMonths,
        owed: centsToSoles(progress.owedCents),
        overdue: centsToSoles(progress.overdueCents),
        overdueMonths: progress.overdueMonths,
        months: months.slice(0, MONTHS_SHOWN).map((m) => {
          const status = feeStatus(m.dueCents, m.paidCents);
          const lastPaid = m.payments.filter((x) => x.voidedAt === null).sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())[0];
          return {
            month: m.month,
            amount: centsToSoles(m.dueCents),
            paid: centsToSoles(m.paidCents),
            balance: centsToSoles(balanceCents(m.dueCents, m.paidCents)),
            status,
            overdue: isOverdue(m.month, dueDay, status, peruDate(now)),
            lastPaidAt: lastPaid ? toPeru(lastPaid.paidAt).date : null,
          };
        }),
      },
    });
  }
  return result;
}
