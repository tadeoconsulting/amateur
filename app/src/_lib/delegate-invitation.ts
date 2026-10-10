// Invitar al delegado de un equipo temporal (especificación 009, entrega 4). Pura y sin dependencias: la usan las
// rutas de la API y las pruebas.
//
// El admin crea un enlace (con o sin correo, para WhatsApp) y quien lo acepta con su cuenta pasa a ser el delegado
// del equipo, con las mismas reglas que "Oficializar": una cuenta de administrador no puede ser delegada y una
// cuenta que ya dirige un equipo no puede dirigir otro. A diferencia del perfil de un jugador no hay DNI que
// confirmar: la seguridad es el enlace secreto (un solo uso, 7 días) y, si la invitación lleva correo, que solo la
// acepta la cuenta con ese correo.

// La vigencia (7 días), `effectiveStatus`, `daysLeft` y `maskEmail` son las mismas que las de las invitaciones de
// perfil: se importan de `profile-invitation.ts`.

export type DelegateAcceptCheck =
  | { ok: true }
  | { ok: false; status: number; code: "used" | "expired" | "official" | "wrong_email" | "admin" | "has_club"; message: string };

/**
 * ¿Puede esta sesión aceptar la invitación? Primero lo que no tiene arreglo (usada, vencida, el equipo ya es
 * oficial), luego el correo, luego las reglas de quién puede ser delegado.
 */
export function checkDelegateAccept(input: {
  status: string;
  expiresAt: Date;
  now: Date;
  /** El correo al que se mandó; null si es un enlace sin correo. */
  email: string | null;
  sessionEmail: string;
  sessionIsAdmin: boolean;
  /** Cuántos equipos dirige ya la cuenta. */
  sessionOwnedClubs: number;
  clubIsTemporary: boolean;
}): DelegateAcceptCheck {
  const { status, expiresAt, now, email, sessionEmail, sessionIsAdmin, sessionOwnedClubs, clubIsTemporary } = input;

  if (status !== "pending") {
    return { ok: false, status: 410, code: "used", message: "Esta invitación ya fue usada o se canceló." };
  }
  if (!clubIsTemporary) {
    return { ok: false, status: 410, code: "official", message: "Este equipo ya tiene delegado." };
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
  if (sessionOwnedClubs > 0) {
    return { ok: false, status: 409, code: "has_club", message: "Tu cuenta ya dirige un equipo: cada delegado maneja el suyo, con su propia cuenta." };
  }
  return { ok: true };
}
