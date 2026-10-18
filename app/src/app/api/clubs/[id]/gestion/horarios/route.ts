import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, readJson } from "@/_lib/auth";
import { requireClubManager } from "@/_lib/club-gestion-guard";
import { scheduleError } from "@/_lib/club-training";
import { scheduleView, trainingRefsError } from "@/_lib/club-training-server";

// Los horarios semanales de entrenamiento (especificación 015, entrega 2): de ellos salen las sesiones.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const schedules = await prisma.trainingSchedule.findMany({
    where: { clubId: id, active: true },
    include: { category: { select: { name: true } }, place: { select: { name: true } } },
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
  });
  return Response.json(schedules.map(scheduleView));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const body = await readJson(request);
  if (!body) return badRequest();
  const error = scheduleError(body);
  if (error) return badRequest(error);
  const categoryId = typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null;
  if (typeof body.placeId !== "string" || !body.placeId) return badRequest("Elige el lugar de entrenamiento");
  const refs = await trainingRefsError(id, categoryId, body.placeId);
  if (refs) return badRequest(refs);

  const same = await prisma.trainingSchedule.findFirst({ where: { clubId: id, active: true, categoryId, weekday: body.weekday as number, startTime: body.startTime as string }, select: { id: true } });
  if (same) return Response.json({ error: "Ya tienes un horario igual: mismo día, hora y categoría" }, { status: 409 });

  const created = await prisma.trainingSchedule.create({
    data: { clubId: id, categoryId, weekday: body.weekday as number, startTime: body.startTime as string, durationMin: body.durationMin as number, placeId: body.placeId },
    include: { category: { select: { name: true } }, place: { select: { name: true } } },
  });
  return Response.json(scheduleView(created), { status: 201 });
}
