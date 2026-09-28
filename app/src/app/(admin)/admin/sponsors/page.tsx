"use client";

import { useState } from "react";
import {
  getSponsors,
  getTournaments,
  type SponsorRow,
  type TournamentListItem,
} from "@/_lib/api";
import { useApi } from "@/_lib/use-api";

interface SponsorDetail {
  id: string;
  name: string;
  logoUrl: string | null;
  website: string | null;
  tournaments: { id: string; name: string; status: string; startDate: string }[];
}

function LogoThumb({ url, name }: { url: string | null; name: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- logo de sponsor: URL externa arbitraria, no un asset propio.
    return <img src={url} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-border-primary object-contain" />;
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-200 font-heading text-xs font-bold text-text-primary">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function CreateSponsorModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", logoUrl: "", website: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("El nombre es requerido");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/sponsors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        logoUrl: form.logoUrl || null,
        website: form.website || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Error al crear sponsor");
      setSaving(false);
      return;
    }
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-surface-primary p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-text-primary">Crear sponsor</h2>
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
            <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Nombre *</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              placeholder="Gatorade Perú"
            />
          </div>
          <div>
            <label className="mb-1 block font-body text-xs font-medium text-text-secondary">URL del logo</label>
            <input
              value={form.logoUrl}
              onChange={(e) => set("logoUrl", e.target.value)}
              className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              placeholder="https://…"
            />
          </div>
          <div>
            <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Sitio web</label>
            <input
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              placeholder="https://…"
            />
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
            {saving ? "Creando..." : "Crear sponsor"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditSponsorModal({
  sponsor,
  onClose,
  onSaved,
}: {
  sponsor: SponsorRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ name: sponsor.name, logoUrl: sponsor.logoUrl ?? "", website: sponsor.website ?? "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tournamentSearch, setTournamentSearch] = useState("");

  const { data: detail, refetch: refetchDetail } = useApi<SponsorDetail>(() =>
    fetch(`/api/sponsors/${sponsor.id}`).then((r) => r.json())
  );
  const { data: allTournaments } = useApi<TournamentListItem[]>(() => getTournaments());

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("El nombre es requerido");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/sponsors/${sponsor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        logoUrl: form.logoUrl || null,
        website: form.website || null,
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

  const linkedIds = new Set((detail?.tournaments ?? []).map((t) => t.id));

  const toggleTournament = async (tournamentId: string, linked: boolean) => {
    if (linked) {
      await fetch(`/api/tournaments/${tournamentId}/sponsors/${sponsor.id}`, { method: "DELETE" });
    } else {
      await fetch(`/api/tournaments/${tournamentId}/sponsors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sponsorId: sponsor.id }),
      });
    }
    refetchDetail();
  };

  const visibleTournaments = (allTournaments ?? []).filter((t) =>
    t.name.toLowerCase().includes(tournamentSearch.trim().toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-surface-primary p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-text-primary">Editar sponsor</h2>
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
          <p className="font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Datos del sponsor</p>
          <div>
            <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Nombre *</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block font-body text-xs font-medium text-text-secondary">URL del logo</label>
            <input
              value={form.logoUrl}
              onChange={(e) => set("logoUrl", e.target.value)}
              className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              placeholder="https://…"
            />
          </div>
          <div>
            <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Sitio web</label>
            <input
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              placeholder="https://…"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="cursor-pointer self-start rounded-lg bg-surface-secondary px-4 py-2 font-heading text-xs font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar datos"}
          </button>

          <hr className="border-border-primary" />
          <p className="font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Torneos que auspicia
          </p>
          <input
            value={tournamentSearch}
            onChange={(e) => setTournamentSearch(e.target.value)}
            className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
            placeholder="Buscar torneo..."
          />
          <div className="max-h-56 overflow-y-auto rounded-lg border border-border-primary">
            {visibleTournaments.length === 0 && (
              <p className="px-3 py-4 text-center font-body text-sm text-text-secondary">No se encontraron torneos</p>
            )}
            {visibleTournaments.map((t) => {
              const linked = linkedIds.has(t.id);
              return (
                <label
                  key={t.id}
                  className="flex cursor-pointer items-center justify-between gap-3 border-b border-border-primary px-3 py-2.5 last:border-0 hover:bg-brand-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-body text-sm text-text-primary">{t.name}</p>
                    <p className="font-body text-xs text-text-secondary">{t.organizer.firstName} {t.organizer.lastName}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={linked}
                    onChange={() => toggleTournament(t.id, linked)}
                    className="h-4 w-4 shrink-0 cursor-pointer"
                  />
                </label>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-border-primary px-5 py-2.5 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSponsorsPage() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<SponsorRow | null>(null);

  const { data: sponsors, loading, refetch } = useApi<SponsorRow[]>(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    return getSponsors(Object.fromEntries(params));
  });

  const handleCreated = () => {
    setShowCreate(false);
    refetch();
  };

  const handleSaved = () => {
    setEditingSponsor(null);
    refetch();
  };

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Sponsors</h1>
          <p className="mt-1 font-body text-sm text-text-secondary">
            Auspiciadores de torneos — alta y vinculación gestionadas por el equipo comercial
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-surface-secondary px-4 py-2.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Crear sponsor
        </button>
      </div>

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
            placeholder="Buscar sponsor..."
          />
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

      {loading || !sponsors ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-primary bg-surface-primary">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary bg-brand-50">
                <th className="px-4 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Sponsor</th>
                <th className="px-4 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Sitio web</th>
                <th className="px-4 py-3 text-center font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Torneos</th>
                <th className="px-4 py-3 text-right font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sponsors.map((s) => (
                <tr key={s.id} className="border-b border-border-primary last:border-0 hover:bg-brand-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <LogoThumb url={s.logoUrl} name={s.name} />
                      <span className="font-heading text-sm font-semibold text-text-primary">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {s.website ? (
                      <a
                        href={s.website}
                        target="_blank"
                        rel="noreferrer"
                        className="font-body text-sm text-brand-700 underline"
                      >
                        {s.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      <span className="font-body text-sm text-text-secondary">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-heading text-sm font-bold text-text-primary">{s.tournamentsCount}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditingSponsor(s)}
                      className="cursor-pointer rounded-lg border border-border-primary px-3 py-1.5 font-heading text-xs font-semibold text-text-primary transition-colors hover:bg-btn-regular"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {sponsors.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center font-body text-sm text-text-secondary">
                    No se encontraron sponsors
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateSponsorModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {editingSponsor && <EditSponsorModal sponsor={editingSponsor} onClose={() => setEditingSponsor(null)} onSaved={handleSaved} />}
    </div>
  );
}
