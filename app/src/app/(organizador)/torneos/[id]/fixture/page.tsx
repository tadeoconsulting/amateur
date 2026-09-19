"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { getTournament } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { DatePicker } from "@/_components/date-picker";
import { TimePicker } from "@/_components/time-picker";

const matchdays = ["Fecha 1", "Fecha 2", "Fecha 3", "Cuartos", "Semi", "Final"];
const playDays = [
  { key: "L", label: "L" },
  { key: "M1", label: "M" },
  { key: "M2", label: "M" },
  { key: "J", label: "J" },
  { key: "V", label: "V" },
  { key: "S", label: "S" },
  { key: "D", label: "D" },
];

export default function FixturePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: tournament, loading } = useApi(() => getTournament(params.id));

  const [activeMatchday, setActiveMatchday] = useState("Fecha 1");
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [sede, setSede] = useState<"local" | "torneo" | null>(null);
  const [fechaInicio, setFechaInicio] = useState<Date | null>(null);
  const [fechaFin, setFechaFin] = useState<Date | null>(null);
  const [horaInicio, setHoraInicio] = useState<string | null>(null);
  const [horaFin, setHoraFin] = useState<string | null>(null);

  if (loading || !tournament) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  function toggleDay(key: string) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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
              {tournament._count.teams} equipos | {tournament.format === "liga" ? "Liga" : tournament.format === "grupos" ? "Grupos" : "Relámpago"} | {tournament.category || "Libre"}
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
            onClick={() => setActiveMatchday(day)}
            className={`shrink-0 cursor-pointer rounded-lg px-4 py-2 font-heading text-xs font-semibold transition-colors ${
              activeMatchday === day
                ? "bg-surface-secondary text-text-invert"
                : "border border-border-primary text-text-primary"
            }`}
          >
            {day}
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
      <div className="sticky bottom-0 bg-surface-primary px-4 pb-6 pt-3">
        <button
          onClick={() => router.push(`/torneos/${params.id}/partidos?saved=true`)}
          className="w-full cursor-pointer rounded-lg bg-surface-secondary py-3.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
