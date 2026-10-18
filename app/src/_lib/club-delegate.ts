// Co-delegados de un equipo (especificación 014). Lógica pura y sin dependencias: la usan las rutas de la API, las
// pantallas y las pruebas.
//
// Un equipo tiene un delegado principal (`Club.ownerId`) y hasta tres co-delegados. Los co-delegados gestionan el
// equipo con los mismos permisos, salvo los que se reservan al principal y al admin.

/** Cuántos co-delegados admite un equipo (sin contar al principal). */
export const MAX_CO_DELEGATES = 3;

/** Quién es alguien respecto de un equipo. */
export type ClubRole = "admin" | "principal" | "co" | null;

/** Lo que se puede hacer sobre un equipo, por rol. */
export type ClubAction =
  /** Planilla, categorías, jugadores, inscripciones, solicitudes y el nombre, las siglas, el logo y el color. */
  | "manage"
  /** El contacto público del delegado (nombre, teléfono y correo). */
  | "edit_contact"
  /** Sumar o quitar co-delegados. */
  | "manage_delegates"
  /** Eliminar el equipo. */
  | "delete"
  /** Pasar el equipo a otra persona (Oficializar o cambiar de dueño). */
  | "transfer";

const ALLOWED: Record<ClubAction, readonly Exclude<ClubRole, null>[]> = {
  manage: ["admin", "principal", "co"],
  edit_contact: ["admin", "principal"],
  manage_delegates: ["admin", "principal"],
  delete: ["admin"],
  transfer: ["admin"],
};

/** ¿Puede este rol hacer esta acción sobre el equipo? Sin rol (null) no puede nada. */
export function canDo(role: ClubRole, action: ClubAction): boolean {
  return role !== null && ALLOWED[action].includes(role);
}

/**
 * El rol de una persona en un equipo: el admin manda sobre todo, luego el principal (el dueño) y luego el
 * co-delegado. `coOf` es el equipo del que la persona es co-delegada (como mucho uno).
 */
export function roleIn(clubId: string, who: { isAdmin: boolean; userId: string; ownerOf: readonly string[]; coOf: string | null }): ClubRole {
  if (who.isAdmin) return "admin";
  if (who.ownerOf.includes(clubId)) return "principal";
  if (who.coOf === clubId) return "co";
  return null;
}

/**
 * Cuántos lugares de co-delegado quedan: los ya aceptados y las invitaciones vigentes (pendientes y sin vencer) cuentan
 * por igual, para que no se repartan más enlaces que lugares.
 */
export function coDelegateSlotsLeft(accepted: number, pendingInvitations: number): number {
  return Math.max(0, MAX_CO_DELEGATES - accepted - pendingInvitations);
}

export type CoDelegateAcceptCheck =
  | { ok: true }
  | {
      ok: false;
      status: number;
      code: "used" | "expired" | "temporary" | "wrong_email" | "admin" | "has_club" | "full";
      message: string;
    };

/**
 * ¿Puede esta sesión aceptar la invitación de co-delegado? Primero lo que no tiene arreglo (usada, vencida, el equipo
 * ya no admite delegados), luego el correo y luego las reglas de quién puede serlo: una cuenta de administrador no, y
 * una persona que ya dirige o co-dirige un equipo tampoco (un equipo por persona).
 */
export function checkCoDelegateAccept(input: {
  status: string;
  expiresAt: Date;
  now: Date;
  /** El correo al que se mandó; null si es un enlace sin correo. */
  email: string | null;
  sessionEmail: string;
  sessionIsAdmin: boolean;
  /** Cuántos equipos dirige o co-dirige ya la cuenta. */
  sessionClubs: number;
  clubIsTemporary: boolean;
  /** Los co-delegados que el equipo ya tiene (sin contar esta invitación). */
  acceptedCoDelegates: number;
}): CoDelegateAcceptCheck {
  const { status, expiresAt, now, email, sessionEmail, sessionIsAdmin, sessionClubs, clubIsTemporary, acceptedCoDelegates } = input;

  if (status !== "pending") {
    return { ok: false, status: 410, code: "used", message: "Esta invitación ya fue usada o se canceló." };
  }
  if (clubIsTemporary) {
    return { ok: false, status: 410, code: "temporary", message: "Este equipo todavía no tiene delegado, no puede tener co-delegados." };
  }
  if (expiresAt <= now) {
    return { ok: false, status: 410, code: "expired", message: "La invitación venció. Pide una nueva a quien te la envió." };
  }
  if (email && email.trim().toLowerCase() !== sessionEmail.trim().toLowerCase()) {
    return { ok: false, status: 403, code: "wrong_email", message: "Esta invitación es para otro correo. Inicia sesión con el correo al que te la enviaron." };
  }
  if (sessionIsAdmin) {
    return { ok: false, status: 400, code: "admin", message: "Una cuenta de administrador no puede ser delegada de un equipo." };
  }
  if (sessionClubs > 0) {
    return { ok: false, status: 409, code: "has_club", message: "Tu cuenta ya dirige un equipo: cada delegado maneja el suyo, con su propia cuenta." };
  }
  if (acceptedCoDelegates >= MAX_CO_DELEGATES) {
    return { ok: false, status: 409, code: "full", message: `Este equipo ya tiene ${MAX_CO_DELEGATES} co-delegados, el máximo.` };
  }
  return { ok: true };
}
