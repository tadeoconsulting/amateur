"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useApi } from "@/_lib/use-api";
import { ResetPassword } from "../_components/reset-password";
import { SHORT_NAME_MAX } from "@/_lib/short-name";
import { MultiSelect } from "../_components/multi-select";
import { SortTh, useSort } from "../_components/sortable";
import { AvatarCropper } from "@/_components/avatar-cropper";
import { ClubCrest } from "@/_components/club-crest";
import { uploadAvatarBlob } from "@/_lib/upload-avatar";
import { displayShortName } from "@/_lib/short-name";
import { ConfirmDelete } from "../_components/confirm-delete";

interface ClubRow {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  color: string | null;
  delegadoNombre: string | null;
  delegadoTel: string | null;
  delegadoEmail: string | null;
  ownerId: string;
  /** Equipo cargado por un organizador para su torneo (sin delegado ni jugadores propios). */
  isTemporary?: boolean;
  playerCount: number;
  categoriesCount: number;
  owner: { firstName: string; lastName: string; email?: string };
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
                maxLength={SHORT_NAME_MAX}
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

function EditClubModal({
  club,
  onClose,
  onSaved,
  onLogoChanged,
}: {
  club: ClubRow;
  onClose: () => void;
  onSaved: () => void;
  /** La imagen se guarda al momento (sin esperar a "Guardar"): se avisa para refrescar la lista. */
  onLogoChanged: () => void;
}) {
  const [form, setForm] = useState({
    name: club.name,
    shortName: club.shortName,
    color: club.color || clubColors[0],
    delegadoNombre: club.delegadoNombre ?? "",
    delegadoTel: club.delegadoTel ?? "",
    delegadoEmail: club.delegadoEmail ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(club.logoUrl);
  const [showCropper, setShowCropper] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);

  // Oficializar (solo equipos temporales): elegir al delegado que pasa a ser su dueño.
  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerResults, setOwnerResults] = useState<UserOption[]>([]);
  const [newOwner, setNewOwner] = useState<UserOption | null>(null);
  const [confirmOfficial, setConfirmOfficial] = useState(false);
  const [makingOfficial, setMakingOfficial] = useState(false);

  useEffect(() => {
    // Sin búsqueda no se pide nada; los resultados viejos no se muestran (ver `ownerSearch.length >= 2` abajo).
    if (!club.isTemporary || ownerSearch.length < 2) return;
    const timer = setTimeout(() => {
      fetch(`/api/users?search=${encodeURIComponent(ownerSearch)}`)
        .then((r) => r.json())
        .then((users: UserOption[]) => setOwnerResults(Array.isArray(users) ? users.filter((u) => !u.roles.includes("ADMIN")) : []))
        .catch(() => setOwnerResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [club.isTemporary, ownerSearch]);

  const makeOfficial = async () => {
    if (!newOwner || makingOfficial) return;
    setMakingOfficial(true);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${club.id}/oficializar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId: newOwner.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo oficializar el equipo");
        setConfirmOfficial(false);
        return;
      }
      onSaved();
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
      setConfirmOfficial(false);
    } finally {
      setMakingOfficial(false);
    }
  };

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  // La imagen de perfil del equipo se guarda al instante, igual que en los ajustes del club.
  // `getUrl` devuelve la URL a guardar, o null para quitarla (vuelve a mostrar iniciales y color).
  const saveLogo = async (getUrl: () => Promise<string | null>) => {
    setSavingLogo(true);
    setError(null);
    try {
      const url = await getUrl();
      const res = await fetch(`/api/clubs/${club.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: url }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo guardar la imagen");
        return;
      }
      setLogoUrl(url);
      onLogoChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setSavingLogo(false);
    }
  };

  const handleCropped = (blob: Blob) => {
    setShowCropper(false);
    void saveLogo(() => uploadAvatarBlob(blob));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.shortName.trim()) {
      setError("Nombre y abreviatura son requeridos");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/clubs/${club.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        shortName: form.shortName.trim(),
        color: form.color,
        delegadoNombre: form.delegadoNombre || null,
        delegadoTel: form.delegadoTel || null,
        delegadoEmail: form.delegadoEmail || null,
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
      <AvatarCropper open={showCropper} onClose={() => setShowCropper(false)} onCropped={handleCropped} />
      <div className="w-full max-w-lg rounded-2xl bg-surface-primary p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-text-primary">Editar club</h2>
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
          <p className="font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Imagen de perfil</p>

          <div className="flex items-center gap-4">
            <ClubCrest club={{ shortName: form.shortName || club.shortName, logoUrl, color: form.color }} size="h-16 w-16" textSize="text-base" />
            <div className="flex flex-col items-start gap-1.5">
              <button
                type="button"
                onClick={() => setShowCropper(true)}
                disabled={savingLogo}
                className="cursor-pointer rounded-lg border border-border-primary px-4 py-2 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular disabled:opacity-50"
              >
                {savingLogo ? "Guardando..." : logoUrl ? "Cambiar imagen" : "Subir imagen"}
              </button>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => void saveLogo(async () => null)}
                  disabled={savingLogo}
                  className="cursor-pointer font-body text-xs text-text-secondary underline disabled:opacity-50"
                >
                  Quitar imagen
                </button>
              )}
              <p className="font-body text-xs text-text-secondary">JPG, PNG o WebP, hasta 5 MB. Se guarda al elegirla.</p>
            </div>
          </div>

          <hr className="border-border-primary" />
          <p className="font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Datos del club</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Nombre *</label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Abreviatura *</label>
              <input
                value={form.shortName}
                onChange={(e) => set("shortName", e.target.value.toUpperCase())}
                maxLength={SHORT_NAME_MAX}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
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
                  onClick={() => set("color", c)}
                  className={`h-8 w-8 cursor-pointer rounded-full transition-transform ${form.color === c ? "scale-110 ring-2 ring-offset-2 ring-brand-500" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <hr className="border-border-primary" />
          <p className="font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Delegado</p>

          <div>
            <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Nombre del delegado</label>
            <input
              value={form.delegadoNombre}
              onChange={(e) => set("delegadoNombre", e.target.value)}
              className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              placeholder="Nombre completo del delegado"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Teléfono del delegado</label>
              <input
                value={form.delegadoTel}
                onChange={(e) => set("delegadoTel", e.target.value)}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
                placeholder="999 999 999"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Correo del delegado</label>
              <input
                type="email"
                value={form.delegadoEmail}
                onChange={(e) => set("delegadoEmail", e.target.value)}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
                placeholder="delegado@club.com"
              />
            </div>
          </div>
        </div>

        {club.isTemporary ? (
          <div className="mt-6 flex flex-col gap-3 border-t border-border-primary pt-4">
            <p className="font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Oficializar equipo</p>
            <p className="font-body text-sm text-text-secondary">
              Hoy es un equipo temporal de {club.owner.firstName} {club.owner.lastName}: sirve para su torneo, pero no sale en la búsqueda de
              equipos ni tiene dueño propio. Al oficializarlo pasa a ser de su delegado, que lo maneja con su propia cuenta, y aparece en
              la búsqueda. Sigue inscrito en sus torneos.
            </p>
            {newOwner ? (
              <div className="flex items-center justify-between rounded-lg border border-brand-300 bg-brand-50 px-3 py-2.5">
                <span className="font-body text-sm text-text-primary">
                  {newOwner.firstName} {newOwner.lastName} ({newOwner.email})
                </span>
                <button
                  type="button"
                  onClick={() => { setNewOwner(null); setConfirmOfficial(false); }}
                  disabled={makingOfficial}
                  aria-label="Elegir otro delegado"
                  className="cursor-pointer text-text-secondary hover:text-text-primary"
                >
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
                  placeholder="Buscar al delegado por nombre o correo..."
                  aria-label="Buscar al delegado"
                />
                {ownerResults.length > 0 && ownerSearch.length >= 2 && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-border-primary bg-surface-primary shadow-lg">
                    {ownerResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => { setNewOwner(u); setOwnerSearch(""); }}
                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-brand-50"
                      >
                        <span className="font-body text-sm text-text-primary">{u.firstName} {u.lastName}</span>
                        <span className="font-body text-xs text-text-secondary">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-1 font-body text-xs text-text-secondary">
                  ¿El delegado no tiene cuenta? Créala primero en Usuarios (tipo Dueño de club) y vuelve aquí.
                </p>
              </div>
            )}
            {newOwner &&
              (confirmOfficial ? (
                <div className="rounded-lg bg-btn-regular p-3">
                  <p className="font-body text-sm text-text-primary">
                    ¿Pasar <strong>{club.name}</strong> a {newOwner.firstName} {newOwner.lastName}? El organizador ya no podrá gestionarlo como
                    equipo suyo.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={makeOfficial}
                      disabled={makingOfficial}
                      className="cursor-pointer rounded-lg bg-surface-secondary px-4 py-2 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:opacity-50"
                    >
                      {makingOfficial ? "Oficializando..." : "Sí, oficializar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmOfficial(false)}
                      disabled={makingOfficial}
                      className="cursor-pointer rounded-lg border border-border-primary px-4 py-2 font-heading text-sm font-bold text-text-primary disabled:opacity-50"
                    >
                      No
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmOfficial(true)}
                  className="w-fit cursor-pointer rounded-lg border border-border-primary px-4 py-2 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular"
                >
                  Oficializar equipo
                </button>
              ))}
          </div>
        ) : (
          <div className="mt-6">
            {/* La contraseña es de quien dirige el club, no del club. En un equipo temporal el "dueño" es el
                organizador que lo cargó: su contraseña no se restablece desde acá. */}
            <ResetPassword userId={club.ownerId} userLabel={`${club.owner.firstName} ${club.owner.lastName} (dueño de ${club.name})`} />
          </div>
        )}

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

const ownerName = (c: ClubRow) => `${c.owner.firstName} ${c.owner.lastName}`.trim();

const sortAccessors = {
  club: (c: ClubRow) => c.name,
  short: (c: ClubRow) => c.shortName,
  owner: ownerName,
  email: (c: ClubRow) => c.owner.email,
  players: (c: ClubRow) => c.playerCount,
  categories: (c: ClubRow) => c.categoriesCount,
};

function AdminClubesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(searchParams.get("crear") === "true");
  const [editingClub, setEditingClub] = useState<ClubRow | null>(null);
  const [deleting, setDeleting] = useState<ClubRow | null>(null);

  const { data: clubs, loading, refetch } = useApi<ClubRow[]>(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("includeTemporary", "1");
    return fetch(`/api/clubs?${params.toString()}`).then((r) => r.json());
  });

  // Organizadores (dueños) que aparecen en la lista, para filtrar de a varios.
  const filtered = clubs?.filter((c) => ownerFilter.length === 0 || ownerFilter.includes(c.ownerId));
  const { sorted, sort, toggle } = useSort(filtered, sortAccessors);
  const ownerOptions = (() => {
    const counts = new Map<string, { label: string; email?: string; n: number }>();
    for (const c of clubs ?? []) {
      counts.set(c.ownerId, { label: ownerName(c), email: c.owner.email, n: (counts.get(c.ownerId)?.n ?? 0) + 1 });
    }
    // Dos organizadores pueden llamarse igual: en ese caso se agrega su correo para distinguirlos.
    const repeated = new Set<string>();
    const seen = new Set<string>();
    for (const { label } of counts.values()) (seen.has(label) ? repeated : seen).add(label);
    return [...counts.entries()]
      .map(([value, { label, email, n }]) => ({
        value,
        label: repeated.has(label) && email ? `${label} · ${email}` : label,
        hint: String(n),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  })();

  const handleCreated = () => {
    setShowCreate(false);
    router.replace("/admin/clubes");
    refetch();
  };

  const handleClubSaved = () => {
    setEditingClub(null);
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
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-sm flex-1">
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
        <MultiSelect allLabel="Todos los organizadores" noun="organizadores" options={ownerOptions} selected={ownerFilter} onChange={setOwnerFilter} searchPlaceholder="Buscar organizador..." />
        {ownerFilter.length > 0 && (
          <button type="button" onClick={() => setOwnerFilter([])} className="cursor-pointer font-heading text-xs font-bold text-text-primary underline">
            Quitar filtros
          </button>
        )}
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
                <SortTh label="Club" sortKey="club" sort={sort} onToggle={toggle} />
                <SortTh label="Abreviatura" sortKey="short" sort={sort} onToggle={toggle} />
                <SortTh label="Dueño" sortKey="owner" sort={sort} onToggle={toggle} />
                <SortTh label="Email" sortKey="email" sort={sort} onToggle={toggle} />
                <SortTh label="Jugadores" sortKey="players" sort={sort} onToggle={toggle} align="center" />
                <SortTh label="Categorías" sortKey="categories" sort={sort} onToggle={toggle} align="center" />
                <th className="px-4 py-3 text-right font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sorted?.map((club, i) => (
                <tr key={club.id} className="border-b border-border-primary last:border-0 hover:bg-brand-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {club.logoUrl ? (
                        <ClubCrest club={club} size="h-9 w-9" />
                      ) : (
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: (club.color || clubColors[i % clubColors.length]) + "20" }}
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3.5 1.5h7v3.5a3.5 3.5 0 01-7 0V1.5z" stroke={club.color || clubColors[i % clubColors.length]} strokeWidth="1" />
                          </svg>
                        </div>
                      )}
                      <span className="font-heading text-sm font-semibold text-text-primary">{club.name}</span>
                      {club.isTemporary && (
                        <span
                          title="Equipo cargado por un organizador para su torneo"
                          className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
                        >
                          Temporal
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded bg-brand-100 px-2 py-0.5 font-heading text-xs font-bold text-text-primary">
                      {displayShortName(club.shortName)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-body text-sm text-text-secondary">
                      {club.owner.firstName} {club.owner.lastName}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-body text-sm text-text-secondary">{club.owner.email ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-heading text-sm font-bold text-text-primary">{club.playerCount}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-heading text-sm font-bold text-text-primary">{club.categoriesCount}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                      onClick={() => setEditingClub(club)}
                      className="cursor-pointer rounded-lg border border-border-primary px-3 py-1.5 font-heading text-xs font-semibold text-text-primary transition-colors hover:bg-btn-regular"
                    >
                      Editar
                    </button>
                      <button
                        onClick={() => setDeleting(club)}
                        aria-label={`Eliminar ${club.name}`}
                        className="cursor-pointer rounded-lg border border-red-200 px-3 py-1.5 font-heading text-xs font-semibold text-red-700 transition-colors hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center font-body text-sm text-text-secondary">
                    No se encontraron clubes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateClubModal onClose={() => { setShowCreate(false); router.replace("/admin/clubes"); }} onCreated={handleCreated} />}
      {deleting && (
        <ConfirmDelete
          title="¿Eliminar este equipo?"
          confirmWord={deleting.name}
          confirmLabel="Eliminar equipo"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const res = await fetch(`/api/clubs/${deleting.id}`, { method: "DELETE" });
            if (!res.ok) return ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo eliminar el equipo";
            setDeleting(null);
            refetch();
            return null;
          }}
        >
          <p>
            <strong className="text-text-primary">{deleting.name}</strong>
            {deleting.isTemporary ? " es un equipo temporal de " : " es de "}
            {deleting.owner.firstName} {deleting.owner.lastName}
            {deleting.playerCount > 0 ? ` y tiene ${deleting.playerCount} ${deleting.playerCount === 1 ? "jugador" : "jugadores"}` : ""}.
          </p>
          <p>
            Se eliminan también sus categorías, staff, invitaciones, solicitudes y su inscripción en torneos. Sus jugadores quedan sin equipo (conservan su cuenta).
            Si ya tiene partidos en algún torneo no se podrá eliminar: primero hay que eliminar ese torneo. No se puede deshacer.
          </p>
        </ConfirmDelete>
      )}
      {editingClub && <EditClubModal club={editingClub} onClose={() => setEditingClub(null)} onSaved={handleClubSaved} onLogoChanged={refetch} />}
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
