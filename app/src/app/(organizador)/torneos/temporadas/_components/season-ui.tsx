// Estilos de los formularios de temporadas (los mismos del asistente "Crear torneo"). Las etapas y el estado
// de una temporada están en `@/_components/season-stages`, compartidos con la vista pública.

/** Campo de texto o fecha del Crono DS. */
export const fieldClass =
  "w-full rounded border border-transparent bg-btn-regular px-3 py-3 font-body text-sm text-text-primary placeholder:text-text-primary/60 transition-colors hover:border-border-primary hover:bg-surface-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none";

export const labelClass = "mb-2 block font-heading text-sm font-semibold text-text-primary";

/** Opción elegible en forma de botón (los clasificados, como "Equipos que clasifican a las llaves"). */
export function chipClass(selected: boolean) {
  return `h-11 min-w-11 cursor-pointer rounded-lg border px-3 font-heading text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary ${
    selected ? "border-border-primary bg-surface-secondary text-text-invert" : "border-border-primary text-text-primary hover:bg-btn-regular"
  }`;
}
