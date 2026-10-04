// Historial de notificaciones del organizador: lo que pasó con las solicitudes de equipos a sus
// torneos y con las invitaciones que mandó. Se arma con lo que ya se guarda en
// `TournamentRequest` (createdAt / resolvedAt / status) — no hay una tabla de notificaciones.
// Sin dependencias de servidor: lo usan la pantalla y las pruebas.

import type { RequestKind, RequestStatus } from "./tournament-request.ts";

export type HistorySource = {
  id: string;
  kind: RequestKind;
  status: RequestStatus;
  createdAt: string;
  resolvedAt: string | null;
  clubName: string;
  tournamentName: string;
};

export type HistoryEvent = { id: string; at: string; text: string };

export const HISTORY_DAYS = 7;

function resolvedText(s: HistorySource): string | null {
  const { clubName: club, tournamentName: t } = s;
  if (s.kind === "request") {
    if (s.status === "accepted") return `Aceptaste a ${club} en ${t}`;
    if (s.status === "declined") return `Rechazaste a ${club} en ${t}`;
    if (s.status === "cancelled") return `${club} canceló su solicitud a ${t}`;
  } else {
    if (s.status === "accepted") return `${club} aceptó tu invitación a ${t}`;
    if (s.status === "declined") return `${club} rechazó tu invitación a ${t}`;
    if (s.status === "cancelled") return `Cancelaste la invitación a ${club} en ${t}`;
  }
  return null;
}

/**
 * Los hechos de los últimos `days` días, del más reciente al más viejo. Cada solicitud o
 * invitación aporta hasta dos: cuándo se creó y cuándo se resolvió.
 *
 * Una solicitud que todavía espera respuesta no se lista (ya está arriba, con sus botones para
 * aceptar o rechazar); una invitación pendiente sí, porque solo espera al club.
 */
export function organizerHistory(items: HistorySource[], now: number = Date.now(), days: number = HISTORY_DAYS): HistoryEvent[] {
  const since = now - days * 24 * 60 * 60 * 1000;
  const inWindow = (iso: string) => new Date(iso).getTime() >= since;
  const events: HistoryEvent[] = [];

  for (const s of items) {
    const pendingRequest = s.kind === "request" && s.status === "pending";
    if (!pendingRequest && inWindow(s.createdAt)) {
      const text =
        s.kind === "request"
          ? `${s.clubName} pidió unirse a ${s.tournamentName}`
          : `Invitaste a ${s.clubName} a ${s.tournamentName}`;
      events.push({ id: `${s.id}:created`, at: s.createdAt, text });
    }
    const text = s.status !== "pending" && s.resolvedAt ? resolvedText(s) : null;
    if (text && s.resolvedAt && inWindow(s.resolvedAt)) {
      events.push({ id: `${s.id}:resolved`, at: s.resolvedAt, text });
    }
  }

  return events.sort((a, b) => b.at.localeCompare(a.at));
}
