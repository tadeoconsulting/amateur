// Lógica pura del nombre que se muestra en la navegación principal (especificación 001): sin React ni alias `@/`, para que
// Node la importe directo en las pruebas unitarias (ver constitución, sección 3).

export type NavIdentityKind = "organizador" | "jugador" | "club";

type NavUser = { firstName: string; lastName: string; organization?: string | null };

/** Nombre y apellido de la persona, sin espacios de más. */
export function fullName(user: Pick<NavUser, "firstName" | "lastName">): string {
  return `${user.firstName} ${user.lastName}`.replace(/\s+/g, " ").trim();
}

/**
 * Lo que muestra el botón de cuenta según la pantalla en la que se está: el organizador, su organización (o su nombre si
 * no la puso); el delegado, el nombre de su club (o el suyo mientras no tiene uno); el jugador, su nombre y apellido.
 */
export function navName(kind: NavIdentityKind, user: NavUser, club?: { name: string } | null): string {
  const own = fullName(user);
  if (kind === "organizador") return user.organization?.trim() || own;
  if (kind === "club") return club?.name.trim() || own;
  return own;
}

/**
 * El nombre tal como cabe en el botón de cuenta: hasta `max` caracteres (12 por omisión) y, si tiene más, los primeros `max`
 * seguidos de dos puntos («organizador..»). El nombre completo sigue en el encabezado del menú y en `title`/`aria-label`.
 */
export function shortNavName(name: string, max = 12): string {
  const letters = Array.from(name.trim());
  if (letters.length <= max) return letters.join("");
  return `${letters.slice(0, max).join("").trimEnd()}..`;
}

/** La inicial para el círculo del botón (la primera letra del nombre mostrado, en mayúscula). */
export function navInitial(name: string): string {
  return name.trim().charAt(0).toLocaleUpperCase("es") || "?";
}
