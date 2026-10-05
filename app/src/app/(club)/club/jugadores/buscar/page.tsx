"use client";

import { useState, useEffect } from "react";
import { BackHeader } from "@/_components/back-header";
import { PlayerRosterRow } from "@/_components/player-roster-row";
import { Toast } from "@/_components/toast";
import { useApi } from "@/_lib/use-api";
import { useMyClub } from "@/_lib/use-my-club";
import { searchUsers, type UserItem } from "@/_lib/api";
import type { RosterPlayer } from "@/_lib/types";

interface SentInvitation {
  id: string;
  email: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

/** Invitaciones personales que el club ya envió y siguen pendientes, con opción de
 * cancelarlas — antes no había forma de verlas ni retirarlas (ver especificación 005). */
function PendingInvitations({ clubId }: { clubId: string }) {
  const { data: invitations, loading, refetch } = useApi<SentInvitation[]>(() =>
    fetch(`/api/clubs/${clubId}/invite`).then((r) => r.json())
  );
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = (invitations ?? []).filter((i) => i.status === "pending");

  const cancel = async (id: string) => {
    setCancelling(id);
    setError(null);
    const res = await fetch(`/api/clubs/${clubId}/invite/${id}`, { method: "DELETE" });
    setCancelling(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo cancelar la invitación");
      return;
    }
    refetch();
  };

  if (loading || pending.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="px-4 font-heading text-base font-bold text-text-primary">
        Invitaciones pendientes
      </p>
      {error && <p className="px-4 pt-2 font-body text-sm text-red-600">{error}</p>}
      <div className="mt-2">
        {pending.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between gap-3 border-b border-brand-200 px-4 py-3 last:border-0">
            <p className="min-w-0 truncate font-body text-sm text-text-primary">{inv.email}</p>
            <button
              onClick={() => cancel(inv.id)}
              disabled={cancelling === inv.id}
              className="shrink-0 cursor-pointer text-sm font-medium text-red-600 underline disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ClubBuscarJugadorPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [invited, setInvited] = useState<Set<string>>(new Set());

  useEffect(() => {
    const term = query.trim();
    if (term.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      searchUsers({ search: term, role: "JUGADOR" })
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const showResults = query.trim().length > 0;

  const communityPlayers: RosterPlayer[] = results.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    position: u.playerProfiles[0]?.position ?? "",
    age: 0,
    avatarUrl: u.avatarUrl,
    verified: false,
    status: "activo",
    categoryId: "",
    clubId: u.playerProfiles.find((p) => p.club)?.club?.id ?? "",
  }));

  // Invita de verdad: el jugador la ve en su área ("Mis equipos") y decide si acepta.
  const { club } = useMyClub();
  const handleInvite = async (id: string, name: string) => {
    if (!club) {
      setToast("Primero necesitas tener un equipo para invitar jugadores.");
      return;
    }
    try {
      const res = await fetch(`/api/clubs/${club.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast(data.error ?? "No se pudo enviar la invitación.");
        return;
      }
      setInvited((prev) => new Set(prev).add(id));
      setToast(data.alreadyInvited ? `${name} ya tenía una invitación pendiente.` : data.emailed ? `Se envió la invitación a ${name}, también por correo.` : `Se envió la invitación a ${name}.`);
    } catch {
      setToast("No se pudo conectar. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="w-full">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <BackHeader />

      <div className="px-4">
        <h2 className="font-heading text-base font-bold text-text-primary">Buscar Jugador</h2>

        {/* Search input */}
        <div className="relative mt-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ingresa el nombre o apellido"
            className="w-full rounded-lg border border-brand-200 bg-brand-100 py-3 pl-3 pr-10 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-900 focus:outline-none"
          />
          <svg
            width="18"
            height="18"
            viewBox="0 0 22 22"
            fill="none"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
          >
            <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M15 15l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Results */}
      {showResults && (
        <div className="mt-6">
          <p className="px-4 font-heading text-base font-bold text-text-primary">
            Resultados de busqueda
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          ) : communityPlayers.length > 0 ? (
            <div className="mt-2">
              {communityPlayers.map((player) => (
                <PlayerRosterRow
                  key={player.id}
                  player={player}
                  action={
                    invited.has(player.id) ? (
                      <span className="shrink-0 text-sm font-medium text-verification">Invitado</span>
                    ) : (
                      <button
                        onClick={() =>
                          handleInvite(player.id, `${player.firstName} ${player.lastName}`)
                        }
                        className="shrink-0 cursor-pointer text-sm font-medium text-text-primary underline"
                      >
                        Invitar
                      </button>
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-text-secondary">
              No se encontraron jugadores
            </p>
          )}
        </div>
      )}

      {!showResults && club && <PendingInvitations clubId={club.id} />}
    </div>
  );
}
