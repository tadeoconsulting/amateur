// Lógica pura del desplegable propio `Picklist` (especificación 022): sin React, para probarla con node:test. El componente solo
// mueve el foco y pinta; qué opción sigue, a cuál saltar al escribir y qué texto se muestra se decide aquí.

export type PicklistOption = { value: string; label: string; disabled?: boolean };

/** Índice de la opción con ese valor, o -1 si no hay. */
export function indexOfValue(options: PicklistOption[], value: string): number {
  return options.findIndex((o) => o.value === value);
}

/** Primera opción habilitada, o -1. */
export function firstEnabled(options: PicklistOption[]): number {
  return options.findIndex((o) => !o.disabled);
}

/** Última opción habilitada, o -1. */
export function lastEnabled(options: PicklistOption[]): number {
  for (let i = options.length - 1; i >= 0; i--) if (!options[i].disabled) return i;
  return -1;
}

/**
 * La opción habilitada que sigue (`step` 1) o precede (`step` -1) a `from`, dando la vuelta al llegar al borde. Con `from` -1
 * arranca desde el primero (si baja) o desde el último (si sube). -1 si no hay ninguna habilitada.
 */
export function stepEnabled(options: PicklistOption[], from: number, step: 1 | -1): number {
  const total = options.length;
  if (total === 0) return -1;
  let index = from < 0 ? (step === 1 ? -1 : total) : from;
  for (let tries = 0; tries < total; tries++) {
    index = (index + step + total) % total;
    if (!options[index].disabled) return index;
  }
  return -1;
}

const normalizar = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("es");

/**
 * Al escribir, la siguiente opción habilitada cuyo texto empieza con lo escrito (sin distinguir mayúsculas ni tildes). Busca
 * desde la opción siguiente a `from` y da la vuelta; con la misma letra repetida («a», «a») recorre las que empiezan con ella.
 * -1 si ninguna coincide.
 */
export function typeaheadIndex(options: PicklistOption[], query: string, from: number): number {
  const buscado = normalizar(query);
  if (!buscado) return -1;
  const total = options.length;
  const repetida = buscado.length > 1 && [...buscado].every((c) => c === buscado[0]);
  const prefijo = repetida ? buscado[0] : buscado;
  // Una sola letra repetida avanza a la opción siguiente; un prefijo más largo puede quedarse en la actual.
  const inicio = repetida || buscado.length === 1 ? from + 1 : from;
  for (let n = 0; n < total; n++) {
    const i = (((inicio + n) % total) + total) % total;
    if (!options[i].disabled && normalizar(options[i].label).startsWith(prefijo)) return i;
  }
  return -1;
}

/** El texto del botón: la opción elegida o, si no hay, el marcador. */
export function picklistLabel(options: PicklistOption[], value: string, placeholder = ""): { text: string; isPlaceholder: boolean } {
  const i = indexOfValue(options, value);
  if (i >= 0 && value !== "") return { text: options[i].label, isPlaceholder: false };
  return { text: placeholder, isPlaceholder: true };
}
