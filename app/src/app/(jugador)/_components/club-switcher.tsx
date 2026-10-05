"use client";

import { useState } from "react";
import { setActiveClub, type UserDetail } from "@/_lib/api";
import { ClubCrest } from "@/_components/club-crest";

export type PlayerClub = NonNullable<UserDetail["playerProfiles"][number]["club"]>;

/**
 * El botón con el equipo actual (arriba a la derecha de Actividad) que, tocado, abre el diálogo para
 * cambiar de equipo. Solo se usa cuando el jugador tiene más de uno: con uno solo, Actividad muestra
 * únicamente la etiqueta y no hay nada que abrir.
 */
export function ClubSwitcher({
  userId,
  clubs,
  activeClubId,
  onSwitched,
}: {
  userId: string;
  clubs: PlayerClub[];
  activeClubId: string | null;
  onSwitched: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const active = clubs.find((c) => c.id === activeClubId) ?? clubs[0];

  async function choose(club: PlayerClub) {
    if (club.id === active.id) {
      setOpen(false);
      return;
    }
    setBusyId(club.id);
    setError("");
    const result = await setActiveClub(userId, club.id);
    setBusyId(null);
    if (!result.ok) {
      setError(result.error ?? "No se pudo cambiar de equipo");
      return;
    }
    setOpen(false);
    onSwitched();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex min-w-0 cursor-pointer items-center gap-1 rounded-full border border-border-primary bg-surface-alternative py-2 pl-3 pr-3"
      >
        <ClubCrest club={active} size="h-6 w-6" />
        <span className="truncate font-heading text-xs font-semibold text-text-primary">{active.name}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-text-primary">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[110] bg-black/40" onClick={() => busyId === null && setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="club-switcher-title"
            className="fixed inset-x-0 bottom-0 z-[120] mx-auto max-w-[430px] rounded-t-2xl bg-surface-primary px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5"
          >
            <div className="mb-4 flex justify-center">
              <div className="h-1 w-10 rounded-full bg-brand-300" />
            </div>
            <h2 id="club-switcher-title" className="mb-4 text-center font-heading text-lg font-bold text-text-primary">
              ¿Con qué equipo sales hoy?
            </h2>

            <ul className="flex flex-col gap-2">
              {clubs.map((club) => {
                const isActive = club.id === active.id;
                return (
                  <li key={club.id}>
                    <button
                      onClick={() => choose(club)}
                      disabled={busyId !== null}
                      aria-current={isActive ? "true" : undefined}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-left disabled:opacity-60 ${
                        isActive ? "border-text-primary bg-btn-regular" : "border-border-primary"
                      }`}
                    >
                      <ClubCrest club={club} size="h-10 w-10" textSize="text-xs" />
                      <span className="min-w-0 flex-1 truncate font-heading text-sm font-bold text-text-primary">{club.name}</span>
                      {isActive && (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-label="Equipo actual" className="shrink-0 text-verification">
                          <circle cx="10" cy="10" r="10" fill="currentColor" />
                          <path d="M5.5 10.5l3 3 6-6.5" stroke="#1b1b1b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            {error && (
              <p role="alert" className="mt-3 text-center font-body text-sm text-red-600">
                {error}
              </p>
            )}
            <button
              onClick={() => setOpen(false)}
              disabled={busyId !== null}
              className="mt-4 w-full cursor-pointer py-2 text-center font-heading text-sm font-semibold text-text-primary underline disabled:opacity-60"
            >
              Cerrar
            </button>
          </div>
        </>
      )}
    </>
  );
}
