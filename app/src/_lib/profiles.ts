// Lógica pura de perfiles: sin React ni alias `@/`, para que Node la importe directo en las
// pruebas unitarias (ver constitución, sección 3). `lib/profiles.tsx` agrega el ícono de cada
// uno para la UI.

export type ProfileRole = "ORGANIZADOR" | "CLUB_OWNER" | "JUGADOR";

export const PROFILE_ROLES: { role: ProfileRole; label: string; description: string; href: string }[] = [
  { role: "ORGANIZADOR", label: "Organizador de torneo", description: "Crea y gestiona torneos", href: "/crear-torneo" },
  { role: "CLUB_OWNER", label: "Equipo de fútbol", description: "Administra tu equipo y su plantilla", href: "/club" },
  { role: "JUGADOR", label: "Jugador", description: "Sigue tus partidos y estadísticas", href: "/jugador" },
];

/**
 * Regla de negocio: con un solo perfil activable no se pregunta nada, se entra directo a su
 * pantalla. Solo con más de uno (o ninguno todavía) hace falta elegir en "seleccion-perfil".
 * `roles` es lo que trae la cuenta (incluye cosas ajenas a esta lista, como ADMIN, que se
 * ignoran acá).
 */
export function soleProfileHome(roles: string[]): string | undefined {
  const own = PROFILE_ROLES.filter((p) => roles.includes(p.role));
  return own.length === 1 ? own[0].href : undefined;
}
