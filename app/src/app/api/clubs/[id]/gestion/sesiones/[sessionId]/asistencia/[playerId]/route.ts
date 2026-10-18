import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, readJson } from "@/_lib/auth";
import { requireClubManager } from "@/_lib/club-gestion-guard";
import { canMarkSession, isAttendanceStatus } from "@/_lib/club-training";
import { trainingRoster } from "@/_lib/club-training-server";

// Marca o limpia la asistencia de UN jugador (especificación 015, entrega 2). Se guarda al instante, jugador por jugador,
// para no perder lo marcado si se corta la conexión. `status: null` lo vuelve a dejar sin marcar.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; sessionId: string; playerId: string }> }) {
  const { id, sessionId, playerId } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const body = await readJson(request);
  if (!body || !("status" in body)) return badRequest("Indica el estado");
  if (body.status !== null && !isAttendanceStatus(body.status)) return badRequest("El estado debe ser presente, ausente, justificado o null");

  const session = await prisma.trainingSession.findFirst({ where: { id: sessionId, clubId: id }, select: { id: true, clubId: true, categoryId: true, status: true, startsAt: true } });
  if (!session) return Response.json({ error: "Sesión no encontrada" }, { status: 404 });
  if (!canMarkSession(session, new Date())) {
    return Response.json({ error: session.status === "cancelada" ? "La sesión está cancelada" : "Todavía no se puede pasar lista de esta sesión" }, { status: 409 });
  }
  const roster = await trainingRoster(session);
  if (!roster.some((p) => p.id === playerId)) return Response.json({ error: "Ese jugador no pertenece a esta sesión" }, { status: 404 });

  if (body.status === null) {
    await prisma.attendance.deleteMany({ where: { sessionId, playerId } });
    return Response.json({ playerId, status: null });
  }
  const mark = await prisma.attendance.upsert({
    where: { sessionId_playerId: { sessionId, playerId } },
    create: { sessionId, playerId, status: body.status, markedById: guard.user.id },
    update: { status: body.status, markedById: guard.user.id, markedAt: new Date() },
  });
  return Response.json({ playerId, status: mark.status, markedAt: mark.markedAt });
}
