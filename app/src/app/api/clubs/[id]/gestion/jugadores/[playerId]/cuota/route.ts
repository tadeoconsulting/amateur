import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, readJson } from "@/_lib/auth";
import { requireClubManager } from "@/_lib/club-gestion-guard";
import { centsToSoles, effectiveFeeCents, hasFeeDefined, isMonth, parseCents, peruMonth } from "@/_lib/club-fees";
import { clubFeeSettings, fromCents, toCents } from "@/_lib/club-fees-server";

// La cuota propia de un jugador y el primer mes que se le cobra (especificación 015). `monthlyFee: null` vuelve a la
// cuota estándar del club; 0 lo deja sin cuota. Se aplica a los meses que se generen desde ahora y también al mes en
// curso mientras no tenga abonos (así configurar el club el primer día no deja a nadie con el monto equivocado); los
// demás meses ya generados conservan su monto y se corrigen uno por uno desde el detalle del mes.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; playerId: string }> }) {
  const { id, playerId } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const player = await prisma.playerProfile.findFirst({
    where: { id: playerId, clubId: id },
    select: { id: true, feeSetting: { select: { clubId: true, monthlyFeeOverride: true, startMonth: true } } },
  });
  if (!player) return Response.json({ error: "Jugador no encontrado en este club" }, { status: 404 });

  const body = await readJson(request);
  if (!body || (!("monthlyFee" in body) && !("startMonth" in body))) return badRequest("Indica monthlyFee o startMonth");

  const setting = player.feeSetting && player.feeSetting.clubId === id ? player.feeSetting : null;
  let override = setting?.monthlyFeeOverride ?? null;
  let startMonth = setting?.startMonth ?? peruMonth(new Date());

  if ("monthlyFee" in body) {
    if (body.monthlyFee === null) {
      override = null;
    } else {
      const cents = parseCents(body.monthlyFee);
      if (cents === null) return badRequest("La cuota debe ser un monto en soles, de 0 a 10 000, con hasta dos decimales");
      override = fromCents(cents);
    }
  }
  if ("startMonth" in body) {
    if (!isMonth(body.startMonth)) return badRequest("El primer mes de cobro debe tener la forma AAAA-MM");
    startMonth = body.startMonth;
  }

  const data = { clubId: id, monthlyFeeOverride: override, startMonth };
  await prisma.playerFeeSetting.upsert({ where: { playerId }, create: { playerId, ...data }, update: data });

  // El mes en curso se ajusta solo si nadie abonó nada (los abonos anulados no cuentan).
  let adjustedCurrentMonth = false;
  if ("monthlyFee" in body) {
    const { feeCents } = await clubFeeSettings(id);
    const overrideCents = override === null ? null : toCents(override);
    if (hasFeeDefined(feeCents, overrideCents)) {
      const done = await prisma.memberFee.updateMany({
        where: { playerId, clubId: id, month: peruMonth(new Date()), payments: { none: { voidedAt: null } } },
        data: { amountDue: fromCents(effectiveFeeCents(feeCents, overrideCents)) },
      });
      adjustedCurrentMonth = done.count > 0;
    }
  }
  return Response.json({ playerId, monthlyFee: override === null ? null : centsToSoles(toCents(override)), startMonth, adjustedCurrentMonth });
}
