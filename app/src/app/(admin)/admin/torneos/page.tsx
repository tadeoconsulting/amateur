"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useApi } from "@/_lib/use-api";
import { formatLabel } from "@/_lib/tournament-labels";
import { TournamentModal } from "./_components/tournament-modal";
import { MultiSelect } from "../_components/multi-select";
import { SortTh, useSort } from "../_components/sortable";
import { ConfirmDelete } from "../_components/confirm-delete";
import { TorneosEliminados, type DeletedTournament } from "./_components/eliminados";

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
  organizerId: string;
  organizer: { firstName: string; lastName: string };
}

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-gray-100 text-gray-600" },
  inscripcion: { label: "Inscripción", color: "bg-amber-100 text-amber-700" },
  en_curso: { label: "En curso", color: "bg-green-100 text-green-700" },
  finalizado: { label: "Finalizado", color: "bg-blue-100 text-blue-700" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700" },
};

const sortAccessors = {
  name: (t: TournamentRow) => t.name,
  format: (t: TournamentRow) => formatLabel(t.format),
  teams: (t: TournamentRow) => t.teamsCount,
  matches: (t: TournamentRow) => t.matchesCount,
  start: (t: TournamentRow) => new Date(t.startDate).getTime(),
  location: (t: TournamentRow) => t.location,
  organizer: (t: TournamentRow) => `${t.organizer.firstName} ${t.organizer.lastName}`,
  status: (t: TournamentRow) => statusLabels[t.status]?.label ?? t.status,
};

const countBy = <T,>(rows: T[], key: (r: T) => string) => {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(key(r), (counts.get(key(r)) ?? 0) + 1);
  return counts;
};

function AdminTorneosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [organizerFilter, setOrganizerFilter] = useState<string[]>([]);
  const [formatFilter, setFormatFilter] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(searchParams.get("crear") === "true");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<TournamentRow | null>(null);
  const [vista, setVista] = useState<"activos" | "eliminados">("activos");

  // Se trae todo y se filtra acá: los filtros son de varias opciones a la vez y se combinan.
  const { data: tournaments, loading, refetch } = useApi<TournamentRow[]>(() => fetch("/api/tournaments").then((r) => r.json()));

  // Los eliminados se piden aparte (solo un admin puede): se traen siempre, para mostrar cuántos hay.
  const { data: eliminados, refetch: refetchEliminados } = useApi<DeletedTournament[]>(() => fetch("/api/tournaments?deleted=1").then((r) => r.json()));

  const filtered = tournaments?.filter((t) => {
    if (statusFilter.length > 0 && !statusFilter.includes(t.status)) return false;
    if (organizerFilter.length > 0 && !organizerFilter.includes(t.organizerId)) return false;
    if (formatFilter.length > 0 && !formatFilter.includes(t.format)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.location.toLowerCase().includes(q);
  });
  const { sorted, sort, toggle } = useSort(filtered, sortAccessors);

  const rows = tournaments ?? [];
  const statusCounts = countBy(rows, (t) => t.status);
  const formatCounts = countBy(rows, (t) => t.format);
  const organizerCounts = countBy(rows, (t) => t.organizerId);
  const statusOptions = Object.entries(statusLabels)
    .filter(([value]) => statusCounts.has(value))
    .map(([value, { label }]) => ({ value, label, hint: String(statusCounts.get(value)) }));
  const formatOptions = [...formatCounts.entries()]
    .map(([value, n]) => ({ value, label: formatLabel(value), hint: String(n) }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
  const organizerOptions = [...organizerCounts.entries()]
    .map(([value, n]) => {
      const o = rows.find((t) => t.organizerId === value)!.organizer;
      return { value, label: `${o.firstName} ${o.lastName}`.trim(), hint: String(n) };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
  const hasFilters = statusFilter.length + organizerFilter.length + formatFilter.length > 0 || search !== "";

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

      <div role="tablist" aria-label="Vista de torneos" className="mb-5 flex gap-1 rounded-xl bg-btn-regular p-1 w-fit">
        {([
          { key: "activos", label: "Activos" },
          { key: "eliminados", label: `Eliminados${eliminados && eliminados.length > 0 ? ` (${eliminados.length})` : ""}` },
        ] as const).map((v) => (
          <button
            key={v.key}
            role="tab"
            type="button"
            aria-selected={vista === v.key}
            onClick={() => setVista(v.key)}
            className={`cursor-pointer rounded-lg px-4 py-2 font-heading text-xs font-semibold transition-colors ${
              vista === v.key ? "bg-surface-primary text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {vista === "eliminados" ? (
        <TorneosEliminados rows={eliminados ?? []} onChanged={() => { refetchEliminados(); refetch(); }} />
      ) : (
        <>
      {/* Search and filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-sm flex-1">
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

        <MultiSelect allLabel="Todos los estados" noun="estados" options={statusOptions} selected={statusFilter} onChange={setStatusFilter} />
        <MultiSelect allLabel="Todos los organizadores" noun="organizadores" options={organizerOptions} selected={organizerFilter} onChange={setOrganizerFilter} searchPlaceholder="Buscar organizador..." />
        <MultiSelect allLabel="Todos los formatos" noun="formatos" options={formatOptions} selected={formatFilter} onChange={setFormatFilter} />
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setSearch(""); setStatusFilter([]); setOrganizerFilter([]); setFormatFilter([]); }}
            className="cursor-pointer font-heading text-xs font-bold text-text-primary underline"
          >
            Quitar filtros
          </button>
        )}

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
                <SortTh label="Torneo" sortKey="name" sort={sort} onToggle={toggle} />
                <SortTh label="Formato" sortKey="format" sort={sort} onToggle={toggle} />
                <SortTh label="Equipos" sortKey="teams" sort={sort} onToggle={toggle} align="center" />
                <SortTh label="Partidos" sortKey="matches" sort={sort} onToggle={toggle} align="center" />
                <SortTh label="Inicio" sortKey="start" sort={sort} onToggle={toggle} />
                <SortTh label="Ubicación" sortKey="location" sort={sort} onToggle={toggle} />
                <SortTh label="Organizador" sortKey="organizer" sort={sort} onToggle={toggle} />
                <SortTh label="Estado" sortKey="status" sort={sort} onToggle={toggle} align="center" />
                <th className="px-4 py-3 text-right font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sorted?.map((t) => {
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
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(t.id)}
                          aria-label={`Editar ${t.name}`}
                          className="cursor-pointer rounded-lg border border-border-primary px-3 py-1.5 font-heading text-xs font-semibold text-text-primary transition-colors hover:bg-btn-regular"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeleting(t)}
                          aria-label={`Eliminar ${t.name}`}
                          className="cursor-pointer rounded-lg border border-red-200 px-3 py-1.5 font-heading text-xs font-semibold text-red-700 transition-colors hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      </div>
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

        </>
      )}

      {showCreate && (
        <TournamentModal
          onClose={() => { setShowCreate(false); router.replace("/admin/torneos"); }}
          onSaved={handleCreated}
        />
      )}
      {deleting && (
        <ConfirmDelete
          title="¿Eliminar este torneo?"
          confirmLabel="Eliminar torneo"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const res = await fetch(`/api/tournaments/${deleting.id}`, { method: "DELETE" });
            if (!res.ok) return ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo eliminar el torneo";
            setDeleting(null);
            refetch();
            refetchEliminados();
            return null;
          }}
        >
          <p>
            <strong className="text-text-primary">{deleting.name}</strong> tiene {deleting.teamsCount} {deleting.teamsCount === 1 ? "equipo inscrito" : "equipos inscritos"} y{" "}
            {deleting.matchesCount} {deleting.matchesCount === 1 ? "partido" : "partidos"}.
          </p>
          <p>
            Deja de verse para el organizador, los clubes, los jugadores y el público. No se borra nada: queda en la pestaña <strong className="text-text-primary">Eliminados</strong>,
            desde donde puedes restaurarlo con todo lo que tenía o eliminarlo definitivamente.
          </p>
        </ConfirmDelete>
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
