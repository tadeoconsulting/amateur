// Invitaciones para reclamar un perfil provisional (especificación 009, entrega 3). Pura y sin dependencias: la
// usan las rutas de la API y las pruebas.
//
// Una invitación (por correo, o un enlace sin correo para WhatsApp) deja que una persona vincule SU cuenta a un
// perfil provisional. La seguridad: el enlace es un secreto, vale 7 días, se usa una vez y, para vincular, hay que
// escribir el DNI del perfil (que nunca viaja en el correo ni en la pantalla). Un enlace sin correo no se ata a
// una cuenta concreta, así que los DNI equivocados se cuentan y, al llegar al límite, la invitación se bloquea.

export const PROFILE_INVITE_DAYS = 7;
export const MAX_DNI_ATTEMPTS = 5;

/** "ana.perez@correo.com" → "a***@correo.com": para decirle a quien abre el enlace con qué correo entrar, sin mostrarlo entero. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

/** Solo los dígitos, para comparar un DNI escrito con espacios o guiones. */
export function digitsOnly(value: unknown): string {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

export type InvitationStatus = "pending" | "review" | "accepted" | "cancelled" | "locked";

/** Cómo está una invitación hoy: una vigente que ya pasó su fecha está vencida. */
export function effectiveStatus(status: string, expiresAt: Date, now: Date): InvitationStatus | "expired" {
  if (status === "pending" && expiresAt <= now) return "expired";
  return status as InvitationStatus;
}

/** Días que le quedan (0 si vence hoy o ya venció). */
export function daysLeft(expiresAt: Date, now: Date): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000));
}

export type AcceptCheck =
  | { ok: true }
  | {
      ok: false;
      /** Código HTTP que corresponde. */
      status: number;
      code: "used" | "expired" | "locked" | "wrong_email" | "bad_dni" | "wrong_dni";
      message: string;
      /** El DNI estaba mal: hay que contar el intento (y bloquear si era el último). */
      countAttempt?: boolean;
      /** Intentos que le quedan después de este (solo con `countAttempt`). */
      attemptsLeft?: number;
    };

/**
 * ¿Puede esta sesión aceptar la invitación con este DNI? El orden importa: primero lo que no tiene arreglo
 * (usada, vencida, bloqueada), luego el correo (no cuenta como intento), luego el DNI.
 */
export function checkAccept(input: {
  status: string;
  expiresAt: Date;
  now: Date;
  attempts: number;
  /** El correo al que se mandó; null si es un enlace sin correo. */
  email: string | null;
  sessionEmail: string;
  typedDni: unknown;
  profileDni: string;
}): AcceptCheck {
  const { status, expiresAt, now, attempts, email, sessionEmail, typedDni, profileDni } = input;

  if (status === "locked" || (status === "pending" && attempts >= MAX_DNI_ATTEMPTS)) {
    return { ok: false, status: 423, code: "locked", message: "Esta invitación se bloqueó por demasiados intentos. Pide una nueva a quien te la envió." };
  }
  if (status !== "pending") {
    return { ok: false, status: 410, code: "used", message: "Esta invitación ya fue usada o se canceló." };
  }
  if (expiresAt <= now) {
    return { ok: false, status: 410, code: "expired", message: "La invitación venció. Pide una nueva a quien te la envió." };
  }
  if (email && email.trim().toLowerCase() !== sessionEmail.trim().toLowerCase()) {
    return { ok: false, status: 403, code: "wrong_email", message: `Esta invitación es para otro correo (${maskEmail(email)}). Inicia sesión con ese correo.` };
  }

  const typed = digitsOnly(typedDni);
  if (!/^\d{8}$/.test(typed)) {
    return { ok: false, status: 400, code: "bad_dni", message: "El DNI debe tener 8 dígitos." };
  }
  if (typed !== profileDni) {
    const attemptsLeft = MAX_DNI_ATTEMPTS - (attempts + 1);
    return {
      ok: false,
      status: 400,
      code: "wrong_dni",
      countAttempt: true,
      attemptsLeft,
      message: attemptsLeft > 0 ? `Ese DNI no coincide con el del perfil. Te quedan ${attemptsLeft} ${attemptsLeft === 1 ? "intento" : "intentos"}.` : "Ese DNI no coincide y la invitación se bloqueó. Pide una nueva a quien te la envió.",
    };
  }
  return { ok: true };
}
