"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/_components/mobile-shell";
import { BackHeader } from "@/_components/back-header";
import { useAuth } from "@/lib/auth-context";

// Cada perfil de la pantalla corresponde a un rol de la cuenta.
const ROLE_BY_PROFILE = {
  organizador: "ORGANIZADOR",
  club: "CLUB_OWNER",
  jugador: "JUGADOR",
} as const;

const profiles = [
  {
    id: "organizador",
    label: "Organizador de torneo",
    href: "/crear-torneo",
    icon: (
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 3L18.09 9.26L25 10.27L20 15.14L21.18 22.02L15 18.77L8.82 22.02L10 15.14L5 10.27L11.91 9.26L15 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 25H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M11 28H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "club",
    label: "Equipo de fútbol",
    href: "/club",
    icon: (
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 2C15 2 6 4 6 10V18L15 28L24 18V10C24 4 15 2 15 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="15" cy="14" r="5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M15 9L16.5 12.5H20L17.25 14.75L18.25 18.5L15 16L11.75 18.5L12.75 14.75L10 12.5H13.5L15 9Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "jugador",
    label: "Jugador",
    href: "/jugador",
    icon: (
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="15" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 13C10 13 12 12 15 12C18 12 20 13 20 13L22 20H18L17 16L15 22L13 16L12 20H8L10 13Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 22L10 28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M18 22L20 28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function SeleccionPerfilPage() {
  const router = useRouter();
  const { addRole } = useAuth();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function choose(profile: (typeof profiles)[number]) {
    setError("");
    setPending(profile.id);
    const result = await addRole(ROLE_BY_PROFILE[profile.id as keyof typeof ROLE_BY_PROFILE]);
    if (!result.ok) {
      setError(result.error ?? "No se pudo activar el perfil");
      setPending(null);
      return;
    }
    router.push(profile.href);
  }

  return (
    <MobileShell>
      <BackHeader />

      <div className="flex flex-1 flex-col px-4">
        {/* Logo */}
        <div className="flex flex-1 items-center justify-center">
          <span className="font-heading text-[32px] font-bold tracking-tight text-text-primary">
            amateur
          </span>
        </div>

        {/* Profile selection */}
        <div className="pb-10">
          <p className="font-body text-base text-text-primary mb-6">
            Elige un perfil para continuar
          </p>

          {error && <p className="mb-3 font-body text-sm text-red-600">{error}</p>}

          <div className="flex flex-col gap-4">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => choose(profile)}
                disabled={pending !== null}
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border-primary px-3 py-2.5 text-left transition-colors hover:bg-brand-300 disabled:opacity-50"
              >
                <span className="text-text-primary">{profile.icon}</span>
                <span className="flex-1 font-heading text-sm font-semibold text-text-primary">
                  {profile.label}
                </span>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-secondary">
                  <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
