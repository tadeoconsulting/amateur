// Regla de negocio: una cuenta de administrador es solo eso. No comparte perfil con organizador,
// club, jugador, sponsor ni fan (la persona que administra y la que prueba como organizador son
// dos cuentas distintas). Lo mismo vale para la mesa (especificación 011): quien gestiona el partido en
// vivo no es además organizador, delegado ni jugador. Lógica pura, sin Prisma: la usan las rutas y las
// pruebas unitarias.

/** Mensaje si el conjunto de roles mezcla ADMIN o MESA con otros; null si está bien. */
export function adminRolesError(roles: readonly string[]): string | null {
  if (roles.includes("ADMIN") && roles.some((r) => r !== "ADMIN")) {
    return "Una cuenta de administrador no puede tener otros perfiles: crea una cuenta aparte";
  }
  if (roles.includes("MESA") && roles.some((r) => r !== "MESA")) {
    return "Una cuenta de mesa no puede tener otros perfiles: crea una cuenta aparte";
  }
  return null;
}

export const ADMIN_LOGIN_PATH = "/admin/login";

/** El login público no admite administradores: ingresan por su propia URL. */
export const ADMIN_USE_OWN_LOGIN_MESSAGE = `Las cuentas de administrador ingresan por ${ADMIN_LOGIN_PATH}`;
