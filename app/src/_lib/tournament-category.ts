// Categorías de los torneos de un club: las pestañas salen de los torneos reales, no de una lista fija. Lógica pura,
// sin dependencias, para probarla directo.

/** La categoría de un torneo que no tiene ninguna escrita (los anteriores al asistente de creación). */
export const DEFAULT_CATEGORY = "Libre";

/** La clave de la pestaña que muestra todos los torneos, sin filtrar. */
export const ALL_CATEGORIES = "__todas__";

/** La categoría con la que se muestra y se agrupa un torneo. */
export const categoryOf = (t: { category: string | null }) => t.category?.trim() || DEFAULT_CATEGORY;

/**
 * Las categorías que existen entre los torneos, sin repetir: "Libre" primero y el resto en orden natural
 * ("Sub 9" antes que "Sub 18"). Dos escrituras que solo difieren en mayúsculas ("sub 18" y "Sub 18") cuentan como una.
 */
export function categoriesOf(tournaments: readonly { category: string | null }[]): string[] {
  const seen = new Map<string, string>();
  for (const t of tournaments) {
    const name = categoryOf(t);
    const key = name.toLocaleLowerCase("es");
    if (!seen.has(key)) seen.set(key, name);
  }
  return [...seen.values()].sort((a, b) => {
    if (a === DEFAULT_CATEGORY) return b === DEFAULT_CATEGORY ? 0 : -1;
    if (b === DEFAULT_CATEGORY) return 1;
    return a.localeCompare(b, "es", { numeric: true, sensitivity: "base" });
  });
}

/** Los torneos de una categoría (sin distinguir mayúsculas); `ALL_CATEGORIES` los devuelve todos. */
export function filterByCategory<T extends { category: string | null }>(tournaments: readonly T[], category: string): T[] {
  if (category === ALL_CATEGORIES) return [...tournaments];
  const wanted = category.toLocaleLowerCase("es");
  return tournaments.filter((t) => categoryOf(t).toLocaleLowerCase("es") === wanted);
}
