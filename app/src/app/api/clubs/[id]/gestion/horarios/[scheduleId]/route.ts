import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, readJson } from "@/_lib/auth";
import { requireClubManager } from "@/_lib/club-gestion-guard";
import { scheduleError } from "@/_lib/club-training";
import { resetFutureSessions, scheduleView, trainingRefsError } from "@/_lib/club-training-server";

// Editar un horario cambia las sesiones FUTURAS que nadie movió a mano y que aún no tienen asistencia: se rehacen con los
// datos nuevos. Las pasadas, las de hoy y las que el delegado ya tocó se quedan como están.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; scheduleId: string }> }) {
  const { id, scheduleId } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const current = await prisma.trainingSchedule.findFirst({ where: { id: scheduleId, clubId: id, active: true } });
  if (!current) return Response.json({ error: "Horario no encontrado" }, { status: 404 });

  const body = await readJson(request);
  if (!body) return badRequest();

  const next = {
    categoryId: "categoryId" in body ? (typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null) : current.categoryId,
    weekday: "weekday" in body ? body.weekday : current.weekday,
    startTime: "startTime" in body ? body.startTime : current.startTime,
    durationMin: "durationMin" in body ? body.durationMin : current.durationMin,
    placeId: "placeId" in body ? body.placeId : current.placeId,
  };
  const error = scheduleError(next);
  if (error) return badRequest(error);
  if (typeof next.placeId !== "string" || !next.placeId) return badRequest("Elige el lugar de entrenamiento");
  const refs = await trainingRefsError(id, next.categoryId, next.placeId);
  if (refs) return badRequest(refs);

  const same = await prisma.trainingSchedule.findFirst({ where: { clubId: id, active: true, id: { not: scheduleId }, categoryId: next.categoryId, weekday: next.weekday as number, startTime: next.startTime as string }, select: { id: true } });
  if (same) return Response.json({ error: "Ya tienes un horario igual: mismo día, hora y categoría" }, { status: 409 });

  await resetFutureSessions(scheduleId);
  const updated = await prisma.trainingSchedule.update({
    where: { id: scheduleId },
    data: { categoryId: next.categoryId, weekday: next.weekday as number, startTime: next.startTime as string, durationMin: next.durationMin as number, placeId: next.placeId },
    include: { category: { select: { name: true } }, place: { select: { name: true } } },
  });
  return Response.json(scheduleView(updated));
}

// Quitar un horario lo desactiva: deja de generar sesiones y se borran las futuras sin tocar; el historial se conserva.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; scheduleId: string }> }) {
  const { id, scheduleId } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const done = await prisma.trainingSchedule.updateMany({ where: { id: scheduleId, clubId: id, active: true }, data: { active: false } });
  if (done.count === 0) return Response.json({ error: "Horario no encontrado" }, { status: 404 });
  await resetFutureSessions(scheduleId);
  return Response.json({ ok: true });
}
