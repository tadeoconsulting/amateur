// Valores y etiquetas de un torneo. Sin dependencias de servidor: lo usan tanto
// la UI como la validación de la API.

/** Tipos de competencia. `label` es lo que ve la persona, `format` lo que se guarda. */
export const COMPETITION_TYPES = [
  { label: "Eliminación directa", format: "eliminacion" },
  { label: "Relámpago", format: "relampago" },
  { label: "Formato Copa", format: "copa" },
  { label: "Formato de Liga", format: "liga" },
] as const;

// "grupos" no está en el asistente pero existe en torneos anteriores.
export const FORMATS: string[] = [...COMPETITION_TYPES.map((t) => t.format), "grupos"];

const FORMAT_LABELS: Record<string, string> = {
  eliminacion: "Eliminación",
  relampago: "Relámpago",
  copa: "Copa",
  liga: "Liga",
  grupos: "Grupos",
};

/** Nombre corto del formato para listados. Un valor desconocido se muestra como Eliminación. */
export function formatLabel(format: string) {
  return FORMAT_LABELS[format] ?? "Eliminación";
}

/** Convierte el texto elegido en el asistente ("Formato de Liga") al valor guardado ("liga"). */
export function formatFromCompetitionLabel(label: string) {
  return COMPETITION_TYPES.find((t) => t.label === label)?.format ?? null;
}

export const TOURNAMENT_STATUSES = ["draft", "inscripcion", "en_curso", "finalizado"] as const;

/** Mientras el torneo está en alguno de estos estados se pueden inscribir y quitar equipos. */
export const OPEN_STATUSES: string[] = ["draft", "inscripcion"];
export const MODALITIES = ["5 vs 5", "6 vs 6", "7 vs 7", "8 vs 8", "9 vs 9", "11 vs 11"] as const;
export const GENDERS = ["Femenino", "Masculino", "Mixto"] as const;
