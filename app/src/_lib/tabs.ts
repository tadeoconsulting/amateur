// Lógica pura de los tabs (especificación 024): sin React, para probarla con node:test. El componente `Tabs` solo mueve el foco y
// pinta; qué tab sigue con cada tecla se decide aquí (el patrón de tabs de ARIA).

/**
 * El índice del tab al que lleva una tecla desde `index`: → y ← avanzan y retroceden sin dar la vuelta (se detienen en los
 * bordes), Inicio y Fin saltan al primero y al último. `null` si la tecla no mueve nada o no cambia de tab.
 */
export function nextTabIndex(key: string, index: number, total: number): number | null {
  if (total <= 0 || index < 0) return null;
  const next =
    key === "ArrowRight" ? Math.min(index + 1, total - 1)
    : key === "ArrowLeft" ? Math.max(index - 1, 0)
    : key === "Home" ? 0
    : key === "End" ? total - 1
    : null;
  return next === null || next === index ? null : next;
}

/** Como `nextTabIndex`, pero dando la vuelta al llegar al borde (la landing rota entre sus tarjetas). */
export function nextTabIndexWrapping(key: string, index: number, total: number): number | null {
  if (total <= 0 || index < 0) return null;
  if (key === "ArrowRight") return (index + 1) % total;
  if (key === "ArrowLeft") return (index - 1 + total) % total;
  if (key === "Home") return 0;
  if (key === "End") return total - 1;
  return null;
}
