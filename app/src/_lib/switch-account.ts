// A dónde lleva "¿No es tu cuenta?" en las páginas de invitación (ver _components/switch-account.tsx). Pura y sin
// dependencias: la usan el componente y las pruebas.

export type SwitchAccountRole = "CLUB_OWNER" | "JUGADOR";

/**
 * La dirección del inicio de sesión o del registro que vuelve a `here` al terminar. En el registro deja elegido el
 * perfil de la invitación (delegado o jugador). `here` va codificado: lleva el token, que es el secreto de la invitación.
 */
export function switchAccountPath(view: "login" | "register", here: string, registerRole: SwitchAccountRole): string {
  const role = view === "register" ? `&rol=${registerRole}` : "";
  return `/?auth=${view}${role}&next=${encodeURIComponent(here)}`;
}
