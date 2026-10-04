import { randomInt } from "node:crypto";

// Sin los caracteres que se confunden al dictarlos o copiarlos a mano (0/O, 1/l/I).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
export const TEMP_PASSWORD_LENGTH = 12;

/** Contraseña temporal aleatoria (criptográficamente segura) para que un admin se la entregue a alguien. */
export function generateTempPassword(length: number = TEMP_PASSWORD_LENGTH): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}
