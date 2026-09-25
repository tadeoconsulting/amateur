"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/_components/mobile-shell";
import { BackHeader } from "@/_components/back-header";
import { useAuth } from "@/lib/auth-context";
import { PROFILES } from "@/lib/profiles";

export default function SeleccionPerfilPage() {
  const router = useRouter();
  const { addRole } = useAuth();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function choose(profile: (typeof PROFILES)[number]) {
    setError("");
    setPending(profile.role);
    const result = await addRole(profile.role);
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
            {PROFILES.map((profile) => (
              <button
                key={profile.role}
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
