// Las reglas de una contraseña nueva (observación 65): al menos 8 caracteres y una letra mayúscula. Lógica pura y sin
// dependencias: la usan el servidor (`validatePassword` en auth.ts), las pantallas donde alguien elige una contraseña (para
// avisar mientras escribe, con el mismo texto que daría el servidor) y las pruebas.
//
// Solo rige al **fijar** una contraseña (registrarse, restablecerla, cambiarla, aceptar una invitación o crear un usuario);
// iniciar sesión no la revisa, así que las cuentas que ya existen siguen entrando igual.

export const MIN_PASSWORD_LENGTH = 8;
// bcrypt ignora todo lo que pase de 72 bytes
export const MAX_PASSWORD_LENGTH = 72;

/** La ayuda que se muestra junto al campo cuando alguien elige una contraseña. */
export const PASSWORD_HINT = `Usa al menos ${MIN_PASSWORD_LENGTH} caracteres e incluye una mayúscula.`;

export type PasswordChecks = { length: boolean; uppercase: boolean };

/** Qué requisitos cumple una contraseña (para marcarlos mientras se escribe). Una mayúscula es cualquier letra en mayúscula, con tilde o Ñ incluidas. */
export function passwordChecks(password: string): PasswordChecks {
  return {
    length: password.length >= MIN_PASSWORD_LENGTH,
    uppercase: /\p{Lu}/u.test(password),
  };
}

/** Devuelve un mensaje de error, o null si la contraseña es válida. */
export function passwordError(password: unknown): string | null {
  if (typeof password !== "string") return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres y una letra mayúscula`;

  const { length, uppercase } = passwordChecks(password);
  if (!length && !uppercase) return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres y una letra mayúscula`;
  if (!length) return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  if (!uppercase) return "Agrega al menos una letra mayúscula a tu contraseña";
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_LENGTH) {
    return `La contraseña no puede superar ${MAX_PASSWORD_LENGTH} caracteres`;
  }
  return null;
}
