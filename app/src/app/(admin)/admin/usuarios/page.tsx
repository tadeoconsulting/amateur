"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MesaTournaments } from "../_components/mesa-tournaments";
import { useApi } from "@/_lib/use-api";
import { ResetPassword } from "../_components/reset-password";
import { SortTh, useSort } from "../_components/sortable";
import { displayShortName } from "@/_lib/short-name";

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  gender: string | null;
  department: string | null;
  birthDate: string | null;
  organization: string | null;
  createdAt: string;
  roles: string[];
  ownedClubs: { id: string; name: string }[];
  playerProfiles: { id: string; position: string | null; club: { id: string; name: string } | null }[];
  tournamentsCount: number;
  /** Los torneos de una cuenta de mesa. */
  mesaTournaments?: { id: string; name: string }[];
}

const allRoles = [
  { key: "ORGANIZADOR", label: "Organizador" },
  { key: "CLUB_OWNER", label: "Delegado" },
  { key: "JUGADOR", label: "Jugador" },
  { key: "SPONSOR", label: "Sponsor" },
  { key: "FAN", label: "Fan" },
];

// Administrador va aparte: es exclusivo (una cuenta de administrador no tiene otros perfiles), así
// que elegirlo desmarca los demás y elegir otro perfil lo desmarca.
const ADMIN_ROLE = { key: "ADMIN", label: "Administrador" };
// La mesa (quien gestiona el partido en vivo, especificación 011) también es exclusiva: es solo mesa.
const MESA_ROLE = { key: "MESA", label: "Mesa" };
const selectableRoles = [...allRoles, MESA_ROLE, ADMIN_ROLE];
const EXCLUSIVE_ROLES = ["ADMIN", "MESA"];
const toggleExclusive = (current: string[], role: string) => {
  if (EXCLUSIVE_ROLES.includes(role)) return current.includes(role) ? [] : [role];
  const without = current.filter((r) => !EXCLUSIVE_ROLES.includes(r));
  return without.includes(role) ? without.filter((r) => r !== role) : [...without, role];
};

const roleBadgeColors: Record<string, string> = {
  ORGANIZADOR: "bg-purple-100 text-purple-700",
  CLUB_OWNER: "bg-green-100 text-green-700",
  JUGADOR: "bg-blue-100 text-blue-700",
  SPONSOR: "bg-amber-100 text-amber-700",
  FAN: "bg-gray-100 text-gray-700",
  ADMIN: "bg-red-100 text-red-700",
  MESA: "bg-teal-100 text-teal-700",
};

function RoleBadge({ role }: { role: string }) {
  const label = selectableRoles.find((r) => r.key === role)?.label ?? role;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleBadgeColors[role] || "bg-gray-100 text-gray-700"}`}>
      {label}
    </span>
  );
}

const departamentos = [
  "Amazonas", "Áncash", "Apurímac", "Arequipa", "Ayacucho", "Cajamarca",
  "Cusco", "Huancavelica", "Huánuco", "Ica", "Junín", "La Libertad",
  "Lambayeque", "Lima", "Loreto", "Madre de Dios", "Moquegua", "Pasco",
  "Piura", "Puno", "San Martín", "Tacna", "Tumbes", "Ucayali",
];

const positions = [
  "Portero", "Defensa central", "Lateral", "Libre", "Carrilero",
  "Pivote", "Media punta", "Volante", "Delantero centro", "Extremo",
];

interface ClubOption {
  id: string;
  name: string;
  shortName: string;
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    dni: "",
    phone: "",
    gender: "" as "" | "masculino" | "femenino",
    department: "",
    birthDate: "",
    roles: ["JUGADOR"] as string[],
    position: "",
    number: "",
    clubId: "",
    organization: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: clubs } = useApi<ClubOption[]>(() =>
    fetch("/api/clubs").then((r) => r.json())
  );

  const toggleRole = (role: string) => {
    setForm((prev) => ({ ...prev, roles: toggleExclusive(prev.roles, role) }));
  };

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const isJugador = form.roles.includes("JUGADOR");
  const isOrganizador = form.roles.includes("ORGANIZADOR");
  const isMesa = form.roles.includes("MESA");
  // Una mesa se puede crear ya con sus torneos (especificación 011): se le asignan al crearla.
  const [mesaTournamentIds, setMesaTournamentIds] = useState<string[]>([]);
  const [assignedCount, setAssignedCount] = useState(0);
  const { data: allTournaments } = useApi<{ id: string; name: string }[]>(() => fetch("/api/tournaments").then((r) => (r.ok ? r.json() : [])));
  const toggleMesaTournament = (id: string) => setMesaTournamentIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const handleSubmit = async () => {
    if (!form.email || !form.firstName || !form.lastName) {
      setError("Email, nombre y apellido son requeridos");
      return;
    }
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      email: form.email,
      firstName: form.firstName,
      lastName: form.lastName,
      dni: form.dni || null,
      phone: form.phone || null,
      gender: form.gender || null,
      department: form.department || null,
      birthDate: form.birthDate || null,
      organization: form.organization || null,
      roles: form.roles,
    };

    if (isJugador) {
      payload.player = {
        position: form.position || null,
        number: form.number ? Number(form.number) : null,
        clubId: form.clubId || null,
      };
    }

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error al crear usuario");
      setSaving(false);
      return;
    }

    const created = await res.json();
    if (isMesa && mesaTournamentIds.length > 0) {
      const results = await Promise.all(
        mesaTournamentIds.map((tid) =>
          fetch(`/api/tournaments/${tid}/mesa`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: created.id }) })
            .then((r) => r.ok)
            .catch(() => false)
        )
      );
      setAssignedCount(results.filter(Boolean).length);
    }
    if (created.temporaryPassword) {
      // La contraseña temporal se muestra una sola vez: hay que pasársela a la persona.
      setTemporaryPassword(created.temporaryPassword);
      setSaving(false);
      return;
    }

    onCreated();
  };

  if (temporaryPassword) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="w-full max-w-md rounded-2xl bg-surface-primary p-6 shadow-xl">
          <h2 className="font-heading text-lg font-bold text-text-primary">Usuario creado</h2>
          {isMesa && (
            <p className="mt-2 font-body text-sm text-text-primary">
              {assignedCount > 0 ? `Asignada a ${assignedCount} ${assignedCount === 1 ? "torneo" : "torneos"}.` : "Todavía no tiene torneos: asígnaselos desde su ficha (Editar) o desde el torneo."}
              {assignedCount < mesaTournamentIds.length && " Algunos torneos no se pudieron asignar: revísalo en su ficha."}
            </p>
          )}
          <p className="mt-2 font-body text-sm text-text-secondary">
            Esta contraseña temporal se muestra una sola vez. Compártela con {form.firstName} para que pueda iniciar sesión.
          </p>
          <code className="mt-4 block select-all rounded-lg bg-brand-100 px-4 py-3 font-mono text-sm text-text-primary">
            {temporaryPassword}
          </code>
          <button
            onClick={onCreated}
            className="mt-5 w-full cursor-pointer rounded-lg bg-surface-secondary py-2.5 font-heading text-sm font-bold text-text-invert"
          >
            Listo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-surface-primary p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-text-primary">Crear usuario</h2>
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
          {/* Roles first — drives which fields appear */}
          <div>
            <label className="mb-2 block font-body text-xs font-medium text-text-secondary">Tipo de usuario *</label>
            <div className="flex flex-wrap gap-2">
              {selectableRoles.map((role) => (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => toggleRole(role.key)}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 font-heading text-xs font-semibold transition-colors ${
                    form.roles.includes(role.key)
                      ? "bg-surface-secondary text-text-invert"
                      : "border border-border-primary text-text-secondary hover:border-brand-300"
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-border-primary" />

          {/* Datos personales */}
          <p className="font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Datos personales</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Nombre *</label>
              <input
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
                placeholder="Nombre"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Apellido *</label>
              <input
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
                placeholder="Apellido"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">DNI</label>
              <input
                value={form.dni}
                onChange={(e) => set("dni", e.target.value)}
                maxLength={8}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
                placeholder="12345678"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Teléfono</label>
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
                placeholder="999 999 999"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Fecha de nacimiento</label>
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => set("birthDate", e.target.value)}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Departamento</label>
              <select
                value={form.department}
                onChange={(e) => set("department", e.target.value)}
                className="w-full cursor-pointer rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              >
                <option value="">Seleccionar</option>
                {departamentos.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-body text-xs font-medium text-text-secondary">Sexo</label>
            <div className="flex gap-2">
              {(["masculino", "femenino"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("gender", form.gender === s ? "" : s)}
                  className={`flex-1 cursor-pointer rounded-lg py-2 text-center font-heading text-xs font-semibold transition-colors ${
                    form.gender === s
                      ? "bg-surface-secondary text-text-invert"
                      : "border border-border-primary text-text-secondary hover:border-brand-300"
                  }`}
                >
                  {s === "masculino" ? "Masculino" : "Femenino"}
                </button>
              ))}
            </div>
          </div>

          {/* Campos de Organizador */}
          {isMesa && (
            <div>
              <span className="mb-2 block font-body text-xs font-medium text-text-secondary">Torneos de la mesa (opcional)</span>
              <p className="mb-2 font-body text-xs text-text-secondary">
                Solo podrá gestionar el partido en vivo de los torneos que marques, y solo el día de juego. Los puedes cambiar después.
              </p>
              {!allTournaments ? (
                <p className="font-body text-sm text-text-secondary">Cargando torneos...</p>
              ) : allTournaments.length === 0 ? (
                <p className="font-body text-sm text-text-secondary">Todavía no hay torneos.</p>
              ) : (
                <ul className="max-h-44 overflow-y-auto rounded-lg border border-border-primary">
                  {allTournaments.map((t, i) => (
                    <li key={t.id} className={i > 0 ? "border-t border-border-primary" : ""}>
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 font-body text-sm text-text-primary">
                        <input type="checkbox" checked={mesaTournamentIds.includes(t.id)} onChange={() => toggleMesaTournament(t.id)} className="h-4 w-4" />
                        <span className="min-w-0 truncate">{t.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {isOrganizador && (
            <>
              <hr className="border-border-primary" />
              <p className="font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Datos de organizador</p>

              <div>
                <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Nombre de la organización</label>
                <input
                  value={form.organization}
                  onChange={(e) => set("organization", e.target.value)}
                  className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
                  placeholder="Liga Premier Norte"
                />
              </div>
            </>
          )}

          {/* Campos de Jugador */}
          {isJugador && (
            <>
              <hr className="border-border-primary" />
              <p className="font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Datos de jugador</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Posición</label>
                  <select
                    value={form.position}
                    onChange={(e) => set("position", e.target.value)}
                    className="w-full cursor-pointer rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
                  >
                    <option value="">Seleccionar</option>
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
                  onChange={(e) => set("clubId", e.target.value)}
                  className="w-full cursor-pointer rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
                >
                  <option value="">Sin club</option>
                  {clubs?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({displayShortName(c.shortName)})</option>
                  ))}
                </select>
              </div>
            </>
          )}
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
            {saving ? "Creando..." : "Crear usuario"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Convierte una fecha ISO (o null) al formato que espera un <input type="date">. */
function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [roles, setRoles] = useState<string[]>(user.roles);
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone ?? "",
    department: user.department ?? "",
    gender: (user.gender ?? "") as "" | "masculino" | "femenino",
    birthDate: toDateInput(user.birthDate),
    organization: user.organization ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const toggleRole = (role: string) => {
    setRoles((prev) => toggleExclusive(prev, role));
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Nombre y apellido son requeridos");
      return;
    }
    if (roles.length === 0) {
      setError("Debe tener al menos un rol");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone || null,
        department: form.department || null,
        gender: form.gender || null,
        birthDate: form.birthDate || null,
        organization: form.organization || null,
        roles,
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
      <div className="w-full max-w-lg rounded-2xl bg-surface-primary p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-text-primary">
            Editar usuario — {user.firstName} {user.lastName}
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
          <div>
            {/* El correo no se puede cambiar desde acá: es el identificador de login. */}
            <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Email</label>
            <p className="rounded-lg border border-border-primary bg-brand-50 px-3 py-2.5 font-body text-sm text-text-secondary">
              {user.email}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Nombre *</label>
              <input
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Apellido *</label>
              <input
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Teléfono</label>
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
                placeholder="999 999 999"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Fecha de nacimiento</label>
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => set("birthDate", e.target.value)}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Departamento</label>
              <select
                value={form.department}
                onChange={(e) => set("department", e.target.value)}
                className="w-full cursor-pointer rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              >
                <option value="">Seleccionar</option>
                {departamentos.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block font-body text-xs font-medium text-text-secondary">Sexo</label>
              <div className="flex gap-2">
                {(["masculino", "femenino"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("gender", form.gender === s ? "" : s)}
                    className={`flex-1 cursor-pointer rounded-lg py-2.5 text-center font-heading text-xs font-semibold transition-colors ${
                      form.gender === s
                        ? "bg-surface-secondary text-text-invert"
                        : "border border-border-primary text-text-secondary hover:border-brand-300"
                    }`}
                  >
                    {s === "masculino" ? "Masculino" : "Femenino"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {roles.includes("ORGANIZADOR") && (
            <div>
              <label className="mb-1 block font-body text-xs font-medium text-text-secondary">Nombre de la organización</label>
              <input
                value={form.organization}
                onChange={(e) => set("organization", e.target.value)}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
                placeholder="Liga Premier Norte"
              />
            </div>
          )}

          <hr className="border-border-primary" />
          <div>
            <label className="mb-2 block font-body text-xs font-medium text-text-secondary">Roles</label>
            <div className="flex flex-wrap gap-2">
              {selectableRoles.map((role) => (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => toggleRole(role.key)}
                  className={`cursor-pointer rounded-lg px-4 py-2 font-heading text-sm font-semibold transition-colors ${
                    roles.includes(role.key)
                      ? "bg-surface-secondary text-text-invert"
                      : "border border-border-primary text-text-secondary hover:border-brand-300"
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {user.roles.includes("MESA") && (
          <div className="mt-6 flex flex-col gap-3 border-t border-border-primary pt-4">
            <p className="font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Torneos de la mesa</p>
            <MesaTournaments user={{ id: user.id, firstName: user.firstName }} initial={user.mesaTournaments ?? []} />
          </div>
        )}

        <div className="mt-6">
          <ResetPassword userId={user.id} userLabel={`${user.firstName} ${user.lastName}`} />
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

const sortAccessors = {
  user: (u: UserRow) => `${u.firstName} ${u.lastName}`,
  email: (u: UserRow) => u.email,
  roles: (u: UserRow) => u.roles.map((r) => selectableRoles.find((x) => x.key === r)?.label ?? r).join(", "),
  clubs: (u: UserRow) => u.ownedClubs[0]?.name ?? u.playerProfiles.find((p) => p.club)?.club?.name,
  created: (u: UserRow) => new Date(u.createdAt).getTime(),
};

function AdminUsuariosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(searchParams.get("crear") === "true");
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    return `/api/users?${params.toString()}`;
  }, [search, roleFilter]);

  const { data: users, loading, refetch } = useApi<UserRow[]>(() =>
    fetch(buildUrl()).then((r) => r.json())
  );

  const { sorted, sort, toggle } = useSort(users, sortAccessors);

  const handleCreated = () => {
    setShowCreate(false);
    router.replace("/admin/usuarios");
    refetch();
  };

  const handleUserSaved = () => {
    setEditingUser(null);
    refetch();
  };

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Usuarios</h1>
          <p className="mt-1 font-body text-sm text-text-secondary">
            Gestiona todos los usuarios de la plataforma
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-surface-secondary px-4 py-2.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Crear usuario
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
            onKeyDown={(e) => e.key === "Enter" && refetch()}
            className="w-full rounded-lg border border-border-primary bg-surface-primary py-2.5 pl-9 pr-3 font-body text-sm text-text-primary outline-none focus:border-brand-500"
            placeholder="Buscar por nombre o email..."
          />
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={() => { setRoleFilter(null); setTimeout(refetch, 0); }}
            className={`cursor-pointer rounded-lg px-3 py-2 font-heading text-xs font-semibold transition-colors ${
              !roleFilter ? "bg-surface-secondary text-text-invert" : "border border-border-primary text-text-secondary hover:border-brand-300"
            }`}
          >
            Todos
          </button>
          {allRoles.slice(0, 3).map((role) => (
            <button
              key={role.key}
              onClick={() => { setRoleFilter(role.key); setTimeout(refetch, 0); }}
              className={`cursor-pointer rounded-lg px-3 py-2 font-heading text-xs font-semibold transition-colors ${
                roleFilter === role.key ? "bg-surface-secondary text-text-invert" : "border border-border-primary text-text-secondary hover:border-brand-300"
              }`}
            >
              {role.label}
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

      {/* Users table */}
      {loading || !users ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-primary bg-surface-primary">
          <table className="w-full min-w-[900px] [&_td]:px-3 [&_th]:px-3">
            <thead>
              <tr className="border-b border-border-primary bg-brand-50">
                <SortTh label="Usuario" sortKey="user" sort={sort} onToggle={toggle} />
                <SortTh label="Email" sortKey="email" sort={sort} onToggle={toggle} />
                <SortTh label="Roles" sortKey="roles" sort={sort} onToggle={toggle} />
                <SortTh label="Club / Torneos" sortKey="clubs" sort={sort} onToggle={toggle} />
                <SortTh label="Creado" sortKey="created" sort={sort} onToggle={toggle} />
                <th className="px-4 py-3 text-right font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted?.map((user) => (
                <tr key={user.id} className="border-b border-border-primary last:border-0 hover:bg-brand-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-200 font-heading text-xs font-bold text-text-primary">
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                      <div>
                        <p className="font-heading text-sm font-semibold text-text-primary">
                          {user.firstName} {user.lastName}
                        </p>
                        {user.phone && (
                          <p className="font-body text-xs text-text-secondary">{user.phone}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-body text-sm text-text-secondary">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <RoleBadge key={role} role={role} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {user.ownedClubs.length > 0 && (
                        <p className="font-body text-xs text-text-secondary">
                          Club: {user.ownedClubs.map((c) => c.name).join(", ")}
                        </p>
                      )}
                      {user.playerProfiles.some((p) => p.club) && (
                        <p className="font-body text-xs text-text-secondary">
                          Juega en: {user.playerProfiles.flatMap((p) => (p.club ? [p.club.name] : [])).join(", ")}
                        </p>
                      )}
                      {user.tournamentsCount > 0 && (
                        <p className="font-body text-xs text-text-secondary">
                          {user.tournamentsCount} torneo{user.tournamentsCount > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-body text-xs text-text-secondary">
                      {new Date(user.createdAt).toLocaleDateString("es-PE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="cursor-pointer rounded-lg border border-border-primary px-3 py-1.5 font-heading text-xs font-semibold text-text-primary transition-colors hover:bg-btn-regular"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center font-body text-sm text-text-secondary">
                    No se encontraron usuarios
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateUserModal onClose={() => { setShowCreate(false); router.replace("/admin/usuarios"); }} onCreated={handleCreated} />}
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSaved={handleUserSaved} />}
    </div>
  );
}

export default function AdminUsuariosPage() {
  return (
    <Suspense fallback={null}>
      <AdminUsuariosContent />
    </Suspense>
  );
}
