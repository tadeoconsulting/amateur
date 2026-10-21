import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, readJson } from "@/_lib/auth";
import { requireClubManager } from "@/_lib/club-gestion-guard";
import { centsToSoles, formatSoles, paidCents, parseCents } from "@/_lib/club-fees";
import { asPaymentLike, fromCents } from "@/_lib/club-fees-server";

// Corrige el monto de UN mes (especificación 015). No toca la cuota del club ni los otros meses.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; feeId: string }> }) {
  const { id, feeId } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const body = await readJson(request);
  if (!body) return badRequest();
  const cents = parseCents(body.amountDue);
  if (cents === null) return badRequest("El monto debe estar en soles, de 0 a 10 000, con hasta dos decimales");

  const fee = await prisma.memberFee.findFirst({ where: { id: feeId, clubId: id }, select: { id: true, payments: { select: { amount: true, voidedAt: true } } } });
  if (!fee) return Response.json({ error: "Cuota no encontrada" }, { status: 404 });

  const paid = paidCents(fee.payments.map(asPaymentLike));
  if (cents < paid) {
    return Response.json({ error: `Ya se abonaron ${formatSoles(paid)}: anula un abono antes de bajar el monto` }, { status: 409 });
  }
  await prisma.memberFee.update({ where: { id: feeId }, data: { amountDue: fromCents(cents) } });
  return Response.json({ feeId, amountDue: centsToSoles(cents) });
}
