"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useApi } from "@/_lib/use-api";

interface ClubRow {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  color: string | null;
  playerCount: number;
  categoriesCount: number;
  owner: { firstName: string; lastName: string };
}

interface UserOption {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

const clubColors = ["#E53935", "#43A047", "#1E88E5", "#FB8C00", "#8E24AA", "#00ACC1", "#F4511E", "#7B1FA2"];

function CreateClubModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "",
    shortName: "",
    color: "#E53935",
    delegadoNombre: "",
    delegadoTel: "",
    delegadoEmail: "",
  });
  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerResults, setOwnerResults] = useState<UserOption[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<UserOption | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ownerSearch.length < 2) { setOwnerResults([]); return; }
    const timer = setTimeout(() => {
      fetch(`/api/users?search=${encodeURIComponent(ownerSearch)}`)
        .then((r) => r.json())
        .then(setOwnerResults)
        .catch(() => setOwnerResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [ownerSearch]);

  const handleSubmit = async () => {
    if (!form.name || !form.shortName || !selectedOwner) {
      setError("Nombre, abreviatura y dueño son requeridos");
      return;
    }
    setSaving(true);
    setError(null);

    const res = await fetch("/api/clubs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ownerId: selectedOwner.id }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error al crear club");
      setSaving(false);
      return;
    }

    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-surface-primary p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-text-primary">Crear club</h2>
          <button onClick={onClose} className="cursor-pointer p-1 text-text-secondary hover:text-text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 font-body text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <p className="font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Datos del club</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Nombre *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
                placeholder="Deportivo Union"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Abreviatura *</label>
              <input
                value={form.shortName}
                onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value.toUpperCase() }))}
                maxLength={4}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
                placeholder="DPU"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block font-body text-xs font-medium text-text-secondary">Color del club</label>
            <div className="flex gap-2">
              {clubColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`h-8 w-8 cursor-pointer rounded-full transition-transform ${form.color === c ? "scale-110 ring-2 ring-offset-2 ring-brand-500" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <hr className="border-border-primary" />
          <p className="font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Delegado / Dueño</p>

          <div>
            <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Dueño del club *</label>
            {selectedOwner ? (
              <div className="flex items-center justify-between rounded-lg border border-brand-300 bg-brand-50 px-3 py-2.5">
                <span className="font-body text-sm text-text-primary">
                  {selectedOwner.firstName} {selectedOwner.lastName} ({selectedOwner.email})
                </span>
                <button onClick={() => setSelectedOwner(null)} className="cursor-pointer text-text-secondary hover:text-text-primary">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  value={ownerSearch}
                  onChange={(e) => setOwnerSearch(e.target.value)}
                  className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
                  placeholder="Buscar usuario por nombre..."
                />
                {ownerResults.length > 0 && ownerSearch.length >= 2 && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-border-primary bg-surface-primary shadow-lg">
                    {ownerResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => { setSelectedOwner(u); setOwnerSearch(""); }}
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

          <div>
            <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Nombre del delegado</label>
            <input
              value={form.delegadoNombre}
              onChange={(e) => setForm((f) => ({ ...f, delegadoNombre: e.target.value }))}
              className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              placeholder="Nombre completo del delegado"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Teléfono del delegado</label>
              <input
                value={form.delegadoTel}
                onChange={(e) => setForm((f) => ({ ...f, delegadoTel: e.target.value }))}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
                placeholder="999 999 999"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Correo del delegado</label>
              <input
                type="email"
                value={form.delegadoEmail}
                onChange={(e) => setForm((f) => ({ ...f, delegadoEmail: e.target.value }))}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
                placeholder="delegado@club.com"
              />
            </div>
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
            {saving ? "Creando..." : "Crear club"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminClubesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(searchParams.get("crear") === "true");

  const { data: clubs, loading, refetch } = useApi<ClubRow[]>(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    return fetch(`/api/clubs?${params.toString()}`).then((r) => r.json());
  });

  const handleCreated = () => {
    setShowCreate(false);
    router.replace("/admin/clubes");
    refetch();
  };

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Clubes</h1>
          <p className="mt-1 font-body text-sm text-text-secondary">
            Gestiona los clubes de la plataforma
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-surface-secondary px-4 py-2.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Crear club
        </button>
      </div>

      {/* Search */}
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
            placeholder="Buscar club..."
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

      {/* Clubs table */}
      {loading || !clubs ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-primary bg-surface-primary">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary bg-brand-50">
                <th className="px-4 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Club</th>
                <th className="px-4 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Abreviatura</th>
                <th className="px-4 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Dueño</th>
                <th className="px-4 py-3 text-center font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Jugadores</th>
                <th className="px-4 py-3 text-center font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Categorías</th>
              </tr>
            </thead>
            <tbody>
              {clubs.map((club, i) => (
                <tr key={club.id} className="border-b border-border-primary last:border-0 hover:bg-brand-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: (club.color || clubColors[i % clubColors.length]) + "20" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M3.5 1.5h7v3.5a3.5 3.5 0 01-7 0V1.5z" stroke={club.color || clubColors[i % clubColors.length]} strokeWidth="1" />
                        </svg>
                      </div>
                      <span className="font-heading text-sm font-semibold text-text-primary">{club.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded bg-brand-100 px-2 py-0.5 font-heading text-xs font-bold text-text-primary">
                      {club.shortName}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-body text-sm text-text-secondary">
                      {club.owner.firstName} {club.owner.lastName}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-heading text-sm font-bold text-text-primary">{club.playerCount}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-heading text-sm font-bold text-text-primary">{club.categoriesCount}</span>
                  </td>
                </tr>
              ))}
              {clubs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center font-body text-sm text-text-secondary">
                    No se encontraron clubes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateClubModal onClose={() => { setShowCreate(false); router.replace("/admin/clubes"); }} onCreated={handleCreated} />}
    </div>
  );
}

export default function AdminClubesPage() {
  return (
    <Suspense fallback={null}>
      <AdminClubesContent />
    </Suspense>
  );
}
