import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, readJson } from "@/_lib/auth";
import { requireClubManager } from "@/_lib/club-gestion-guard";
import { fromPeru, isDate, isDuration, isTime } from "@/_lib/club-training";
import { ensureTrainingSessions, rosterSizes, sessionView, sessionWindow, trainingRefsError } from "@/_lib/club-training-server";

// Las sesiones de entrenamiento (especificación 015, entrega 2). Al leer genera las que falten de los horarios activos.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const now = new Date();
  const desde = request.nextUrl.searchParams.get("desde");
  const hasta = request.nextUrl.searchParams.get("hasta");
  if ((desde !== null && !isDate(desde)) || (hasta !== null && !isDate(hasta))) return badRequest("Las fechas deben tener la forma AAAA-MM-DD");
  const { from, to } = sessionWindow(now, desde, hasta);

  await ensureTrainingSessions(id, now);
  const sessions = await prisma.trainingSession.findMany({
    where: { clubId: id, startsAt: { gte: fromPeru(from, "00:00"), lt: fromPeru(to, "00:00") } },
    include: { category: { select: { name: true } }, place: { select: { name: true } }, attendances: { select: { status: true } } },
    orderBy: { startsAt: "asc" },
  });
  const size = await rosterSizes(id);
  return Response.json({ from, to, sessions: sessions.map((s) => sessionView(s, size(s.categoryId), now)) });
}

// Una sesión suelta: sin horario, para un entrenamiento extra o para anotar uno que ya pasó.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const body = await readJson(request);
  if (!body) return badRequest();
  if (!isDate(body.date)) return badRequest("Elige la fecha");
  if (!isTime(body.time)) return badRequest("La hora debe tener la forma HH:MM, por ejemplo 19:00");
  if (!isDuration(body.durationMin)) return badRequest("La duración va de 15 a 300 minutos");
  if (typeof body.placeId !== "string" || !body.placeId) return badRequest("Elige el lugar de entrenamiento");
  const categoryId = typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null;
  const refs = await trainingRefsError(id, categoryId, body.placeId);
  if (refs) return badRequest(refs);

  const startsAt = fromPeru(body.date, body.time);
  const same = await prisma.trainingSession.findFirst({ where: { clubId: id, categoryId, startsAt, status: "programada" }, select: { id: true } });
  if (same) return Response.json({ error: "Ya hay un entrenamiento a esa hora para esa categoría" }, { status: 409 });

  const created = await prisma.trainingSession.create({
    data: { clubId: id, categoryId, startsAt, durationMin: body.durationMin, placeId: body.placeId },
    include: { category: { select: { name: true } }, place: { select: { name: true } }, attendances: { select: { status: true } } },
  });
  const size = await rosterSizes(id);
  return Response.json(sessionView(created, size(categoryId), new Date()), { status: 201 });
}
