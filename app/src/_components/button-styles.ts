// Estilos de botón del Crono DS con lo que pide la guía de UX: alto táctil de 44px,
// foco visible con teclado, cursor de mano, transición de color y estado deshabilitado claro.
const base =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 font-heading text-sm font-bold " +
  "transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary " +
  "disabled:cursor-not-allowed disabled:opacity-40";

/** Acción principal de la pantalla. */
export const btnSolid = `${base} bg-surface-secondary text-text-invert hover:bg-brand-700`;
/** Acción secundaria o que rechaza. */
export const btnOutline = `${base} border border-border-primary text-text-primary hover:bg-btn-regular`;
/** Acción discreta (cancelar, quitar) que sigue teniendo área táctil completa. */
export const btnText = `${base} text-text-secondary underline hover:text-text-primary`;
