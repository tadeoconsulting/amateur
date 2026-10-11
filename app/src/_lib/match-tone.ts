// El color del estado de un partido, en una sola parte (sin dependencias: lo usan las pantallas y las pruebas):
//   en vivo → rojo · descanso → negro · finalizado → gris.
// Un partido por jugarse no tiene color propio (se queda con el texto de siempre).

export type MatchTone = "live" | "break" | "finished" | "scheduled";

/** El estado visible de un partido: "en vivo" salvo que esté en el descanso (período `descanso`, especificación 010). */
export function matchTone(status: string, period?: string | null): MatchTone {
  if (status === "en_curso") return period === "descanso" ? "break" : "live";
  if (status === "finalizado") return "finished";
  return "scheduled";
}

/**
 * Las clases de cada estado. `bar` es el relleno de la barra de tiempo; `text`, un texto o número suelto; `chip`, una
 * etiqueta con fondo (se lee sobre cualquier color); `soft`, la misma etiqueta con fondo tenue; `dot`, el punto.
 */
export const MATCH_TONE: Record<MatchTone, { bar: string; text: string; chip: string; soft: string; dot: string }> = {
  live: { bar: "bg-red", text: "text-red", chip: "bg-red text-white", soft: "bg-red/10 text-red", dot: "bg-red" },
  break: {
    bar: "bg-surface-secondary",
    text: "text-text-primary",
    chip: "bg-surface-secondary text-text-invert",
    soft: "bg-surface-secondary/10 text-text-primary",
    dot: "bg-surface-secondary",
  },
  finished: { bar: "bg-brand-500", text: "text-text-secondary", chip: "bg-brand-200 text-text-secondary", soft: "bg-brand-200 text-text-secondary", dot: "bg-brand-500" },
  scheduled: { bar: "bg-brand-300", text: "text-text-primary", chip: "bg-brand-100 text-text-secondary", soft: "bg-brand-100 text-text-secondary", dot: "bg-brand-300" },
};
