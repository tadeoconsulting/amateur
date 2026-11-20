// El estilo ÚNICO de los campos de formulario de toda la plataforma (especificación 022). Ningún formulario repite estas clases:
// se usan los componentes `TextField`, `TextArea`, `Picklist`, `PasswordInput`, `DatePicker` y `TimePicker`, que salen de aquí.
// Es la base del design system (`/design-system/inputs`) y debe mantenerse sincronizada con él.
//
// Medidas (las del club, 2026-11-20): radio 8 px, relleno de 12 px a los lados y arriba y abajo (el alto sale del texto: unos 46 px
// en escritorio y 50 px en el celular), borde de 1 px.
// Letra: 16 px en el celular (también evita que Safari de iPhone amplíe la pantalla) y 14 px desde 768 px (escritorio).
// Los colores salen de los tokens del ámbito (`bg-btn-regular`, `text-text-primary`…), así el mismo campo se ve bien en el
// tema oscuro «Cancha» y en el claro.

/** Caja del campo: tamaño, radio, relleno, tipografía y marcador. */
export const fieldBox =
  "w-full rounded-lg border bg-btn-regular px-3 py-3 font-body text-base md:text-sm text-text-primary placeholder:text-text-primary/60 transition-colors";

/** Estados normales: sin borde a la vista, borde al pasar el ratón, borde y fondo al enfocar, y deshabilitado. */
export const fieldStates =
  "border-transparent hover:border-border-primary hover:bg-surface-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

/** Estado con error: el borde en rojo también al pasar el ratón y al enfocar. */
export const fieldInvalidStates =
  "border-error hover:border-error hover:bg-surface-primary focus:border-error focus:bg-surface-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

/** Las clases completas de un campo. `invalid` pinta el borde de error. */
export function fieldClass(invalid = false): string {
  return `${fieldBox} ${invalid ? fieldInvalidStates : fieldStates}`;
}

/** Los textos de ayuda y de error debajo de un campo. */
export const fieldHelpClass = "mt-1.5 font-body text-xs text-text-secondary";
export const fieldErrorClass = "mt-1.5 font-body text-xs text-error";

/** El panel y las opciones del desplegable único (`Picklist`), iguales en sus dos variantes. */
const picklistPanelBase =
  "animate-menu-in absolute z-50 mt-1 max-h-[min(20rem,70vh)] overflow-auto rounded-lg border border-border-primary bg-surface-alt p-1.5 shadow-xl shadow-black/30";
/** Variante selector: del ancho del campo. */
export const picklistPanelClass = `${picklistPanelBase} left-0 right-0 top-full`;
/** Panel «en el flujo» de la página (sin flotar), para usar el desplegable dentro de un modal con scroll. */
export const picklistInlinePanelClass =
  "animate-menu-in mt-1 max-h-[min(20rem,70vh)] overflow-auto rounded-lg border border-border-primary bg-surface-alt p-1.5";
/** Variante menú: a la derecha del botón, de 256 px. */
export const picklistMenuPanelClass = `${picklistPanelBase} right-0 top-full w-64 max-w-[calc(100vw-2rem)] origin-top-right`;
/** Una opción del selector (14 px desde 768 px, 16 px en el celular, como los campos). */
export const picklistOptionClass =
  "flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md px-3 font-body text-base md:text-sm text-text-primary";
/** Una acción del menú (16 px siempre). */
export const picklistMenuItemClass =
  "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left font-body text-base font-semibold transition-colors hover:bg-btn-regular focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-text-primary disabled:cursor-not-allowed disabled:opacity-40";
