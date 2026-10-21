import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, readJson } from "@/_lib/auth";
import { requireClubManager } from "@/_lib/club-gestion-guard";
import { balanceCents, centsToSoles, feeStatus, paidCents, parseCents, paymentError } from "@/_lib/club-fees";
import { asPaymentLike, fromCents, toCents } from "@/_lib/club-fees-server";

// Registra un abono a un mes (especificación 015). Sin `amount` cobra el saldo completo: es el toque del checklist.
// La fecha y hora son las de ahora. El saldo se lee con el mes bloqueado, así dos toques seguidos no cobran dos veces.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; feeId: string }> }) {
  const { id, feeId } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const body = (await readJson(request)) ?? {};
  const requested = "amount" in body && body.amount !== undefined && body.amount !== null ? parseCents(body.amount) : undefined;
  if (requested === null) return badRequest("El monto debe estar en soles, con hasta dos decimales");

  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "MemberFee" WHERE "id" = ${feeId} AND "clubId" = ${id} FOR UPDATE`;
    if (locked.length === 0) return { status: 404 as const, error: "Cuota no encontrada" };

    const fee = await tx.memberFee.findUniqueOrThrow({ where: { id: feeId }, select: { amountDue: true, payments: { select: { amount: true, voidedAt: true } } } });
    const due = toCents(fee.amountDue);
    const paid = paidCents(fee.payments.map(asPaymentLike));
    const balance = balanceCents(due, paid);
    if (due === 0) return { status: 409 as const, error: "Este mes no tiene cuota" };
    if (balance === 0) return { status: 409 as const, error: "Este mes ya está pagado" };

    const amount = requested ?? balance;
    const error = paymentError(amount, balance);
    if (error) return { status: 400 as const, error };

    const payment = await tx.feePayment.create({ data: { feeId, amount: fromCents(amount), createdById: guard.user.id } });
    const newPaid = paid + amount;
    return { status: 201 as const, body: { paymentId: payment.id, paidAt: payment.paidAt, amount: centsToSoles(amount), paid: centsToSoles(newPaid), balance: centsToSoles(balanceCents(due, newPaid)), status: feeStatus(due, newPaid) } };
  });

  if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result.body, { status: result.status });
}
