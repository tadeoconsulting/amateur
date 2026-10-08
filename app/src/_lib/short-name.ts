// Cómo se muestra la abreviatura de un equipo (el "shortName"). Lógica pura, sin alias `@/`.

/** Largo máximo visible de una abreviatura, contando espacios. Pasado eso se corta con "...". */
export const SHORT_NAME_MAX = 10;

/** "BARRIO FINO FC" (14) → "BARRIO FIN...". Hasta `max` caracteres se muestra completa. */
export function displayShortName(shortName: string, max: number = SHORT_NAME_MAX): string {
  const text = shortName.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}...`;
}
