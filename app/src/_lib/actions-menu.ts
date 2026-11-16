// Navegación con teclado del menú «Acciones» (especificación 021). Lógica pura, sin React: recibe los ítems y devuelve
// a cuál ir; el componente solo mueve el foco.

export type MenuNavItem = { disabled?: boolean };

/** Índice del primer ítem habilitado, o -1 si no hay ninguno. */
export function firstEnabledIndex(items: MenuNavItem[]): number {
  return items.findIndex((item) => !item.disabled);
}

/** Índice del último ítem habilitado, o -1 si no hay ninguno. */
export function lastEnabledIndex(items: MenuNavItem[]): number {
  for (let i = items.length - 1; i >= 0; i--) if (!items[i].disabled) return i;
  return -1;
}

/**
 * El ítem habilitado que sigue (`step` 1) o precede (`step` -1) a `from`, dando la vuelta al llegar al borde.
 * Con `from` -1 (nada enfocado) arranca desde el primero (si baja) o desde el último (si sube).
 * Devuelve -1 si no hay ningún ítem habilitado.
 */
export function nextEnabledIndex(items: MenuNavItem[], from: number, step: 1 | -1): number {
  const total = items.length;
  if (total === 0) return -1;
  let index = from < 0 ? (step === 1 ? -1 : total) : from;
  for (let tries = 0; tries < total; tries++) {
    index = (index + step + total) % total;
    if (!items[index].disabled) return index;
  }
  return -1;
}
