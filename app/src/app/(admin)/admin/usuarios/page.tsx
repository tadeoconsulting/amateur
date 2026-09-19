"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useApi } from "@/_lib/use-api";

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  gender: string | null;
  department: string | null;
  birthDate: string | null;
  createdAt: string;
  roles: string[];
  ownedClubs: { id: string; name: string }[];
  playerProfile: { id: string; position: string | null; club: { id: string; name: string } | null } | null;
  tournamentsCount: number;
}

const allRoles = [
  { key: "ORGANIZADOR", label: "Organizador" },
  { key: "CLUB_OWNER", label: "Dueño de club" },
  { key: "JUGADOR", label: "Jugador" },
  { key: "SPONSOR", label: "Sponsor" },
  { key: "FAN", label: "Fan" },
];

const roleBadgeColors: Record<string, string> = {
  ORGANIZADOR: "bg-purple-100 text-purple-700",
  CLUB_OWNER: "bg-green-100 text-green-700",
  JUGADOR: "bg-blue-100 text-blue-700",
  SPONSOR: "bg-amber-100 text-amber-700",
  FAN: "bg-gray-100 text-gray-700",
};

function RoleBadge({ role }: { role: string }) {
  const label = allRoles.find((r) => r.key === role)?.label ?? role;
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
    setForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const isJugador = form.roles.includes("JUGADOR");
  const isOrganizador = form.roles.includes("ORGANIZADOR");

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

    onCreated();
  };

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
              {allRoles.map((role) => (
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
                    <option key={c.id} value={c.id}>{c.name} ({c.shortName})</option>
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

function EditRolesModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [roles, setRoles] = useState<string[]>(user.roles);
  const [saving, setSaving] = useState(false);

  const toggleRole = (role: string) => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roles }),
    });
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-surface-primary p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-text-primary">
            Editar roles — {user.firstName} {user.lastName}
          </h2>
          <button onClick={onClose} className="cursor-pointer p-1 text-text-secondary hover:text-text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p className="mb-4 font-body text-sm text-text-secondary">{user.email}</p>

        <div className="flex flex-wrap gap-2">
          {allRoles.map((role) => (
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

  const handleCreated = () => {
    setShowCreate(false);
    router.replace("/admin/usuarios");
    refetch();
  };

  const handleRolesSaved = () => {
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
        <div className="overflow-hidden rounded-xl border border-border-primary bg-surface-primary">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary bg-brand-50">
                <th className="px-4 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Roles
                </th>
                <th className="px-4 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Club / Torneos
                </th>
                <th className="px-4 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Creado
                </th>
                <th className="px-4 py-3 text-right font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
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
                      {user.playerProfile?.club && (
                        <p className="font-body text-xs text-text-secondary">
                          Juega en: {user.playerProfile.club.name}
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
                      Editar roles
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
      {editingUser && <EditRolesModal user={editingUser} onClose={() => setEditingUser(null)} onSaved={handleRolesSaved} />}
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
