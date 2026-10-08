// Cómo se muestra la abreviatura de un equipo (el "shortName"). Lógica pura, sin alias `@/`.

/**
 * Largo máximo de una abreviatura, contando espacios. Es la regla para todos: lo que se puede
 * escribir (admin, organizador, dueño de club) y lo que se muestra completo en pantalla. Una
 * más larga (de antes de esta regla) se muestra cortada con "...".
 */
export const SHORT_NAME_MAX = 10;

/** Mensaje si la abreviatura no vale (vacía o de más de `SHORT_NAME_MAX` caracteres); null si está bien. */
export function shortNameError(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length < 1 || text.length > SHORT_NAME_MAX) {
    return `El nombre corto debe tener entre 1 y ${SHORT_NAME_MAX} caracteres`;
  }
  return null;
}

/** "BARRIO FINO FC" (14) → "BARRIO FIN...". Hasta `max` caracteres se muestra completa. */
export function displayShortName(shortName: string, max: number = SHORT_NAME_MAX): string {
  const text = shortName.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}...`;
}
