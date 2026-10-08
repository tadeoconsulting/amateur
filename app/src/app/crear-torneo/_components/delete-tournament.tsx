"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getMatches } from "@/_lib/api";

/**
 * "Eliminar torneo" de la pantalla de editar (DELETE /api/tournaments/:id): el torneo se oculta, con todo
 * lo que tiene, y un administrador puede restaurarlo. Si ya se jugó algo hay que escribir el nombre del
 * torneo para confirmar.
 */
export function DeleteTournament({ tournamentId, tournamentName }: { tournamentId: string; tournamentName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [played, setPlayed] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function openDialog() {
    setOpen(true);
    setError("");
    setTyped("");
    setPlayed(null);
    try {
      const matches = await getMatches({ tournamentId });
      setPlayed(matches.filter((m) => m.status !== "programado").length);
    } catch {
      // Sin saber cuántos se jugaron, se pide el nombre igual: es lo más seguro.
      setPlayed(1);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo eliminar el torneo.");
        return;
      }
      router.push("/torneos");
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setDeleting(false);
    }
  }

  const needsName = played !== null && played > 0;
  const canConfirm = played !== null && !deleting && (!needsName || typed.trim() === tournamentName.trim());

  return (
    <>
      <button
        onClick={openDialog}
        className="w-full cursor-pointer py-3 font-heading text-sm font-semibold text-error"
      >
        Eliminar torneo
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[110] bg-black/40" onClick={() => !deleting && setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-tournament-title"
            className="fixed inset-x-0 bottom-0 z-[120] mx-auto max-w-[430px] rounded-t-2xl bg-surface-primary px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6"
          >
            <h3 id="delete-tournament-title" className="mb-3 text-center font-heading text-lg font-bold text-text-primary">
              ¿Eliminar el torneo?
            </h3>
            <p className="mb-4 text-center font-body text-sm text-text-secondary">
              <strong>{tournamentName}</strong> deja de verse, con sus partidos, equipos inscritos, solicitudes y resultados. Si fue un error, el administrador puede restaurarlo.
            </p>

            {needsName && (
              <div className="mb-4">
                <label htmlFor="delete-tournament-name" className="mb-1 block font-body text-xs text-text-secondary">
                  Ya hay {played} {played === 1 ? "partido jugado o en juego" : "partidos jugados o en juego"}. Escribe el nombre del torneo para confirmar.
                </label>
                <input
                  id="delete-tournament-name"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={tournamentName}
                  autoComplete="off"
                  className="w-full rounded-lg border border-border-primary px-3 py-2.5 font-body text-base text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary/30"
                />
              </div>
            )}

            {error && <p className="mb-3 text-center font-body text-sm text-error">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={deleting}
                className="flex-1 cursor-pointer rounded-lg border border-border-primary py-3 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={!canConfirm}
                className="flex-1 cursor-pointer rounded-lg bg-error py-3 font-heading text-sm font-bold text-white transition-opacity disabled:opacity-40"
              >
                {deleting ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
