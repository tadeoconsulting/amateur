// La ciudad de un club (especificación 009, entrega 6): texto libre, opcional, de hasta 60 caracteres. Pura y sin
// dependencias: la usan las rutas de la API y las pruebas.

export const CITY_MAX = 60;

/** El mensaje si la ciudad no sirve; null si está bien (incluye no mandarla, vacía o null: se borra). */
export function cityValidationError(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return "city inválido";
  return value.trim().length > CITY_MAX ? `La ciudad admite hasta ${CITY_MAX} caracteres` : null;
}

/** La ciudad lista para guardar: sin espacios sobrantes; vacía o ausente = null. */
export function cleanCity(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().replace(/\s+/g, " ") : null;
}
