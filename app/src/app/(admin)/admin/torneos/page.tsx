"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useApi } from "@/_lib/use-api";
import { formatLabel } from "@/_lib/tournament-labels";
import { TournamentModal } from "./_components/tournament-modal";

interface TournamentRow {
  id: string;
  name: string;
  format: string;
  status: string;
  category: string | null;
  maxTeams: number;
  teamsCount: number;
  matchesCount: number;
  startDate: string;
  endDate: string | null;
  location: string;
  organizer: { firstName: string; lastName: string };
}

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-gray-100 text-gray-600" },
  inscripcion: { label: "Inscripción", color: "bg-amber-100 text-amber-700" },
  en_curso: { label: "En curso", color: "bg-green-100 text-green-700" },
  finalizado: { label: "Finalizado", color: "bg-blue-100 text-blue-700" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700" },
};

function AdminTorneosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(searchParams.get("crear") === "true");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: tournaments, loading, refetch } = useApi<TournamentRow[]>(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    return fetch(`/api/tournaments?${params.toString()}`).then((r) => r.json());
  });

  const filtered = tournaments?.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.location.toLowerCase().includes(q);
  });

  const handleCreated = () => {
    setShowCreate(false);
    router.replace("/admin/torneos");
    refetch();
  };

  const handleEdited = () => {
    setEditingId(null);
    refetch();
  };

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Torneos</h1>
          <p className="mt-1 font-body text-sm text-text-secondary">
            Gestiona los torneos de la plataforma
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-surface-secondary px-4 py-2.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Crear torneo
        </button>
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
            className="w-full rounded-lg border border-border-primary bg-surface-primary py-2.5 pl-9 pr-3 font-body text-sm text-text-primary outline-none focus:border-brand-500"
            placeholder="Buscar torneo..."
          />
        </div>

        <div className="flex gap-1.5">
          {[
            { value: null, label: "Todos" },
            { value: "inscripcion", label: "Inscripción" },
            { value: "en_curso", label: "En curso" },
            { value: "finalizado", label: "Finalizado" },
            { value: "draft", label: "Borrador" },
          ].map((opt) => (
            <button
              key={opt.value ?? "all"}
              onClick={() => { setStatusFilter(opt.value); setTimeout(refetch, 0); }}
              className={`cursor-pointer rounded-lg px-3 py-1.5 font-heading text-xs font-semibold transition-colors ${
                statusFilter === opt.value
                  ? "bg-surface-secondary text-text-invert"
                  : "border border-border-primary text-text-secondary hover:bg-btn-regular hover:text-text-primary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={refetch}
          aria-label="Actualizar lista"
          className="cursor-pointer rounded-lg border border-border-primary p-2.5 text-text-secondary transition-colors hover:bg-btn-regular hover:text-text-primary"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 8a6 6 0 0110.89-3.48M14 8a6 6 0 01-10.89 3.48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M14 2v3h-3M2 14v-3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Tournaments table */}
      {loading || !filtered ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-primary bg-surface-primary">
          <table className="w-full min-w-[1050px]">
            <thead>
              <tr className="border-b border-border-primary bg-brand-50">
                <th className="px-4 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Torneo</th>
                <th className="px-4 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Formato</th>
                <th className="px-4 py-3 text-center font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Equipos</th>
                <th className="px-4 py-3 text-center font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Partidos</th>
                <th className="px-4 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Inicio</th>
                <th className="px-4 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Ubicación</th>
                <th className="px-4 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Organizador</th>
                <th className="px-4 py-3 text-center font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Estado</th>
                <th className="px-4 py-3 text-right font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const st = statusLabels[t.status] || { label: t.status, color: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={t.id} className="border-b border-border-primary last:border-0 hover:bg-brand-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-heading text-sm font-semibold text-text-primary">{t.name}</p>
                        {t.category && (
                          <p className="font-body text-xs text-text-secondary">{t.category}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-body text-sm text-text-secondary">
                        {formatLabel(t.format)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-heading text-sm font-bold text-text-primary">
                        {t.teamsCount}/{t.maxTeams}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-heading text-sm font-bold text-text-primary">{t.matchesCount}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-body text-sm text-text-secondary">
                        {new Date(t.startDate).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-body text-sm text-text-secondary">{t.location}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-body text-sm text-text-secondary">
                        {t.organizer.firstName} {t.organizer.lastName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.color}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditingId(t.id)}
                        aria-label={`Editar ${t.name}`}
                        className="cursor-pointer rounded-lg border border-border-primary px-3 py-1.5 font-heading text-xs font-semibold text-text-primary transition-colors hover:bg-btn-regular"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center font-body text-sm text-text-secondary">
                    No se encontraron torneos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <TournamentModal
          onClose={() => { setShowCreate(false); router.replace("/admin/torneos"); }}
          onSaved={handleCreated}
        />
      )}
      {editingId && <TournamentModal key={editingId} tournamentId={editingId} onClose={() => setEditingId(null)} onSaved={handleEdited} />}
    </div>
  );
}

export default function AdminTorneosPage() {
  return (
    <Suspense fallback={null}>
      <AdminTorneosContent />
    </Suspense>
  );
}
