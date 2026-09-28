"use client";

import { useState, useEffect } from "react";
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

interface CategoryOption {
  id: string;
  name: string;
  gender: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  activo: { label: "Activo", color: "bg-green-100 text-green-700" },
  inactivo: { label: "Inactivo", color: "bg-gray-100 text-gray-600" },
  lesionado: { label: "Lesionado", color: "bg-red-100 text-red-700" },
  suspendido: { label: "Suspendido", color: "bg-amber-100 text-amber-700" },
};

const positions = [
  "Portero", "Defensa central", "Lateral", "Libre", "Carrilero",
  "Pivote", "Media punta", "Volante", "Delantero centro", "Extremo",
];

function EditPlayerModal({
  player,
  clubs,
  onClose,
  onSaved,
}: {
  player: PlayerRow;
  clubs: ClubOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    position: player.position ?? "",
    number: player.number != null ? String(player.number) : "",
    status: player.status,
    clubId: player.club?.id ?? "",
    categoryId: player.category?.id ?? "",
  });
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  // Las categorías dependen del club elegido: al cambiar de club hay que volver a pedirlas.
  // Sin club no hay fetch — el select simplemente no muestra opciones (ver más abajo).
  useEffect(() => {
    if (!form.clubId) return;
    let cancelled = false;
    fetch(`/api/clubs/${form.clubId}/categories`)
      .then((r) => r.json())
      .then((data: CategoryOption[]) => { if (!cancelled) setCategories(data); })
      .catch(() => { if (!cancelled) setCategories([]); });
    return () => { cancelled = true; };
  }, [form.clubId]);

  const visibleCategories = form.clubId ? categories : [];

  const handleClubChange = (clubId: string) => {
    setForm((f) => ({ ...f, clubId, categoryId: clubId === player.club?.id ? f.categoryId : "" }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        position: form.position || null,
        number: form.number ? Number(form.number) : null,
        status: form.status,
        clubId: form.clubId || null,
        categoryId: form.categoryId || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo guardar");
      setSaving(false);
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-surface-primary p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-text-primary">
            Editar jugador — {player.user.firstName} {player.user.lastName}
          </h2>
          <button onClick={onClose} className="cursor-pointer p-1 text-text-secondary hover:text-text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 font-body text-sm text-red-700">{error}</div>
        )}

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Posición</label>
              <select
                value={form.position}
                onChange={(e) => set("position", e.target.value)}
                className="w-full cursor-pointer rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              >
                <option value="">Sin definir</option>
                {positions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Número</label>
              <input
                type="number"
                value={form.number}
                onChange={(e) => set("number", e.target.value)}
                min={1}
                max={99}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
                placeholder="10"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Club</label>
            <select
              value={form.clubId}
              onChange={(e) => handleClubChange(e.target.value)}
              className="w-full cursor-pointer rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
            >
              <option value="">Sin club</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.shortName})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Categoría</label>
            <select
              value={form.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              disabled={!form.clubId}
              className="w-full cursor-pointer rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Sin categoría</option>
              {visibleCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.gender})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Estado</label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className="w-full cursor-pointer rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
            >
              {Object.entries(statusLabels).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-border-primary px-5 py-2.5 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="cursor-pointer rounded-lg bg-surface-secondary px-5 py-2.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminJugadoresPage() {
  const [search, setSearch] = useState("");
  const [clubFilter, setClubFilter] = useState<string | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<PlayerRow | null>(null);

  const { data: clubs } = useApi<ClubOption[]>(() =>
    fetch("/api/clubs").then((r) => r.json())
  );

  const { data: players, loading, refetch } = useApi<PlayerRow[]>(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (clubFilter) params.set("clubId", clubFilter);
    return fetch(`/api/players?${params.toString()}`).then((r) => r.json());
  });

  const handlePlayerSaved = () => {
    setEditingPlayer(null);
    refetch();
  };

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
                <th className="px-4 py-3 text-right font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Acciones</th>
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
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditingPlayer(player)}
                        className="cursor-pointer rounded-lg border border-border-primary px-3 py-1.5 font-heading text-xs font-semibold text-text-primary transition-colors hover:bg-btn-regular"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {players.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center font-body text-sm text-text-secondary">
                    No se encontraron jugadores
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingPlayer && (
        <EditPlayerModal
          player={editingPlayer}
          clubs={clubs ?? []}
          onClose={() => setEditingPlayer(null)}
          onSaved={handlePlayerSaved}
        />
      )}
    </div>
  );
}
