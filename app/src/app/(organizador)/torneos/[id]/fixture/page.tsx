"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { getTournament } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { DatePicker } from "@/_components/date-picker";
import { TimePicker } from "@/_components/time-picker";
import { planFixture } from "@/_lib/fixture";
import { addDays, to24h, toYmd } from "@/_lib/match-format";
import { formatLabel, OPEN_STATUSES } from "@/_lib/tournament-labels";

const playDays = [
  { key: "L", label: "L" },
  { key: "M1", label: "M" },
  { key: "M2", label: "M" },
  { key: "J", label: "J" },
  { key: "V", label: "V" },
  { key: "S", label: "S" },
  { key: "D", label: "D" },
];

// Cada día de la pantalla como número de día de la semana (0 = domingo) para la API.
const DAY_NUMBER: Record<string, number> = { L: 1, M1: 2, M2: 3, J: 4, V: 5, S: 6, D: 0 };

type FechaForm = {
  days: string[];
  inicio: Date | null;
  fin: Date | null;
  horaInicio: string | null;
  horaFin: string | null;
  sede: "local" | "torneo" | null;
};

const EMPTY: FechaForm = { days: [], inicio: null, fin: null, horaInicio: null, horaFin: null, sede: null };

const isComplete = (f: FechaForm | undefined): f is FechaForm & { inicio: Date; fin: Date; horaInicio: string; horaFin: string; sede: "local" | "torneo" } =>
  !!f && f.days.length > 0 && !!f.inicio && !!f.fin && !!f.horaInicio && !!f.horaFin && !!f.sede;

/** La fecha siguiente arranca igual que la anterior, una semana después. */
const nextWeek = (f: FechaForm & { inicio: Date; fin: Date }): FechaForm => ({ ...f, inicio: addDays(f.inicio, 7), fin: addDays(f.fin, 7) });

export default function FixturePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: tournament, loading } = useApi(() => getTournament(params.id));

  // Una configuración por fecha del fixture.
  const [forms, setForms] = useState<Record<number, FechaForm>>({});
  const [active, setActive] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Se muestra y edita la configuración de la fecha activa con los mismos nombres de siempre.
  const current = forms[active] ?? EMPTY;
  const selectedDays = new Set(current.days);
  const { sede, inicio: fechaInicio, fin: fechaFin, horaInicio, horaFin } = current;
  const patch = (changes: Partial<FechaForm>) => setForms((prev) => ({ ...prev, [active]: { ...(prev[active] ?? EMPTY), ...changes } }));
  const setSede = (value: "local" | "torneo") => patch({ sede: value });
  const setFechaInicio = (value: Date) => patch({ inicio: value });
  const setFechaFin = (value: Date) => patch({ fin: value });
  const setHoraInicio = (value: string) => patch({ horaInicio: value });
  const setHoraFin = (value: string) => patch({ horaFin: value });

  if (loading || !tournament) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  // Las fechas salen del fixture real (una liga de 8 equipos tiene 7). La fase de grupos de
  // copa (especificación 007) se arma igual que "grupos": el cuadro de eliminación se arma
  // aparte, después, desde /iniciar o la pestaña Llaves.
  const isCopa = tournament.format === "copa";
  const plan = planFixture(
    tournament.teams.map((t) => ({ id: t.club.id, groupName: t.groupName })),
    isCopa ? "grupos" : tournament.format
  );
  const started = !OPEN_STATUSES.includes(tournament.status);
  if (started || !plan.ok) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-heading text-lg font-bold text-text-primary">
          {started ? "Este torneo ya empezó" : "No se puede armar el fixture"}
        </p>
        <p className="font-body text-sm text-text-secondary">
          {started ? "El fixture ya fue creado." : plan.ok ? "" : plan.error}
        </p>
        <Link
          href={started ? `/torneos/${params.id}/partidos` : `/torneos/${params.id}`}
          className="font-heading text-sm font-semibold text-text-primary underline"
        >
          {started ? "Ver fixture" : "Volver al torneo"}
        </Link>
      </div>
    );
  }
  const matchdays = Array.from({ length: plan.matchdays }, (_, i) => i + 1);

  function selectFecha(k: number) {
    // Al abrir una fecha sin configurar se propone la anterior, una semana después.
    const previous = forms[k - 1];
    if (k > 1 && !forms[k] && isComplete(previous)) setForms((prev) => ({ ...prev, [k]: nextWeek(previous) }));
    setActive(k);
  }

  async function guardar() {
    if (saving) return;
    setError("");

    // Las fechas que no se tocaron heredan la anterior (una semana después).
    const resolved: (FechaForm & { inicio: Date; fin: Date; horaInicio: string; horaFin: string; sede: "local" | "torneo" })[] = [];
    for (const k of matchdays) {
      let form = forms[k];
      if (!form && k > 1) form = nextWeek(resolved[k - 2]);
      if (!isComplete(form)) {
        setActive(k);
        setError(`Completa la fecha ${k}: días, rango de fechas, horario y sede.`);
        return;
      }
      resolved.push(form);
    }

    const configs = resolved.map((f) => ({
      days: f.days.map((key) => DAY_NUMBER[key]),
      startDate: toYmd(f.inicio),
      endDate: toYmd(f.fin),
      startTime: to24h(f.horaInicio),
      endTime: to24h(f.horaFin),
      venue: f.sede,
    }));

    setSaving(true);
    try {
      const res = await fetch(`/api/tournaments/${params.id}/fixture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "auto", matchdays: configs }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear el fixture");
        if (typeof data.matchday === "number") setActive(data.matchday);
        return;
      }
      router.push(`/torneos/${params.id}/partidos?saved=true`);
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  function toggleDay(key: string) {
    patch({ days: selectedDays.has(key) ? current.days.filter((d) => d !== key) : [...current.days, key] });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="px-4 py-3">
        <button
          onClick={() => router.back()}
          className="flex cursor-pointer items-center gap-1 font-heading text-sm font-semibold text-text-primary"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180">
            <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver
        </button>
      </header>

      {/* Tournament info pill */}
      <div className="mx-4 mb-4 rounded-xl border border-border-primary p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red/10">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 2h8v4a4 4 0 01-8 0V2zM3 3H1.5a.5.5 0 00-.5.5v1a2 2 0 002 2H3M13 3h1.5a.5.5 0 01.5.5v1a2 2 0 01-2 2h-.5M6 10v2M10 10v2M5 12h6a1 1 0 011 1v1H4v-1a1 1 0 011-1z"
                stroke="var(--color-red)"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-sm font-bold text-text-primary">
              {tournament.name}
            </p>
            <p className="font-body text-xs text-text-secondary">
              {tournament._count.teams} equipos | {formatLabel(tournament.format)} | {tournament.category || "Libre"}
              {" "}
              <span className="inline-flex items-center rounded-full bg-verification px-1.5 py-0.5 text-[10px] font-bold text-text-primary">
                Activo
              </span>
            </p>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-text-secondary">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Matchday tabs */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-4 no-scrollbar">
        {matchdays.map((day) => (
          <button
            key={day}
            onClick={() => selectFecha(day)}
            className={`shrink-0 cursor-pointer rounded-lg px-4 py-2 font-heading text-xs font-semibold transition-colors ${
              active === day
                ? "bg-surface-secondary text-text-invert"
                : "border border-border-primary text-text-primary"
            }`}
          >
            Fecha {day}
          </button>
        ))}
      </div>

      {/* Form content */}
      <div className="flex-1 px-4">
        {/* Días que se jugarán */}
        <div className="mb-6">
          <h3 className="font-heading text-sm font-bold text-text-primary mb-3">
            Días que se jugarán
          </h3>
          <div className="flex gap-2">
            {playDays.map((d) => (
              <button
                key={d.key}
                onClick={() => toggleDay(d.key)}
                className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full font-heading text-sm font-semibold transition-colors ${
                  selectedDays.has(d.key)
                    ? "bg-surface-secondary text-text-invert"
                    : "border border-border-primary text-text-primary"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rango de fechas */}
        <div className="mb-6">
          <h3 className="font-heading text-sm font-bold text-text-primary mb-3">
            Rango de fechas
          </h3>
          <div className="flex gap-3">
            <DatePicker
              value={fechaInicio}
              onChange={setFechaInicio}
              placeholder="Fecha de inicio"
            />
            <DatePicker
              value={fechaFin}
              onChange={setFechaFin}
              placeholder="Fecha de fin"
            />
          </div>
        </div>

        {/* Rango de horario */}
        <div className="mb-6">
          <h3 className="font-heading text-sm font-bold text-text-primary mb-3">
            Rango de horario
          </h3>
          <div className="flex gap-3">
            <TimePicker
              value={horaInicio}
              onChange={setHoraInicio}
              placeholder="Hora de inicio"
            />
            <TimePicker
              value={horaFin}
              onChange={setHoraFin}
              placeholder="Hora de fin"
            />
          </div>
        </div>

        {/* Sede */}
        <div className="mb-6">
          <h3 className="font-heading text-sm font-bold text-text-primary mb-3">
            Sede
          </h3>
          <div className="flex gap-3">
            <button
              onClick={() => setSede("local")}
              className={`flex-1 cursor-pointer rounded-lg px-3 py-3 font-body text-sm transition-colors ${
                sede === "local"
                  ? "bg-surface-secondary text-text-invert"
                  : "border border-border-primary text-text-primary"
              }`}
            >
              Del equipo local
            </button>
            <button
              onClick={() => setSede("torneo")}
              className={`flex-1 cursor-pointer rounded-lg px-3 py-3 font-body text-sm transition-colors ${
                sede === "torneo"
                  ? "bg-surface-secondary text-text-invert"
                  : "border border-border-primary text-text-primary"
              }`}
            >
              Del torneo
            </button>
          </div>
        </div>
      </div>

      {/* Guardar button — sticky bottom */}
      {/* bottom-20: queda por encima de la barra de navegación inferior (si no, la tapa) */}
      <div className="sticky bottom-20 bg-surface-primary px-4 pb-3 pt-3">
        {error ? (
          <p className="mb-3 font-body text-sm text-red-600">{error}</p>
        ) : (
          <p className="mb-3 font-body text-xs text-text-secondary">
            {plan.matchdays} {plan.matchdays === 1 ? "fecha" : "fechas"} · {plan.matches.length} partidos. Las fechas que no
            configures usan la anterior, una semana después.
          </p>
        )}
        <button
          onClick={guardar}
          disabled={saving}
          className="w-full cursor-pointer rounded-lg bg-surface-secondary py-3.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:opacity-40"
        >
          {saving ? "Creando fixture..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}
