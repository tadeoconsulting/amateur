"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useApi } from "@/_lib/use-api";

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

interface UserOption {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-gray-100 text-gray-600" },
  inscripcion: { label: "Inscripción", color: "bg-amber-100 text-amber-700" },
  en_curso: { label: "En curso", color: "bg-green-100 text-green-700" },
  finalizado: { label: "Finalizado", color: "bg-blue-100 text-blue-700" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700" },
};

const formatLabels: Record<string, string> = {
  liga: "Liga",
  eliminacion_directa: "Eliminación directa",
  grupos: "Grupos + Eliminación",
};

function CreateTournamentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "",
    format: "liga",
    maxTeams: 8,
    minTeams: 4,
    startDate: "",
    endDate: "",
    location: "",
    category: "",
    status: "inscripcion",
  });
  const [organizerSearch, setOrganizerSearch] = useState("");
  const [organizerResults, setOrganizerResults] = useState<UserOption[]>([]);
  const [selectedOrganizer, setSelectedOrganizer] = useState<UserOption | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organizerSearch.length < 2) { setOrganizerResults([]); return; }
    const timer = setTimeout(() => {
      fetch(`/api/users?search=${encodeURIComponent(organizerSearch)}&role=ORGANIZADOR`)
        .then((r) => r.json())
        .then(setOrganizerResults)
        .catch(() => setOrganizerResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [organizerSearch]);

  const handleSubmit = async () => {
    if (!form.name || !form.startDate || !form.location || !selectedOrganizer) {
      setError("Nombre, fecha de inicio, ubicación y organizador son requeridos");
      return;
    }
    setSaving(true);
    setError(null);

    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        maxTeams: Number(form.maxTeams),
        minTeams: Number(form.minTeams),
        endDate: form.endDate || null,
        category: form.category || null,
        organizerId: selectedOrganizer.id,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error al crear torneo");
      setSaving(false);
      return;
    }

    onCreated();
  };

  const set = (key: string, value: string | number) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-surface-primary p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-text-primary">Crear torneo</h2>
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
          <div>
            <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Nombre del torneo *</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              placeholder="Copa Comunidad 2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Formato *</label>
              <select
                value={form.format}
                onChange={(e) => set("format", e.target.value)}
                className="w-full cursor-pointer rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              >
                <option value="liga">Liga</option>
                <option value="eliminacion_directa">Eliminación directa</option>
                <option value="grupos">Grupos + Eliminación</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Estado inicial</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="w-full cursor-pointer rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              >
                <option value="draft">Borrador</option>
                <option value="inscripcion">Inscripción abierta</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Máx. equipos *</label>
              <input
                type="number"
                value={form.maxTeams}
                onChange={(e) => set("maxTeams", e.target.value)}
                min={2}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Mín. equipos</label>
              <input
                type="number"
                value={form.minTeams}
                onChange={(e) => set("minTeams", e.target.value)}
                min={2}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Fecha de inicio *</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Fecha de fin</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Ubicación *</label>
              <input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
                placeholder="Complejo Deportivo Norte"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Categoría</label>
              <input
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
                placeholder="Sub 15"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Organizador *</label>
            {selectedOrganizer ? (
              <div className="flex items-center justify-between rounded-lg border border-brand-300 bg-brand-50 px-3 py-2.5">
                <span className="font-body text-sm text-text-primary">
                  {selectedOrganizer.firstName} {selectedOrganizer.lastName} ({selectedOrganizer.email})
                </span>
                <button onClick={() => setSelectedOrganizer(null)} className="cursor-pointer text-text-secondary hover:text-text-primary">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  value={organizerSearch}
                  onChange={(e) => setOrganizerSearch(e.target.value)}
                  className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
                  placeholder="Buscar organizador por nombre..."
                />
                {organizerResults.length > 0 && organizerSearch.length >= 2 && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-border-primary bg-surface-primary shadow-lg">
                    {organizerResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => { setSelectedOrganizer(u); setOrganizerSearch(""); }}
                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left hover:bg-brand-50 transition-colors"
                      >
                        <span className="font-body text-sm text-text-primary">
                          {u.firstName} {u.lastName}
                        </span>
                        <span className="font-body text-xs text-text-secondary">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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
            onClick={handleSubmit}
            disabled={saving}
            className="cursor-pointer rounded-lg bg-surface-secondary px-5 py-2.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "Creando..." : "Crear torneo"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminTorneosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(searchParams.get("crear") === "true");

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
          <table className="w-full min-w-[950px]">
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
                        {formatLabels[t.format] || t.format}
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
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center font-body text-sm text-text-secondary">
                    No se encontraron torneos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateTournamentModal onClose={() => { setShowCreate(false); router.replace("/admin/torneos"); }} onCreated={handleCreated} />}
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
