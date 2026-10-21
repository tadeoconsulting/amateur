import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, readJson } from "@/_lib/auth";
import { requireClubManager } from "@/_lib/club-gestion-guard";
import { centsToSoles, isDueDay, parseCents } from "@/_lib/club-fees";
import { clubFeeSettings, fromCents } from "@/_lib/club-fees-server";

// La cuota mensual estándar del club y su día de vencimiento (especificación 015).

const view = (s: Awaited<ReturnType<typeof clubFeeSettings>>) => ({ monthlyFee: centsToSoles(s.feeCents), dueDay: s.dueDay, defined: s.defined });

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;
  return Response.json(view(await clubFeeSettings(id)));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const body = await readJson(request);
  if (!body) return badRequest();

  const current = await clubFeeSettings(id);
  let feeCents = current.feeCents;
  let dueDay = current.dueDay;
  if ("monthlyFee" in body) {
    const parsed = parseCents(body.monthlyFee);
    if (parsed === null) return badRequest("La cuota debe ser un monto en soles, de 0 a 10 000, con hasta dos decimales");
    feeCents = parsed;
  }
  if ("dueDay" in body) {
    if (!isDueDay(body.dueDay)) return badRequest("El día de vencimiento va del 1 al 28");
    dueDay = body.dueDay as number;
  }

  const data = { monthlyFee: fromCents(feeCents), dueDay };
  await prisma.clubFeeSettings.upsert({ where: { clubId: id }, create: { clubId: id, ...data }, update: data });
  return Response.json(view(await clubFeeSettings(id)));
}
