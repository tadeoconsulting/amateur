import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, readJson } from "@/_lib/auth";
import { requireClubManager } from "@/_lib/club-gestion-guard";
import { attendancePercent, canMarkSession, toPeru } from "@/_lib/club-training";
import { trainingRoster } from "@/_lib/club-training-server";

const sessionOf = (id: string, sessionId: string) =>
  prisma.trainingSession.findFirst({ where: { id: sessionId, clubId: id }, include: { category: { select: { name: true } }, place: { select: { name: true } } } });

// La lista para pasar asistencia (especificación 015, entrega 2): los jugadores de la sesión, todos SIN MARCAR al inicio.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const session = await sessionOf(id, sessionId);
  if (!session) return Response.json({ error: "Sesión no encontrada" }, { status: 404 });

  const [roster, marks] = await Promise.all([trainingRoster(session), prisma.attendance.findMany({ where: { sessionId }, select: { playerId: true, status: true } })]);
  const statusOf = new Map(marks.map((m) => [m.playerId, m.status]));
  const players = roster.map((p) => ({ playerId: p.id, name: p.name, provisional: p.provisional, position: p.position, number: p.number, categoryName: p.categoryName, status: statusOf.get(p.id) ?? null }));
  const count = (s: string) => players.filter((p) => p.status === s).length;
  const local = toPeru(session.startsAt);

  return Response.json({
    session: { id: session.id, date: local.date, time: local.time, durationMin: session.durationMin, status: session.status, categoryName: session.category?.name ?? null, placeName: session.place.name },
    canMark: canMarkSession(session, new Date()),
    summary: { total: players.length, marked: players.filter((p) => p.status !== null).length, presente: count("presente"), ausente: count("ausente"), justificado: count("justificado"), percent: attendancePercent({ presente: count("presente"), ausente: count("ausente") }) },
    players,
  });
}

// Marca a todos los que siguen sin marcar como presentes: un atajo opcional, nunca el comportamiento por defecto.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const body = await readJson(request);
  if (!body || body.action !== "todos_presentes") return badRequest("La acción debe ser todos_presentes");

  const session = await sessionOf(id, sessionId);
  if (!session) return Response.json({ error: "Sesión no encontrada" }, { status: 404 });
  if (!canMarkSession(session, new Date())) return Response.json({ error: "Esta sesión no admite asistencia todavía o está cancelada" }, { status: 409 });

  const roster = await trainingRoster(session);
  const done = await prisma.attendance.createMany({ data: roster.map((p) => ({ sessionId, playerId: p.id, status: "presente", markedById: guard.user.id })), skipDuplicates: true });
  return Response.json({ marked: done.count });
}
