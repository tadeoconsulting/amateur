"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/_lib/use-api";
import { ResetPassword } from "../_components/reset-password";
import { MultiSelect } from "../_components/multi-select";
import { SortTh, useSort } from "../_components/sortable";
import { displayShortName } from "@/_lib/short-name";
import { ConfirmDelete } from "../_components/confirm-delete";
import { AvatarCropper } from "@/_components/avatar-cropper";
import { PlayerAvatar } from "@/_components/player-avatar";
import { uploadAvatarBlob } from "@/_lib/upload-avatar";
import { LinkAccountModal } from "../_components/link-account-modal";
import type { InvitationSummary } from "../_components/invite-player-panel";

interface PlayerRow {
  id: string;
  /** null = jugador provisional: cargado sin cuenta (especificación 009). */
  userId: string | null;
  provisional?: boolean;
  /** Solo de un provisional (y solo lo ve el admin). */
  dni?: string | null;
  birthDate?: string | null;
  /** La invitación vigente para reclamar este perfil (solo un provisional). */
  invitation?: InvitationSummary | null;
  number: number | null;
  position: string | null;
  status: string;
  user: {
    firstName: string;
    lastName: string;
    email: string | null;
    avatarUrl: string | null;
    phone: string | null;
  };
  club: { id: string; name: string; shortName: string } | null;
  category: { id: string; name: string; gender: string } | null;
}

/** Un jugador con cuenta: la que edita `EditPlayerModal` (nombre, correo, foto, contraseña). */
type AccountPlayerRow = PlayerRow & { userId: string; user: PlayerRow["user"] & { email: string } };

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
  onPhotoChanged,
}: {
  player: AccountPlayerRow;
  clubs: ClubOption[];
  onClose: () => void;
  onSaved: () => void;
  /** La foto se guarda al momento (sin esperar a "Guardar"): se avisa para refrescar la lista. */
  onPhotoChanged: () => void;
}) {
  const [form, setForm] = useState({
    firstName: player.user.firstName,
    lastName: player.user.lastName,
    email: player.user.email,
    phone: player.user.phone ?? "",
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

  const [avatarUrl, setAvatarUrl] = useState<string | null>(player.user.avatarUrl);
  const [showCropper, setShowCropper] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);

  // La foto de perfil del jugador se guarda al instante: se sube y se guarda en su cuenta.
  const savePhoto = async (getUrl: () => Promise<string | null>) => {
    setSavingPhoto(true);
    setError(null);
    try {
      const url = await getUrl();
      const res = await fetch(`/api/users/${player.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: url }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo guardar la foto");
        return;
      }
      setAvatarUrl(url);
      onPhotoChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setSavingPhoto(false);
    }
  };

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
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Nombre y apellido son requeridos");
      return;
    }
    if (!form.email.trim()) {
      setError("El correo es requerido");
      return;
    }
    setSaving(true);
    setError(null);

    // Datos de la cuenta (nombre, correo de acceso, teléfono): solo si algo cambió.
    const accountChanged =
      form.firstName.trim() !== player.user.firstName ||
      form.lastName.trim() !== player.user.lastName ||
      form.email.trim().toLowerCase() !== player.user.email.toLowerCase() ||
      form.phone.trim() !== (player.user.phone ?? "");
    if (accountChanged) {
      const accountRes = await fetch(`/api/users/${player.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
        }),
      });
      if (!accountRes.ok) {
        const data = await accountRes.json().catch(() => ({}));
        setError(data.error || "No se pudieron guardar los datos del jugador");
        setSaving(false);
        return;
      }
    }

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
      <AvatarCropper
        open={showCropper}
        onClose={() => setShowCropper(false)}
        onCropped={(blob) => {
          setShowCropper(false);
          void savePhoto(() => uploadAvatarBlob(blob));
        }}
      />
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
          <p className="font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Datos del jugador</p>

          <div className="flex items-center gap-4">
            <PlayerAvatar avatarUrl={avatarUrl} size="h-16 w-16" iconSize={30} />
            <div className="flex flex-col items-start gap-1.5">
              <button
                type="button"
                onClick={() => setShowCropper(true)}
                disabled={savingPhoto}
                className="cursor-pointer rounded-lg border border-border-primary px-4 py-2 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular disabled:opacity-50"
              >
                {savingPhoto ? "Guardando..." : avatarUrl ? "Cambiar foto" : "Subir foto"}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => void savePhoto(async () => null)}
                  disabled={savingPhoto}
                  className="cursor-pointer font-body text-xs text-text-secondary underline disabled:opacity-50"
                >
                  Quitar foto
                </button>
              )}
              <p className="font-body text-xs text-text-secondary">JPG, PNG o WebP, hasta 5 MB. Se guarda al elegirla.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pl-nombre" className="mb-1 block font-body text-xs font-medium text-text-secondary">Nombres *</label>
              <input
                id="pl-nombre"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label htmlFor="pl-apellido" className="mb-1 block font-body text-xs font-medium text-text-secondary">Apellidos *</label>
              <input
                id="pl-apellido"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              />
            </div>
          </div>
          <div>
            <label htmlFor="pl-email" className="mb-1 block font-body text-xs font-medium text-text-secondary">Correo (con el que entra a la app) *</label>
            <input
              id="pl-email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              autoComplete="off"
              className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
            />
            {form.email.trim().toLowerCase() !== player.user.email.toLowerCase() && (
              <p className="mt-1 font-body text-xs text-text-secondary">
                Si lo cambias, el jugador entrará con el correo nuevo; su contraseña no cambia.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="pl-tel" className="mb-1 block font-body text-xs font-medium text-text-secondary">Teléfono</label>
            <input
              id="pl-tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              placeholder="999 999 999"
            />
          </div>

          <hr className="border-border-primary" />
          <p className="font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">En el equipo</p>

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
                <option key={c.id} value={c.id}>{c.name} ({displayShortName(c.shortName)})</option>
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

        <div className="mt-6">
          <ResetPassword userId={player.userId} userLabel={`${player.user.firstName} ${player.user.lastName}`} />
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

/**
 * Corrige a un jugador provisional (sin cuenta): sus datos propios, su puesto y su equipo. No tiene correo, foto
 * ni contraseña: eso llega cuando se le asigne una cuenta (especificación 009, entrega 2).
 */
function EditProvisionalModal({
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
    firstName: player.user.firstName,
    lastName: player.user.lastName,
    dni: player.dni ?? "",
    birthDate: player.birthDate ? player.birthDate.slice(0, 10) : "",
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

  useEffect(() => {
    if (!form.clubId) return;
    let cancelled = false;
    fetch(`/api/clubs/${form.clubId}/categories`)
      .then((r) => r.json())
      .then((data: CategoryOption[]) => { if (!cancelled) setCategories(data); })
      .catch(() => { if (!cancelled) setCategories([]); });
    return () => { cancelled = true; };
  }, [form.clubId]);

  // El equipo actual siempre aparece entre las opciones, aunque no viniera en la lista.
  const clubOptions = player.club && !clubs.some((c) => c.id === player.club?.id) ? [player.club, ...clubs] : clubs;
  const positionOptions = form.position && !positions.includes(form.position) ? [form.position, ...positions] : positions;
  const input = "w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500";

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        dni: form.dni,
        birthDate: form.birthDate,
        position: form.position || null,
        number: form.number ? Number(form.number) : null,
        status: form.status,
        clubId: form.clubId,
        categoryId: form.clubId === player.club?.id || !form.categoryId ? form.categoryId || null : null,
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
      <div role="dialog" aria-modal="true" aria-label="Editar jugador provisional" className="w-full max-w-md rounded-2xl bg-surface-primary p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-text-primary">Editar jugador provisional</h2>
          <button onClick={onClose} aria-label="Cerrar" className="cursor-pointer p-1 text-text-secondary hover:text-text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className="mb-4 font-body text-xs text-text-secondary">Todavía no tiene cuenta. Solo su nombre y su posición se ven en la plataforma; el DNI y la fecha de nacimiento nunca son públicos.</p>

        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 font-body text-sm text-red-700">{error}</div>}

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pv-nombre" className="mb-1 block font-body text-xs font-medium text-text-secondary">Nombres *</label>
              <input id="pv-nombre" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className={input} />
            </div>
            <div>
              <label htmlFor="pv-apellido" className="mb-1 block font-body text-xs font-medium text-text-secondary">Apellidos *</label>
              <input id="pv-apellido" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className={input} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pv-dni" className="mb-1 block font-body text-xs font-medium text-text-secondary">DNI *</label>
              <input id="pv-dni" inputMode="numeric" maxLength={8} value={form.dni} onChange={(e) => set("dni", e.target.value)} className={input} />
            </div>
            <div>
              <label htmlFor="pv-nac" className="mb-1 block font-body text-xs font-medium text-text-secondary">Fecha de nacimiento *</label>
              <input id="pv-nac" type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} className={input} />
            </div>
          </div>

          <hr className="border-border-primary" />
          <p className="font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">En el equipo</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pv-pos" className="mb-1 block font-body text-xs font-medium text-text-secondary">Posición</label>
              <select id="pv-pos" value={form.position} onChange={(e) => set("position", e.target.value)} className={`${input} cursor-pointer`}>
                <option value="">Sin definir</option>
                {positionOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="pv-num" className="mb-1 block font-body text-xs font-medium text-text-secondary">Número</label>
              <input id="pv-num" type="number" min={1} max={99} value={form.number} onChange={(e) => set("number", e.target.value)} className={input} placeholder="10" />
            </div>
          </div>
          <div>
            <label htmlFor="pv-club" className="mb-1 block font-body text-xs font-medium text-text-secondary">Club *</label>
            <select id="pv-club" value={form.clubId} onChange={(e) => setForm((f) => ({ ...f, clubId: e.target.value, categoryId: "" }))} className={`${input} cursor-pointer`}>
              {clubOptions.map((c) => <option key={c.id} value={c.id}>{c.name} ({displayShortName(c.shortName)})</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="pv-cat" className="mb-1 block font-body text-xs font-medium text-text-secondary">Categoría</label>
            <select id="pv-cat" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={`${input} cursor-pointer`}>
              <option value="">Sin categoría</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.gender})</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="pv-estado" className="mb-1 block font-body text-xs font-medium text-text-secondary">Estado</label>
            <select id="pv-estado" value={form.status} onChange={(e) => set("status", e.target.value)} className={`${input} cursor-pointer`}>
              {Object.entries(statusLabels).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="cursor-pointer rounded-lg border border-border-primary px-5 py-2.5 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="cursor-pointer rounded-lg bg-surface-secondary px-5 py-2.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

const chipDate = (iso: string) => new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short" });

/** El estado de la invitación de un provisional, en una línea (el detalle está en Asignar cuenta). */
function InvitationChip({ invitation }: { invitation: InvitationSummary | null }) {
  if (!invitation) return null;
  const tone =
    invitation.status === "pending" ? "bg-green-100 text-green-700"
    : invitation.status === "review" ? "bg-amber-100 text-amber-700"
    : "bg-red-100 text-red-700";
  const text =
    invitation.status === "pending" ? `Invitado${invitation.email ? ` · ${invitation.email}` : " · por enlace"} · vence ${chipDate(invitation.expiresAt)}`
    : invitation.status === "expired" ? `Invitación vencida el ${chipDate(invitation.expiresAt)}`
    : invitation.status === "review" ? `Aceptó ${invitation.acceptedBy?.name ?? "una cuenta"}: falta unir`
    : "Invitación bloqueada";
  return <span className={`mt-1 block w-fit max-w-[220px] truncate rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`} title={text}>{text}</span>;
}

const NO_CLUB = "__sin_club__";

const sortAccessors = {
  player: (p: PlayerRow) => `${p.user.firstName} ${p.user.lastName}`,
  email: (p: PlayerRow) => p.user.email ?? "",
  club: (p: PlayerRow) => p.club?.name,
  category: (p: PlayerRow) => p.category?.name,
  position: (p: PlayerRow) => p.position,
  number: (p: PlayerRow) => p.number,
  status: (p: PlayerRow) => statusLabels[p.status]?.label ?? p.status,
};

export default function AdminJugadoresPage() {
  const [search, setSearch] = useState("");
  const [clubFilter, setClubFilter] = useState<string[]>([]);
  const [editingPlayer, setEditingPlayer] = useState<PlayerRow | null>(null);
  const [deleting, setDeleting] = useState<PlayerRow | null>(null);
  // Solo el id: la invitación del jugador se lee de la lista, así se actualiza sola al volver a pedirla.
  const [linkingId, setLinkingId] = useState<string | null>(null);
  // Con cuenta o provisional (sin cuenta, cargado por un admin: especificación 009).
  const [kind, setKind] = useState<"all" | "account" | "provisional">("all");

  // Con los equipos temporales (los que cargan los organizadores para su torneo): ahí es donde están los
  // jugadores provisionales, y sin ellos no se podría filtrar ni elegir su equipo.
  const { data: clubs } = useApi<ClubOption[]>(() =>
    fetch("/api/clubs?includeTemporary=1").then((r) => r.json())
  );

  // La búsqueda por nombre se hace en el servidor; los equipos se filtran acá, de a varios.
  const { data: players, loading, refetch } = useApi<PlayerRow[]>(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    return fetch(`/api/players?${params.toString()}`).then((r) => r.json());
  });

  const filtered = players?.filter(
    (p) =>
      (clubFilter.length === 0 || clubFilter.includes(p.club?.id ?? NO_CLUB)) &&
      (kind === "all" || (kind === "provisional") === !!p.provisional)
  );
  const linking = players?.find((p) => p.id === linkingId) ?? null;
  const provisionalCount = (players ?? []).filter((p) => p.provisional).length;
  const { sorted, sort, toggle } = useSort(filtered, sortAccessors);
  const clubOptions = (() => {
    const counts = new Map<string, number>();
    for (const p of players ?? []) counts.set(p.club?.id ?? NO_CLUB, (counts.get(p.club?.id ?? NO_CLUB) ?? 0) + 1);
    return [
      { value: NO_CLUB, label: "Sin equipo", hint: String(counts.get(NO_CLUB) ?? 0) },
      ...(clubs ?? []).map((c) => ({ value: c.id, label: c.name, hint: String(counts.get(c.id) ?? 0) })),
    ];
  })();

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
          {provisionalCount > 0 && ` · ${provisionalCount} ${provisionalCount === 1 ? "provisional (sin cuenta)" : "provisionales (sin cuenta)"}`}
        </p>
      </div>

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
            onKeyDown={(e) => e.key === "Enter" && refetch()}
            className="w-full rounded-lg border border-border-primary bg-surface-primary py-2.5 pl-9 pr-3 font-body text-sm text-text-primary outline-none focus:border-brand-500"
            placeholder="Buscar jugador..."
          />
        </div>

        <MultiSelect allLabel="Todos los equipos" noun="equipos" options={clubOptions} selected={clubFilter} onChange={setClubFilter} searchPlaceholder="Buscar equipo..." />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
          aria-label="Tipo de jugador"
          className="cursor-pointer rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
        >
          <option value="all">Con y sin cuenta</option>
          <option value="account">Con cuenta</option>
          <option value="provisional">Provisionales (sin cuenta)</option>
        </select>
        {(clubFilter.length > 0 || kind !== "all") && (
          <button type="button" onClick={() => { setClubFilter([]); setKind("all"); }} className="cursor-pointer font-heading text-xs font-bold text-text-primary underline">
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

      {/* Players table */}
      {loading || !players ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-primary bg-surface-primary">
          <table className="w-full min-w-[900px] [&_td]:px-2.5 [&_th]:px-2.5">
            <thead>
              <tr className="border-b border-border-primary bg-brand-50">
                <SortTh label="Jugador" sortKey="player" sort={sort} onToggle={toggle} />
                <SortTh label="Email" sortKey="email" sort={sort} onToggle={toggle} />
                <SortTh label="Club" sortKey="club" sort={sort} onToggle={toggle} />
                <SortTh label="Categoría" sortKey="category" sort={sort} onToggle={toggle} />
                <SortTh label="Posición" sortKey="position" sort={sort} onToggle={toggle} align="center" />
                <SortTh label="#" sortKey="number" sort={sort} onToggle={toggle} align="center" />
                <SortTh label="Estado" sortKey="status" sort={sort} onToggle={toggle} align="center" />
                <th className="px-4 py-3 text-right font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sorted?.map((player) => {
                const st = statusLabels[player.status] || { label: player.status, color: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={player.id} className="border-b border-border-primary last:border-0 hover:bg-brand-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {player.user.avatarUrl ? (
                          <PlayerAvatar avatarUrl={player.user.avatarUrl} size="h-9 w-9" />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 font-heading text-xs font-bold text-blue-700">
                            {player.user.firstName[0]}{player.user.lastName[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-heading text-sm font-semibold text-text-primary">
                            {player.user.firstName} {player.user.lastName}
                            {player.provisional && (
                              <span className="ml-2 inline-flex rounded-full bg-brand-100 px-2 py-0.5 align-middle font-heading text-[10px] font-bold text-text-secondary">Provisional</span>
                            )}
                          </p>
                          {player.provisional ? (
                            <p className="font-body text-xs text-text-secondary">DNI {player.dni ?? "—"}</p>
                          ) : (
                            player.user.phone && <p className="font-body text-xs text-text-secondary">{player.user.phone}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {player.provisional ? (
                        <>
                          <span className="font-body text-sm italic text-text-secondary">Sin cuenta</span>
                          <InvitationChip invitation={player.invitation ?? null} />
                        </>
                      ) : (
                        <p className="font-body text-sm text-text-secondary">{player.user.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {player.club ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex rounded bg-brand-100 px-1.5 py-0.5 font-heading text-[10px] font-bold text-text-primary">
                            {displayShortName(player.club.shortName)}
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
                      <div className="flex justify-end gap-2">
                        {player.provisional && (
                          <button
                            onClick={() => setLinkingId(player.id)}
                            className="cursor-pointer rounded-lg border border-border-primary px-3 py-1.5 font-heading text-xs font-semibold text-text-primary transition-colors hover:bg-btn-regular"
                          >
                            Asignar cuenta
                          </button>
                        )}
                        <button
                        onClick={() => setEditingPlayer(player)}
                        className="cursor-pointer rounded-lg border border-border-primary px-3 py-1.5 font-heading text-xs font-semibold text-text-primary transition-colors hover:bg-btn-regular"
                      >
                        Editar
                      </button>
                        <button
                          onClick={() => setDeleting(player)}
                          aria-label={`Eliminar a ${player.user.firstName} ${player.user.lastName}`}
                          className="cursor-pointer rounded-lg border border-red-200 px-3 py-1.5 font-heading text-xs font-semibold text-red-700 transition-colors hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered?.length === 0 && (
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

      {editingPlayer && !editingPlayer.provisional && (
        <EditPlayerModal
          player={editingPlayer as AccountPlayerRow}
          clubs={clubs ?? []}
          onClose={() => setEditingPlayer(null)}
          onSaved={handlePlayerSaved}
          onPhotoChanged={refetch}
        />
      )}
      {editingPlayer?.provisional && (
        <EditProvisionalModal player={editingPlayer} clubs={clubs ?? []} onClose={() => setEditingPlayer(null)} onSaved={handlePlayerSaved} />
      )}
      {linking && (
        <LinkAccountModal
          player={{ id: linking.id, firstName: linking.user.firstName, lastName: linking.user.lastName, dni: linking.dni ?? null, clubName: linking.club?.name ?? null }}
          invitation={linking.invitation ?? null}
          // Si ya hay una invitación en curso, se abre en ella: es lo que el admin viene a ver.
          initialTab={linking.invitation ? "invite" : "account"}
          onClose={() => setLinkingId(null)}
          onDone={() => { setLinkingId(null); refetch(); }}
          onInvitationChanged={refetch}
        />
      )}
      {deleting && (
        <ConfirmDelete
          title={deleting.provisional ? "¿Eliminar a este jugador provisional?" : "¿Eliminar a este jugador?"}
          confirmWord={`${deleting.user.firstName} ${deleting.user.lastName}`}
          confirmLabel="Eliminar jugador"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const res = await fetch(deleting.provisional ? `/api/players/${deleting.id}` : `/api/users/${deleting.userId}`, { method: "DELETE" });
            if (!res.ok) return ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo eliminar al jugador";
            setDeleting(null);
            refetch();
            return null;
          }}
        >
          {deleting.provisional ? (
            <>
              <p>
                Se elimina la ficha provisional de <strong className="text-text-primary">{deleting.user.firstName} {deleting.user.lastName}</strong> (DNI {deleting.dni}), con sus estadísticas y alineaciones.
                En las jugadas de partidos queda el registro, sin el jugador.
              </p>
              <p>Úsalo si se cargó por error. No se puede deshacer.</p>
            </>
          ) : (
            <>
              <p>
                Se elimina la cuenta de <strong className="text-text-primary">{deleting.user.firstName} {deleting.user.lastName}</strong> ({deleting.user.email}) y todas sus
                fichas de jugador: sus estadísticas y alineaciones en todos sus equipos. En las jugadas de partidos queda el registro, sin el jugador.
              </p>
              <p>Si es delegado de un equipo o organiza torneos, no se elimina hasta resolver eso. No se puede deshacer.</p>
            </>
          )}
        </ConfirmDelete>
      )}
    </div>
  );
}
