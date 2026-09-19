"use client";

import { useState, useEffect } from "react";
import { BackHeader } from "@/_components/back-header";
import { PlayerRosterRow } from "@/_components/player-roster-row";
import { Toast } from "@/_components/toast";
import { searchUsers, type UserItem } from "@/_lib/api";
import type { RosterPlayer } from "@/_lib/types";

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
    position: u.playerProfile?.position ?? "",
    age: 0,
    avatarUrl: u.avatarUrl,
    verified: false,
    status: "activo",
    categoryId: "",
    clubId: u.playerProfile?.club?.id ?? "",
  }));

  const handleInvite = (id: string, name: string) => {
    setInvited((prev) => new Set(prev).add(id));
    setToast(`Se envio la invitacion a ${name}.`);
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
    </div>
  );
}
