// Estilos de los formularios de temporadas (los mismos del asistente "Crear torneo"). Las etapas y el estado
// de una temporada están en `@/_components/season-stages`, compartidos con la vista pública.

/** Espaciado de la etiqueta de un campo (la tipografía sale de `Label`). */
export const labelClass = "mb-2 block";

/** Opción elegible en forma de botón (los clasificados, como "Equipos que clasifican a las llaves"). */
export function chipClass(selected: boolean) {
  return `h-11 min-w-11 cursor-pointer rounded-lg border px-3 font-heading text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary ${
    selected ? "border-border-primary bg-surface-secondary text-text-invert" : "border-border-primary text-text-primary hover:bg-btn-regular"
  }`;
}
