import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { effectiveFeeCents, hasFeeDefined, monthsToGenerate, peruMonth, DEFAULT_DUE_DAY, type FeePaymentLike } from "./club-fees";

// Cuotas mensuales de un club (especificación 015): lo que necesita acceso a la base. Las reglas viven en club-fees.ts.

type DecimalLike = Prisma.Decimal | number | string;

/** Un Decimal de la base a céntimos enteros. */
export const toCents = (value: DecimalLike): number => Math.round(Number(value) * 100);

/** Céntimos a un Decimal para guardar. */
export const fromCents = (cents: number) => new Prisma.Decimal(cents).div(100);

/** Un abono de la base tal como lo entienden las reglas. */
export const asPaymentLike = (p: { amount: DecimalLike; voidedAt: Date | null }): FeePaymentLike => ({
  amountCents: toCents(p.amount),
  voided: p.voidedAt !== null,
});

/** La cuota estándar del club y su día de vencimiento (sin fila todavía: sin cuota definida y el día por omisión). */
export async function clubFeeSettings(clubId: string) {
  const row = await prisma.clubFeeSettings.findUnique({ where: { clubId } });
  return { feeCents: row ? toCents(row.monthlyFee) : 0, dueDay: row?.dueDay ?? DEFAULT_DUE_DAY, defined: !!row && toCents(row.monthlyFee) > 0 };
}

/**
 * Anota desde qué mes se le cobra a una ficha que entra a un club (el mes en que entra). Si ya tiene ese dato para ESTE
 * club no lo toca; si es de otro club (una ficha libre que se reutiliza), arranca de cero. Nunca rompe quien llama: unirse
 * a un club no puede fallar por las cuotas.
 */
export async function markFeeStart(userId: string, clubId: string, now = new Date()) {
  try {
    const profile = await prisma.playerProfile.findFirst({ where: { userId, clubId }, select: { id: true, feeSetting: { select: { clubId: true } } } });
    if (!profile || profile.feeSetting?.clubId === clubId) return;
    const data = { clubId, monthlyFeeOverride: null, startMonth: peruMonth(now) };
    await prisma.playerFeeSetting.upsert({ where: { playerId: profile.id }, create: { playerId: profile.id, ...data }, update: data });
  } catch (error) {
    console.error("markFeeStart error:", error);
  }
}

/**
 * Genera los meses de cuota que falten de los jugadores activos del club, desde su primer mes de cobro hasta el mes
 * actual. Es idempotente (la clave única evita duplicados aunque dos pantallas lo pidan a la vez) y cada mes guarda lo que
 * se debía al crearse, así que cambiar la cuota después no reescribe el pasado.
 *
 * Mientras no haya ninguna cuota definida (la del club en 0 y sin montos propios) no genera meses: quedarían congelados
 * en 0 y la cuota que el delegado defina después no los alcanzaría.
 */
export async function ensureClubFees(clubId: string, now = new Date()) {
  const current = peruMonth(now);
  const { feeCents } = await clubFeeSettings(clubId);

  const players = await prisma.playerProfile.findMany({
    where: { clubId, status: "activo" },
    select: {
      id: true,
      feeSetting: { select: { clubId: true, monthlyFeeOverride: true, startMonth: true } },
      fees: { where: { clubId }, select: { month: true } },
    },
  });

  const toStart = players.filter((p) => !p.feeSetting || p.feeSetting.clubId !== clubId);
  for (const p of toStart) {
    const data = { clubId, monthlyFeeOverride: null, startMonth: current };
    await prisma.playerFeeSetting.upsert({ where: { playerId: p.id }, create: { playerId: p.id, ...data }, update: data });
  }
  const startedNow = new Set(toStart.map((p) => p.id));

  const rows: Prisma.MemberFeeCreateManyInput[] = [];
  for (const p of players) {
    const setting = startedNow.has(p.id) ? { monthlyFeeOverride: null, startMonth: current } : p.feeSetting!;
    const overrideCents = setting.monthlyFeeOverride === null ? null : toCents(setting.monthlyFeeOverride);
    if (!hasFeeDefined(feeCents, overrideCents)) continue;
    const amountDue = fromCents(effectiveFeeCents(feeCents, overrideCents));
    for (const month of monthsToGenerate(setting.startMonth, current, p.fees.map((f) => f.month))) {
      rows.push({ playerId: p.id, clubId, month, amountDue });
    }
  }
  if (rows.length > 0) await prisma.memberFee.createMany({ data: rows, skipDuplicates: true });
}
