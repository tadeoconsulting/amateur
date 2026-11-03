import { randomInt } from "node:crypto";

// Sin los caracteres que se confunden al dictarlos o copiarlos a mano (0/O, 1/l/I).
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";
const ALPHABET = UPPER + LOWER + DIGITS;
export const TEMP_PASSWORD_LENGTH = 12;

const pick = (chars: string) => chars[randomInt(chars.length)];

/**
 * Contraseña temporal aleatoria (criptográficamente segura) para que un admin se la entregue a alguien. **Siempre** lleva
 * al menos una mayúscula, una minúscula y un número: la misma regla de toda contraseña nueva ([`password-rules.ts`]) la
 * validaría, y una al azar sin mayúscula (alrededor de 1 de cada 800) haría fallar la creación de la cuenta.
 */
export function generateTempPassword(length: number = TEMP_PASSWORD_LENGTH): string {
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS)];
  while (chars.length < length) chars.push(pick(ALPHABET));
  // Se mezclan para que las tres garantizadas no queden siempre al principio.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.slice(0, Math.max(length, 0)).join("");
}
