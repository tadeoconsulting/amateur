"use client";

import { useState } from "react";
import { useApi } from "@/_lib/use-api";

interface PlayerRow {
  id: string;
  userId: string;
  number: number | null;
  position: string | null;
  status: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
    phone: string | null;
  };
  club: { id: string; name: string; shortName: string } | null;
  category: { id: string; name: string; gender: string } | null;
}

interface ClubOption {
  id: string;
  name: string;
  shortName: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  activo: { label: "Activo", color: "bg-green-100 text-green-700" },
  inactivo: { label: "Inactivo", color: "bg-gray-100 text-gray-600" },
  lesionado: { label: "Lesionado", color: "bg-red-100 text-red-700" },
  suspendido: { label: "Suspendido", color: "bg-amber-100 text-amber-700" },
};

export default function AdminJugadoresPage() {
  const [search, setSearch] = useState("");
  const [clubFilter, setClubFilter] = useState<string | null>(null);

  const { data: clubs } = useApi<ClubOption[]>(() =>
    fetch("/api/clubs").then((r) => r.json())
  );

  const { data: players, loading, refetch } = useApi<PlayerRow[]>(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (clubFilter) params.set("clubId", clubFilter);
    return fetch(`/api/players?${params.toString()}`).then((r) => r.json());
  });

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-text-primary">Jugadores</h1>
        <p className="mt-1 font-body text-sm text-text-secondary">
          Todos los jugadores registrados en la plataforma
        </p>
      </div>

      {/* Search and filters */}
      <div className="mb-5 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && refetch()}
            className="w-full rounded-lg border border-border-primary bg-surface-primary py-2.5 pl-9 pr-3 font-body text-sm text-text-primary outline-none focus:border-brand-500"
            placeholder="Buscar jugador..."
          />
        </div>

        <select
          value={clubFilter || ""}
          onChange={(e) => { setClubFilter(e.target.value || null); setTimeout(refetch, 0); }}
          className="cursor-pointer rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
        >
          <option value="">Todos los clubes</option>
          {clubs?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <button
          onClick={refetch}
          className="cursor-pointer rounded-lg border border-border-primary p-2.5 text-text-secondary transition-colors hover:bg-btn-regular hover:text-text-primary"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 8a6 6 0 0110.89-3.48M14 8a6 6 0 01-10.89 3.48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M14 2v3h-3M2 14v-3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Players table */}
      {loading || !players ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-primary bg-surface-primary">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-border-primary bg-brand-50">
                <th className="px-4 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Jugador</th>
                <th className="px-4 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Email</th>
                <th className="px-4 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Club</th>
                <th className="px-4 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Categoría</th>
                <th className="px-4 py-3 text-center font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Posición</th>
                <th className="px-4 py-3 text-center font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">#</th>
                <th className="px-4 py-3 text-center font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Estado</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => {
                const st = statusLabels[player.status] || { label: player.status, color: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={player.id} className="border-b border-border-primary last:border-0 hover:bg-brand-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 font-heading text-xs font-bold text-blue-700">
                          {player.user.firstName[0]}{player.user.lastName[0]}
                        </div>
                        <div>
                          <p className="font-heading text-sm font-semibold text-text-primary">
                            {player.user.firstName} {player.user.lastName}
                          </p>
                          {player.user.phone && (
                            <p className="font-body text-xs text-text-secondary">{player.user.phone}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-body text-sm text-text-secondary">{player.user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {player.club ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex rounded bg-brand-100 px-1.5 py-0.5 font-heading text-[10px] font-bold text-text-primary">
                            {player.club.shortName}
                          </span>
                          <span className="font-body text-sm text-text-secondary">{player.club.name}</span>
                        </div>
                      ) : (
                        <span className="font-body text-sm text-text-secondary italic">Sin club</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {player.category ? (
                        <span className="font-body text-sm text-text-secondary">
                          {player.category.name} ({player.category.gender})
                        </span>
                      ) : (
                        <span className="font-body text-sm text-text-secondary italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-body text-sm text-text-secondary">
                        {player.position || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-heading text-sm font-bold text-text-primary">
                        {player.number ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.color}`}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {players.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center font-body text-sm text-text-secondary">
                    No se encontraron jugadores
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
