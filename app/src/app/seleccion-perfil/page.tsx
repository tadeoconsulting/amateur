"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/_components/mobile-shell";
import { BackHeader } from "@/_components/back-header";
import { useAuth } from "@/lib/auth-context";
import { PROFILES, type ProfileRole } from "@/lib/profiles";

function ProfileRow({
  profile,
  disabled,
  onClick,
}: {
  profile: (typeof PROFILES)[number];
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border-primary px-3 py-2.5 text-left transition-colors hover:bg-brand-300 disabled:opacity-50"
    >
      <span className="text-text-primary">{profile.icon}</span>
      <span className="flex-1 font-heading text-sm font-semibold text-text-primary">{profile.label}</span>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-secondary">
        <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export default function SeleccionPerfilPage() {
  const router = useRouter();
  const { user, loading: loadingAuth, addRole } = useAuth();
  const [pending, setPending] = useState<ProfileRole | null>(null);
  const [error, setError] = useState("");

  if (loadingAuth || !user) {
    return (
      <MobileShell>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      </MobileShell>
    );
  }

  // Entrar a uno de los que ya tiene no vuelve a activarlo (ya lo tiene). Uno nuevo sí lo activa.
  async function enter(profile: (typeof PROFILES)[number], isNew: boolean) {
    setError("");
    setPending(profile.role);
    if (isNew) {
      const result = await addRole(profile.role);
      if (!result.ok) {
        setError(result.error ?? "No se pudo activar el perfil");
        setPending(null);
        return;
      }
    }
    router.push(profile.href);
  }

  const mine = PROFILES.filter((p) => user.roles.includes(p.role));
  const missing = PROFILES.filter((p) => !user.roles.includes(p.role));

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

          {mine.length > 0 && (
            <div className="mb-6 flex flex-col gap-4">
              {mine.map((profile) => (
                <ProfileRow
                  key={profile.role}
                  profile={profile}
                  disabled={pending !== null}
                  onClick={() => enter(profile, false)}
                />
              ))}
            </div>
          )}

          {missing.length > 0 && (
            <div>
              <p className="mb-3 font-heading text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Crear un perfil nuevo
              </p>
              <div className="flex flex-col gap-4">
                {missing.map((profile) => (
                  <ProfileRow
                    key={profile.role}
                    profile={profile}
                    disabled={pending !== null}
                    onClick={() => enter(profile, true)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MobileShell>
  );
}
