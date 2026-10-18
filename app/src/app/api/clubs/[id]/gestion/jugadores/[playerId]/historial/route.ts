import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { requireClubManager } from "@/_lib/club-gestion-guard";
import { balanceCents, centsToSoles, feeStatus, isOverdue, paidCents, peruDate } from "@/_lib/club-fees";
import { asPaymentLike, clubFeeSettings, ensureClubFees, toCents } from "@/_lib/club-fees-server";
import { fullName, playerIdentity } from "@/_lib/player-identity";

// Todos los meses de un jugador con sus abonos, también los anulados: la trazabilidad (quién cobró, cuándo y quién lo deshizo).
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string; playerId: string }> }) {
  const { id, playerId } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  await ensureClubFees(id);
  const settings = await clubFeeSettings(id);
  const today = peruDate(new Date());

  const player = await prisma.playerProfile.findFirst({
    where: { id: playerId, OR: [{ clubId: id }, { fees: { some: { clubId: id } } }] },
    select: {
      firstName: true,
      lastName: true,
      user: { select: { firstName: true, lastName: true, avatarUrl: true } },
      feeSetting: { select: { clubId: true, monthlyFeeOverride: true, startMonth: true } },
      fees: {
        where: { clubId: id },
        orderBy: { month: "desc" },
        select: { id: true, month: true, amountDue: true, payments: { orderBy: { paidAt: "desc" }, select: { id: true, amount: true, paidAt: true, createdById: true, voidedAt: true, voidedById: true } } },
      },
    },
  });
  if (!player) return Response.json({ error: "Jugador no encontrado en este club" }, { status: 404 });

  const userIds = new Set<string>();
  for (const f of player.fees) for (const p of f.payments) [p.createdById, p.voidedById].forEach((u) => u && userIds.add(u));
  const users = await prisma.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, firstName: true, lastName: true } });
  const nameOf = (userId: string | null) => {
    const u = users.find((x) => x.id === userId);
    return u ? fullName(u) : null;
  };

  const setting = player.feeSetting && player.feeSetting.clubId === id ? player.feeSetting : null;
  return Response.json({
    player: { id: playerId, name: fullName(playerIdentity({ user: player.user, firstName: player.firstName, lastName: player.lastName })) },
    ownAmount: setting?.monthlyFeeOverride == null ? null : centsToSoles(toCents(setting.monthlyFeeOverride)),
    startMonth: setting?.startMonth ?? null,
    months: player.fees.map((f) => {
      const due = toCents(f.amountDue);
      const paid = paidCents(f.payments.map(asPaymentLike));
      const status = feeStatus(due, paid);
      return {
        feeId: f.id,
        month: f.month,
        amount: centsToSoles(due),
        paid: centsToSoles(paid),
        balance: centsToSoles(balanceCents(due, paid)),
        status,
        overdue: isOverdue(f.month, settings.dueDay, status, today),
        payments: f.payments.map((p) => ({
          id: p.id,
          amount: centsToSoles(toCents(p.amount)),
          paidAt: p.paidAt,
          by: nameOf(p.createdById),
          voidedAt: p.voidedAt,
          voidedBy: nameOf(p.voidedById),
        })),
      };
    }),
  });
}
