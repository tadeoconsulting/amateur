import { createHash, randomBytes } from "node:crypto";

// Reglas del "Olvidé mi contraseña". Sin dependencias de servidor (más que node:crypto): las usan
// las rutas y las pruebas unitarias.

/** Cuánto vale el enlace del correo. */
export const RESET_TOKEN_MINUTES = 60;
/** Mientras tenga un enlace recién pedido, no se manda otro (evita llenarle la bandeja a alguien). */
export const RESET_COOLDOWN_SECONDS = 60;

/** El hash que se guarda en la base: del token que viaja en el enlace no queda copia. */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Token aleatorio de 256 bits para el enlace, y su hash para guardar. */
export function newResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashResetToken(token) };
}

export function resetExpiry(now: number = Date.now()): Date {
  return new Date(now + RESET_TOKEN_MINUTES * 60_000);
}

/** ¿Ya se pidió un enlace hace menos del tiempo de espera? */
export function inCooldown(lastRequestedAt: Date | null | undefined, now: number = Date.now()): boolean {
  return !!lastRequestedAt && now - lastRequestedAt.getTime() < RESET_COOLDOWN_SECONDS * 1000;
}
