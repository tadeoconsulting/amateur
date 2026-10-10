// Identificadores legibles para las URLs públicas de los torneos
// (cupamateur.com/{organizador}/{torneo}). Lógica pura, sin Prisma ni alias `@/`: la usan el
// servidor y las pruebas unitarias.

/**
 * Primeros tramos de URL que ya son de la app. Como el organizador va en la raíz, ningún
 * organizador puede llamarse así (se le agrega sufijo: "club" → "club-2"), o su link chocaría
 * con una pantalla. Incluye también lo que Next/el navegador piden en la raíz.
 */
export const RESERVED_SLUGS: readonly string[] = [
  "admin", "ajustes", "api", "ayuda", "club", "convocatoria", "crear-torneo", "dashboard",
  "design-system", "dev", "favicon-ico", "jugador", "jugadores", "login", "notificaciones", "onboarding",
  "partidos", "privacidad", "registro", "restablecer", "robots-txt", "seleccion-perfil", "sitemap-xml",
  "staff", "terminos", "torneos",
];

/** "Liga 1 - La Ensenada" → "liga-1-la-ensenada". Sin tildes, minúsculas, guiones. Puede quedar vacío. */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** `base` si está libre; si no, `base-2`, `base-3`... El primero que no esté en `taken`. */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Texto del que sale el tramo del organizador: su organización, o su nombre si no tiene. */
export function organizerSlugBase(person: { organization?: string | null; firstName: string; lastName: string }): string {
  const fromOrg = slugify(person.organization?.trim() ?? "");
  return fromOrg || slugify(`${person.firstName} ${person.lastName}`) || "organizador";
}

/** Texto del que sale el tramo del torneo: su nombre. */
export function tournamentSlugBase(name: string): string {
  return slugify(name) || "torneo";
}

/** Ruta pública de un torneo. Sin identificadores todavía (torneos viejos), la convocatoria por id. */
export function tournamentPublicPath(t: { id: string; slug?: string | null; organizerSlug?: string | null }): string {
  return t.slug && t.organizerSlug ? `/${t.organizerSlug}/${t.slug}` : `/convocatoria/${t.id}`;
}

/** La página pública de un club dentro de un torneo: `/{organizador}/{torneo}/equipo/{clubId}`. */
export function clubPublicPath(t: { id: string; slug?: string | null; organizerSlug?: string | null }, clubId: string): string {
  return `${tournamentPublicPath(t)}/equipo/${clubId}`;
}
