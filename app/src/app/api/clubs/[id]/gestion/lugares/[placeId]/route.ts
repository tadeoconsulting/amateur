import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, readJson } from "@/_lib/auth";
import { requireClubManager } from "@/_lib/club-gestion-guard";
import { placeError } from "@/_lib/club-training";

const view = (p: { id: string; name: string; address: string | null; archivedAt: Date | null }) => ({ id: p.id, name: p.name, address: p.address, archived: p.archivedAt !== null });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; placeId: string }> }) {
  const { id, placeId } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const place = await prisma.trainingPlace.findFirst({ where: { id: placeId, clubId: id } });
  if (!place) return Response.json({ error: "Lugar no encontrado" }, { status: 404 });

  const body = await readJson(request);
  if (!body) return badRequest();

  const data: { name?: string; address?: string | null; archivedAt?: Date | null } = {};
  if ("name" in body || "address" in body) {
    const error = placeError({ name: "name" in body ? body.name : place.name, address: "address" in body ? body.address : place.address });
    if (error) return badRequest(error);
    if ("name" in body) data.name = (body.name as string).trim();
    if ("address" in body) data.address = typeof body.address === "string" && body.address.trim() ? body.address.trim() : null;
  }
  if ("archived" in body) {
    if (typeof body.archived !== "boolean") return badRequest("archived debe ser verdadero o falso");
    data.archivedAt = body.archived ? new Date() : null;
  }
  const nextName = data.name ?? place.name;
  const unarchiving = data.archivedAt === null && place.archivedAt !== null;
  if (data.name !== undefined || unarchiving) {
    const taken = await prisma.trainingPlace.findFirst({ where: { clubId: id, archivedAt: null, id: { not: placeId }, name: { equals: nextName, mode: "insensitive" } }, select: { id: true } });
    if (taken) return Response.json({ error: "Ya tienes un lugar con ese nombre" }, { status: 409 });
  }
  return Response.json(view(await prisma.trainingPlace.update({ where: { id: placeId }, data })));
}

// Un lugar que ya se usó (en un horario o una sesión) no se borra: se archiva, para no perder el historial.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; placeId: string }> }) {
  const { id, placeId } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const place = await prisma.trainingPlace.findFirst({ where: { id: placeId, clubId: id }, select: { id: true, _count: { select: { schedules: true, sessions: true } } } });
  if (!place) return Response.json({ error: "Lugar no encontrado" }, { status: 404 });

  if (place._count.schedules + place._count.sessions > 0) {
    // Y se desactivan sus horarios: un horario sin lugar usable no puede generar sesiones.
    await prisma.$transaction([
      prisma.trainingSchedule.updateMany({ where: { placeId, active: true }, data: { active: false } }),
      prisma.trainingPlace.update({ where: { id: placeId }, data: { archivedAt: new Date() } }),
    ]);
    return Response.json({ archived: true });
  }
  await prisma.trainingPlace.delete({ where: { id: placeId } });
  return Response.json({ deleted: true });
}
