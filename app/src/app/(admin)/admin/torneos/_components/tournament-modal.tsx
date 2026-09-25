"use client";

import { useEffect, useState, type ReactNode } from "react";
import { COMPETITION_TYPES, GENDERS, MODALITIES, TOURNAMENT_STATUSES } from "@/_lib/tournament-labels";

interface UserOption {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface Form {
  name: string;
  format: string;
  status: string;
  maxTeams: string;
  minTeams: string;
  startDate: string;
  endDate: string;
  location: string;
  category: string;
  modality: string;
  gender: string;
  minutesPerHalf: string;
  playersPerTeam: string;
  assignDelegates: boolean;
  registrationFee: string;
  refereeFee: string;
  extraTimeMinutes: string;
  groupsAdvancePerGroup: string;
  rules: string;
}

const EMPTY_FORM: Form = {
  name: "",
  format: "liga",
  status: "inscripcion",
  maxTeams: "8",
  minTeams: "4",
  startDate: "",
  endDate: "",
  location: "",
  category: "",
  modality: "",
  gender: "",
  minutesPerHalf: "",
  playersPerTeam: "",
  assignDelegates: false,
  registrationFee: "",
  refereeFee: "",
  extraTimeMinutes: "",
  groupsAdvancePerGroup: "",
  rules: "",
};

const STATUS_OPTIONS: Record<string, string> = {
  draft: "Borrador",
  inscripcion: "Inscripción abierta",
  en_curso: "En curso",
  finalizado: "Finalizado",
};

// "grupos" no está en el asistente pero existe en torneos anteriores.
const FORMAT_OPTIONS = [...COMPETITION_TYPES.map((t) => ({ value: t.format, label: t.label })), { value: "grupos", label: "Grupos" }];

const inputClass =
  "w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500";

const isKnockout = (format: string) => format === "eliminacion" || format === "relampago" || format === "copa";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-body text-xs font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  );
}

const toText = (v: string) => (v.trim() === "" ? null : v.trim());
const toNumber = (v: string) => (v.trim() === "" ? null : Number(v));

/** Campos comunes a crear y editar, con el mismo criterio que el asistente de crear torneo. */
function toPayload(form: Form) {
  return {
    name: form.name.trim(),
    format: form.format,
    maxTeams: Number(form.maxTeams),
    minTeams: toNumber(form.minTeams),
    startDate: form.startDate,
    endDate: form.endDate || null,
    location: form.location.trim(),
    category: toText(form.category),
    modality: form.modality || null,
    gender: form.gender || null,
    minutesPerHalf: toNumber(form.minutesPerHalf),
    playersPerTeam: toNumber(form.playersPerTeam),
    assignDelegates: form.assignDelegates,
    registrationFee: toText(form.registrationFee),
    refereeFee: toText(form.refereeFee),
    // Solo tienen efecto en un cuadro de eliminación / formato Copa.
    extraTimeMinutes: isKnockout(form.format) ? toNumber(form.extraTimeMinutes) : null,
    groupsAdvancePerGroup: form.format === "copa" ? toNumber(form.groupsAdvancePerGroup) : null,
    rules: form.rules.split("\n").map((r) => r.trim()).filter(Boolean),
  };
}

interface TournamentDetail {
  name: string;
  format: string;
  status: string;
  maxTeams: number;
  minTeams: number | null;
  startDate: string;
  endDate: string | null;
  location: string;
  category: string | null;
  modality: string | null;
  gender: string | null;
  minutesPerHalf: number | null;
  playersPerTeam: number | null;
  assignDelegates: boolean;
  registrationFee: string | null;
  refereeFee: string | null;
  extraTimeMinutes: number | null;
  groupsAdvancePerGroup: number | null;
  rules: string[];
  organizer: { firstName: string; lastName: string };
  _count: { teams: number };
}

const str = (v: number | string | null) => (v === null ? "" : String(v));

function formFromDetail(t: TournamentDetail): Form {
  return {
    name: t.name,
    format: t.format,
    status: t.status,
    maxTeams: str(t.maxTeams),
    minTeams: str(t.minTeams),
    startDate: t.startDate.slice(0, 10),
    endDate: t.endDate ? t.endDate.slice(0, 10) : "",
    location: t.location,
    category: str(t.category),
    modality: str(t.modality),
    gender: str(t.gender),
    minutesPerHalf: str(t.minutesPerHalf),
    playersPerTeam: str(t.playersPerTeam),
    assignDelegates: t.assignDelegates,
    registrationFee: str(t.registrationFee),
    refereeFee: str(t.refereeFee),
    extraTimeMinutes: str(t.extraTimeMinutes),
    groupsAdvancePerGroup: str(t.groupsAdvancePerGroup),
    rules: t.rules.join("\n"),
  };
}

/** Crear (sin `tournamentId`) o editar (con `tournamentId`) un torneo desde el panel de admin. */
export function TournamentModal({
  tournamentId,
  onClose,
  onSaved,
}: {
  tournamentId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = tournamentId !== undefined;
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [original, setOriginal] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [organizerSearch, setOrganizerSearch] = useState("");
  const [organizerResults, setOrganizerResults] = useState<UserOption[]>([]);
  const [selectedOrganizer, setSelectedOrganizer] = useState<UserOption | null>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!tournamentId) return;
    let cancelled = false;
    fetch(`/api/tournaments/${tournamentId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return (await res.json()) as TournamentDetail;
      })
      .then((t) => {
        if (cancelled) return;
        setOriginal(t);
        setForm(formFromDetail(t));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("No se pudo cargar el torneo. Cierra e inténtalo de nuevo.");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tournamentId]);

  useEffect(() => {
    if (editing || organizerSearch.length < 2) return;
    const timer = setTimeout(() => {
      fetch(`/api/users?search=${encodeURIComponent(organizerSearch)}&role=ORGANIZADOR`)
        .then((r) => r.json())
        .then(setOrganizerResults)
        .catch(() => setOrganizerResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [organizerSearch, editing]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.startDate || !form.location.trim() || !form.maxTeams) {
      setError("Nombre, fecha de inicio, ubicación y máximo de equipos son requeridos");
      return;
    }
    if (!editing && !selectedOrganizer) {
      setError("Selecciona un organizador");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = toPayload(form);
    // Un estado heredado que ya no está en la lista (p. ej. "cancelado") no se reenvía si no cambió.
    const statusChanged = !original || form.status !== original.status;
    const body = editing
      ? { ...payload, ...(statusChanged ? { status: form.status } : {}) }
      : { ...payload, status: form.status, organizerId: selectedOrganizer!.id };

    try {
      const res = await fetch(editing ? `/api/tournaments/${tournamentId}` : "/api/tournaments", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || (editing ? "No se pudo guardar el torneo" : "Error al crear torneo"));
        return;
      }
      onSaved();
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const statusChoices = TOURNAMENT_STATUSES.map((s) => ({ value: s as string, label: STATUS_OPTIONS[s] }));
  if (editing && original && !statusChoices.some((s) => s.value === original.status)) {
    statusChoices.push({ value: original.status, label: original.status });
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface-primary p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-text-primary">
            {editing ? "Editar torneo" : "Crear torneo"}
          </h2>
          <button onClick={onClose} aria-label="Cerrar" className="cursor-pointer p-1 text-text-secondary hover:text-text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 font-body text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : editing && !original ? null : (
          <div className="flex flex-col gap-4">
            <Field label="Nombre del torneo *">
              <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} placeholder="Copa Comunidad 2026" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Formato *">
                <select value={form.format} onChange={(e) => set("format", e.target.value)} className={`${inputClass} cursor-pointer`}>
                  {FORMAT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </Field>
              <Field label={editing ? "Estado" : "Estado inicial"}>
                <select value={form.status} onChange={(e) => set("status", e.target.value)} className={`${inputClass} cursor-pointer`}>
                  {(editing ? statusChoices : statusChoices.filter((s) => s.value === "draft" || s.value === "inscripcion")).map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Máx. equipos *">
                <input type="number" min={2} value={form.maxTeams} onChange={(e) => set("maxTeams", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Mín. equipos">
                <input type="number" min={2} value={form.minTeams} onChange={(e) => set("minTeams", e.target.value)} className={inputClass} />
              </Field>
            </div>
            {editing && original && original._count.teams > 0 && (
              <p className="-mt-2 font-body text-xs text-text-secondary">
                Hay {original._count.teams} equipos inscritos: el máximo no puede ser menor.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha de inicio *">
                <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Fecha de fin">
                <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className={inputClass} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Ubicación *">
                <input value={form.location} onChange={(e) => set("location", e.target.value)} className={inputClass} placeholder="Complejo Deportivo Norte" />
              </Field>
              <Field label="Categoría">
                <input value={form.category} onChange={(e) => set("category", e.target.value)} className={inputClass} placeholder="Libre" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Modalidad">
                <select value={form.modality} onChange={(e) => set("modality", e.target.value)} className={`${inputClass} cursor-pointer`}>
                  <option value="">Sin definir</option>
                  {MODALITIES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </Field>
              <Field label="Género">
                <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className={`${inputClass} cursor-pointer`}>
                  <option value="">Sin definir</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Minutos por tiempo">
                <input type="number" min={1} max={90} value={form.minutesPerHalf} onChange={(e) => set("minutesPerHalf", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Jugadores por equipo">
                <input type="number" min={1} max={50} value={form.playersPerTeam} onChange={(e) => set("playersPerTeam", e.target.value)} className={inputClass} />
              </Field>
            </div>

            {(isKnockout(form.format) || form.format === "copa") && (
              <div className="grid grid-cols-2 gap-3">
                {isKnockout(form.format) && (
                  <Field label="Tiempo extra (min)">
                    <input type="number" min={1} max={45} value={form.extraTimeMinutes} onChange={(e) => set("extraTimeMinutes", e.target.value)} className={inputClass} />
                  </Field>
                )}
                {form.format === "copa" && (
                  <Field label="Clasifican por grupo">
                    <select value={form.groupsAdvancePerGroup} onChange={(e) => set("groupsAdvancePerGroup", e.target.value)} className={`${inputClass} cursor-pointer`}>
                      <option value="">Sin definir</option>
                      {[2, 3, 4].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Costo de inscripción">
                <input value={form.registrationFee} onChange={(e) => set("registrationFee", e.target.value)} className={inputClass} placeholder="50" />
              </Field>
              <Field label="Costo de arbitraje">
                <input value={form.refereeFee} onChange={(e) => set("refereeFee", e.target.value)} className={inputClass} placeholder="40" />
              </Field>
            </div>

            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={form.assignDelegates} onChange={(e) => set("assignDelegates", e.target.checked)} className="h-4 w-4 cursor-pointer" />
              <span className="font-body text-sm text-text-primary">Asignar delegados a los partidos</span>
            </label>

            <Field label="Bases y condiciones (una por línea)">
              <textarea value={form.rules} onChange={(e) => set("rules", e.target.value)} rows={4} className={inputClass} />
            </Field>

            <div>
              <span className="mb-1 block font-body text-xs font-medium text-text-secondary">Organizador{editing ? "" : " *"}</span>
              {editing && original ? (
                <p className="rounded-lg border border-border-primary bg-brand-50 px-3 py-2.5 font-body text-sm text-text-primary">
                  {original.organizer.firstName} {original.organizer.lastName}
                </p>
              ) : selectedOrganizer ? (
                <div className="flex items-center justify-between rounded-lg border border-brand-300 bg-brand-50 px-3 py-2.5">
                  <span className="font-body text-sm text-text-primary">
                    {selectedOrganizer.firstName} {selectedOrganizer.lastName} ({selectedOrganizer.email})
                  </span>
                  <button onClick={() => setSelectedOrganizer(null)} aria-label="Quitar organizador" className="cursor-pointer text-text-secondary hover:text-text-primary">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input value={organizerSearch} onChange={(e) => setOrganizerSearch(e.target.value)} className={inputClass} placeholder="Buscar organizador por nombre..." />
                  {organizerResults.length > 0 && organizerSearch.length >= 2 && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-border-primary bg-surface-primary shadow-lg">
                      {organizerResults.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => { setSelectedOrganizer(u); setOrganizerSearch(""); }}
                          className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-brand-50"
                        >
                          <span className="font-body text-sm text-text-primary">{u.firstName} {u.lastName}</span>
                          <span className="font-body text-xs text-text-secondary">{u.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {editing && <p className="mt-1 font-body text-xs text-text-secondary">Un torneo no cambia de organizador desde aquí.</p>}
            </div>
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
            onClick={handleSubmit}
            disabled={saving || loading || (editing && !original)}
            className="cursor-pointer rounded-lg bg-surface-secondary px-5 py-2.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear torneo"}
          </button>
        </div>
      </div>
    </div>
  );
}
