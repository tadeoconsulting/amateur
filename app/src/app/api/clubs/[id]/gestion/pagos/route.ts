import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest } from "@/_lib/auth";
import { requireClubManager } from "@/_lib/club-gestion-guard";
import { balanceCents, centsToSoles, collectionSummary, debtSummary, feeStatus, isMonth, isOverdue, paidCents, peruDate, peruMonth } from "@/_lib/club-fees";
import { asPaymentLike, clubFeeSettings, ensureClubFees, toCents } from "@/_lib/club-fees-server";
import { compareByLastName, fullName, playerIdentity } from "@/_lib/player-identity";

// La lista de cuotas de un mes (especificación 015): quién pagó, quién debe y cuánto se lleva recaudado. Genera los meses
// que falten antes de leer.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const now = new Date();
  const currentMonth = peruMonth(now);
  const today = peruDate(now);
  const requested = request.nextUrl.searchParams.get("mes");
  if (requested !== null && !isMonth(requested)) return badRequest("El mes debe tener la forma AAAA-MM");
  if (requested !== null && requested > currentMonth) return badRequest("Todavía no hay cuotas de ese mes");
  const month = requested ?? currentMonth;

  await ensureClubFees(id, now);
  const settings = await clubFeeSettings(id);

  // Todos los meses del club: de ahí salen la deuda de cada jugador y los meses que se pueden consultar.
  const allFees = await prisma.memberFee.findMany({
    where: { clubId: id },
    select: {
      id: true,
      playerId: true,
      month: true,
      amountDue: true,
      payments: { select: { amount: true, voidedAt: true } },
      player: {
        select: {
          status: true,
          clubId: true,
          firstName: true,
          lastName: true,
          user: { select: { firstName: true, lastName: true, avatarUrl: true } },
          category: { select: { name: true } },
          feeSetting: { select: { clubId: true, monthlyFeeOverride: true } },
        },
      },
    },
  });

  const monthsAvailable = [...new Set(allFees.map((f) => f.month))].sort().reverse();
  const byPlayer = new Map<string, typeof allFees>();
  for (const f of allFees) byPlayer.set(f.playerId, [...(byPlayer.get(f.playerId) ?? []), f]);

  const rows = allFees
    .filter((f) => f.month === month)
    .map((f) => {
      const due = toCents(f.amountDue);
      const paid = paidCents(f.payments.map(asPaymentLike));
      const status = feeStatus(due, paid);
      const who = playerIdentity({ user: f.player.user, firstName: f.player.firstName, lastName: f.player.lastName });
      const debt = debtSummary(
        (byPlayer.get(f.playerId) ?? []).map((x) => ({ month: x.month, dueCents: toCents(x.amountDue), paidCents: paidCents(x.payments.map(asPaymentLike)) })),
        settings.dueDay,
        today
      );
      const own = f.player.feeSetting && f.player.feeSetting.clubId === id ? f.player.feeSetting.monthlyFeeOverride : null;
      return {
        who,
        row: {
          playerId: f.playerId,
          feeId: f.id,
          name: fullName(who),
          provisional: who.provisional,
          categoryName: f.player.category?.name ?? null,
          // false = ya no está en el club, pero conserva su historial.
          active: f.player.clubId === id && f.player.status === "activo",
          amount: centsToSoles(due),
          paid: centsToSoles(paid),
          balance: centsToSoles(balanceCents(due, paid)),
          status,
          overdue: isOverdue(month, settings.dueDay, status, today),
          ownAmount: own === null ? null : centsToSoles(toCents(own)),
          owed: centsToSoles(debt.owedCents),
          overdueAmount: centsToSoles(debt.overdueCents),
          overdueMonths: debt.overdueMonths,
        },
        due,
        paidC: paid,
      };
    })
    .sort((a, b) => compareByLastName(a.who, b.who));

  const collection = collectionSummary(rows.map((r) => ({ month, dueCents: r.due, paidCents: r.paidC })));
  const count = (pred: (r: (typeof rows)[number]["row"]) => boolean) => rows.filter((r) => pred(r.row)).length;

  return Response.json({
    month,
    currentMonth,
    months: monthsAvailable,
    settings: { monthlyFee: centsToSoles(settings.feeCents), dueDay: settings.dueDay, defined: settings.defined },
    summary: {
      expected: centsToSoles(collection.expectedCents),
      collected: centsToSoles(collection.collectedCents),
      percent: collection.percent,
      paid: count((r) => r.status === "pagado"),
      partial: count((r) => r.status === "parcial"),
      pending: count((r) => r.status === "pendiente"),
      free: count((r) => r.status === "sin_cuota"),
      overdue: count((r) => r.overdue),
    },
    players: rows.map((r) => r.row),
  });
}
