import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { isAdmin, type CurrentUser } from "./auth";
import { limaDay, matchOpenAt, mesaWindows, nextWindow, windowOpenAt, type MesaWindow } from "./mesa-window";

// La mesa en el servidor (especificación 011): qué torneos tiene asignados una cuenta de mesa, si su ventana de
// acceso está abierta ahora, y quién puede gestionar un partido.

const dayOf = (d: Date) => d.toISOString().slice(0, 10);

/** Las ventanas de un torneo, calculadas con la fecha y la hora actuales de sus partidos. */
export async function tournamentWindows(tournamentId: string): Promise<MesaWindow[]> {
  const matches = await prisma.match.findMany({
    where: { tournamentId },
    select: { date: true, time: true, status: true, finishedAt: true, updatedAt: true },
  });
  return mesaWindows(
    matches.map((m) => ({
      date: dayOf(m.date),
      time: m.time,
      status: m.status,
      // Los partidos terminados antes de que se guardara la hora de término usan la última vez que se tocaron.
      finishedAt: m.status === "finalizado" ? (m.finishedAt ?? m.updatedAt).getTime() : null,
    }))
  );
}

/** Los torneos que tiene asignados una cuenta de mesa (ya sin los eliminados). */
export function assignedTournaments(userId: string) {
  return prisma.tournamentMesa.findMany({
    where: { userId, tournament: { deletedAt: null } },
    select: { tournament: { select: { id: true, name: true, slug: true, organizer: { select: { organizerSlug: true } } } } },
    orderBy: { createdAt: "asc" },
  });
}

export type MatchAccess =
  | { ok: true; kind: "staff" | "mesa" }
  | { ok: false; status: number; code: "forbidden" | "fuera_de_horario"; message: string };

/**
 * ¿Puede esta cuenta gestionar el partido en vivo? El admin y el organizador del torneo, siempre (como hasta ahora).
 * Una mesa asignada al torneo, solo con la ventana abierta. Cualquier otra cuenta, no.
 */
export async function matchAccess(user: CurrentUser, matchId: string, now = Date.now()): Promise<MatchAccess> {
  const denied: MatchAccess = { ok: false, status: 403, code: "forbidden", message: "No tienes permiso para esto" };
  if (isAdmin(user)) return { ok: true, kind: "staff" };

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { tournamentId: true, date: true, time: true, tournament: { select: { organizerId: true, deletedAt: true } } },
  });
  if (!match) return denied;
  if (match.tournament.organizerId === user.id) return { ok: true, kind: "staff" };

  if (!user.roles.includes(Role.MESA) || match.tournament.deletedAt !== null) return denied;
  const assigned = await prisma.tournamentMesa.findUnique({
    where: { tournamentId_userId: { tournamentId: match.tournamentId, userId: user.id } },
    select: { id: true },
  });
  if (!assigned) return denied;

  // Solo los partidos del día de la ventana abierta, y que tengan hora (ver matchOpenAt).
  const windows = await tournamentWindows(match.tournamentId);
  const open = matchOpenAt(windows, { date: dayOf(match.date), time: match.time }, now);
  if (open) return { ok: true, kind: "mesa" };
  return { ok: false, status: 403, code: "fuera_de_horario", message: "Fuera de tu horario: solo puedes gestionar partidos el día de juego, desde 1 hora antes del primero hasta 1 hora después del último." };
}

export const denyResponse = (access: Extract<MatchAccess, { ok: false }>) =>
  Response.json({ error: access.message, code: access.code }, { status: access.status });

export { limaDay, nextWindow, windowOpenAt };
