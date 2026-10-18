import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { requireClubManager } from "@/_lib/club-gestion-guard";

// Anula un abono (especificación 015). No se borra: queda con quién lo anuló y cuándo, y el mes se vuelve a calcular.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const { id, paymentId } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const payment = await prisma.feePayment.findFirst({ where: { id: paymentId, fee: { clubId: id } }, select: { id: true, voidedAt: true } });
  if (!payment) return Response.json({ error: "Abono no encontrado" }, { status: 404 });
  if (payment.voidedAt) return Response.json({ error: "Ese abono ya estaba anulado" }, { status: 409 });

  // La condición `voidedAt: null` evita anularlo dos veces si llegan dos pedidos a la vez.
  const done = await prisma.feePayment.updateMany({ where: { id: paymentId, voidedAt: null }, data: { voidedAt: new Date(), voidedById: guard.user.id } });
  if (done.count === 0) return Response.json({ error: "Ese abono ya estaba anulado" }, { status: 409 });
  return Response.json({ ok: true });
}
