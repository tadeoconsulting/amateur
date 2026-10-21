import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, readJson } from "@/_lib/auth";
import { requireClubManager } from "@/_lib/club-gestion-guard";
import { fromPeru, isDate, isDuration, isTime, toPeru } from "@/_lib/club-training";
import { rosterSizes, sessionView, trainingRefsError } from "@/_lib/club-training-server";

const INCLUDE = { category: { select: { name: true } }, place: { select: { name: true } }, attendances: { select: { status: true } } } as const;

// Cancelar, restaurar o mover UNA sesión (especificación 015, entrega 2). Mover cambia solo esta sesión: el horario no se toca.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const current = await prisma.trainingSession.findFirst({ where: { id: sessionId, clubId: id }, include: INCLUDE });
  if (!current) return Response.json({ error: "Sesión no encontrada" }, { status: 404 });

  const body = await readJson(request);
  if (!body) return badRequest();

  const data: { status?: string; startsAt?: Date; durationMin?: number; placeId?: string; movedManually?: boolean } = {};

  if ("status" in body) {
    if (body.status !== "programada" && body.status !== "cancelada") return badRequest("El estado debe ser programada o cancelada");
    if (body.status === "cancelada" && current.attendances.length > 0) {
      return Response.json({ error: "Ya tiene asistencia marcada: no se puede cancelar" }, { status: 409 });
    }
    data.status = body.status;
  }

  const moves = ["date", "time", "durationMin", "placeId"].some((k) => k in body);
  if (moves) {
    const local = toPeru(current.startsAt);
    const date = "date" in body ? body.date : local.date;
    const time = "time" in body ? body.time : local.time;
    if (!isDate(date)) return badRequest("Elige la fecha");
    if (!isTime(time)) return badRequest("La hora debe tener la forma HH:MM, por ejemplo 19:00");
    const durationMin = "durationMin" in body ? body.durationMin : current.durationMin;
    if (!isDuration(durationMin)) return badRequest("La duración va de 15 a 300 minutos");
    const placeId = "placeId" in body ? body.placeId : current.placeId;
    if (typeof placeId !== "string" || !placeId) return badRequest("Elige el lugar de entrenamiento");
    if (placeId !== current.placeId) {
      const refs = await trainingRefsError(id, current.categoryId, placeId);
      if (refs) return badRequest(refs);
    }
    const startsAt = fromPeru(date, time);
    if (startsAt.getTime() !== current.startsAt.getTime() || durationMin !== current.durationMin || placeId !== current.placeId) {
      data.startsAt = startsAt;
      data.durationMin = durationMin;
      data.placeId = placeId;
      data.movedManually = true;
    }
  }
  if (Object.keys(data).length === 0) return badRequest("No hay nada que cambiar");

  try {
    const updated = await prisma.trainingSession.update({ where: { id: sessionId }, data, include: INCLUDE });
    const size = await rosterSizes(id);
    return Response.json(sessionView(updated, size(updated.categoryId), new Date()));
  } catch {
    // La clave única (horario + instante): ya existe otra sesión de ese horario a esa hora.
    return Response.json({ error: "Ya hay una sesión de ese horario a esa hora" }, { status: 409 });
  }
}

// Borra una sesión suelta creada por error. Una de un horario se cancela, no se borra; y con asistencia marcada, tampoco.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const session = await prisma.trainingSession.findFirst({ where: { id: sessionId, clubId: id }, select: { scheduleId: true, _count: { select: { attendances: true } } } });
  if (!session) return Response.json({ error: "Sesión no encontrada" }, { status: 404 });
  if (session.scheduleId) return Response.json({ error: "Esta sesión sale de un horario: cancélala en lugar de borrarla" }, { status: 409 });
  if (session._count.attendances > 0) return Response.json({ error: "Ya tiene asistencia marcada: no se puede borrar" }, { status: 409 });
  await prisma.trainingSession.delete({ where: { id: sessionId } });
  return Response.json({ ok: true });
}
