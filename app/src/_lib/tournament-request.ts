// Reglas de las solicitudes e invitaciones de equipos a un torneo. Sin dependencias
// de servidor: las usan la API, la UI y las pruebas.

export type RequestKind = "request" | "invite";
export type RequestStatus = "pending" | "accepted" | "declined" | "cancelled";
export type RequestAction = "accept" | "decline" | "cancel";
/** Lado de la conversación: quien organiza el torneo o quien dirige el club. */
export type RequestSide = "organizer" | "club";

export const REQUEST_ACTIONS: readonly RequestAction[] = ["accept", "decline", "cancel"];

/**
 * ¿Quién puede ejecutar cada acción?
 *   solicitud (el club pide entrar):  decide el organizador, cancela el club
 *   invitación (el organizador invita): decide el club, cancela el organizador
 */
export function sideForAction(kind: RequestKind, action: RequestAction): RequestSide {
  if (action === "cancel") return kind === "request" ? "club" : "organizer";
  return kind === "request" ? "organizer" : "club";
}

export const STATUS_AFTER: Record<RequestAction, RequestStatus> = {
  accept: "accepted",
  decline: "declined",
  cancel: "cancelled",
};

export function isRequestAction(value: unknown): value is RequestAction {
  return typeof value === "string" && (REQUEST_ACTIONS as readonly string[]).includes(value);
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  declined: "Rechazada",
  cancelled: "Cancelada",
};

export function requestStatusLabel(status: string) {
  return STATUS_LABELS[status as RequestStatus] ?? status;
}
