import type { ReactNode } from "react";
import { PROFILE_ROLES, type ProfileRole } from "@/_lib/profiles";

export type { ProfileRole };
export { soleProfileHome, otherProfiles } from "@/_lib/profiles";

const ICONS: Record<ProfileRole, ReactNode> = {
  ORGANIZADOR: (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 3L18.09 9.26L25 10.27L20 15.14L21.18 22.02L15 18.77L8.82 22.02L10 15.14L5 10.27L11.91 9.26L15 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 25H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 28H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  CLUB_OWNER: (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 2C15 2 6 4 6 10V18L15 28L24 18V10C24 4 15 2 15 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="15" cy="14" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 9L16.5 12.5H20L17.25 14.75L18.25 18.5L15 16L11.75 18.5L12.75 14.75L10 12.5H13.5L15 9Z" fill="currentColor" />
    </svg>
  ),
  JUGADOR: (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="15" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 13C10 13 12 12 15 12C18 12 20 13 20 13L22 20H18L17 16L15 22L13 16L12 20H8L10 13Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 22L10 28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 22L20 28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

// Los perfiles que una persona puede tener, con su ícono para la UI. Una misma cuenta puede
// tener más de uno. Los usan la pantalla de registro y "seleccion-perfil".
export const PROFILES: { role: ProfileRole; label: string; description: string; href: string; icon: ReactNode }[] =
  PROFILE_ROLES.map((p) => ({ ...p, icon: ICONS[p.role] }));
