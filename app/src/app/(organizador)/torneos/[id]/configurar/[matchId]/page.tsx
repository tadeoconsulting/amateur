"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre",
];
const dayHeaders = ["D", "L", "M", "M", "J", "V", "S"];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const days: { day: number; current: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: daysInPrev - i, current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ day: d, current: true });
  }
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      days.push({ day: d, current: false });
    }
  }
  return days;
}

const hours = [
  "06:00 am", "07:00 am", "08:00 am", "09:00 am", "10:00 am",
  "11:00 am", "12:00 pm", "1:00 pm", "2:00 pm", "3:00 pm",
  "4:00 pm", "5:00 pm", "6:00 pm", "7:00 pm", "8:00 pm",
  "9:00 pm", "10:00 pm", "11:00 pm",
];

const minutes = [
  "00 min", "05 min", "10 min", "15 min", "20 min",
  "25 min", "30 min", "35 min", "40 min", "45 min",
  "50 min", "55 min",
];

const sedes = [
  "Estadio La Ribera",
  "Complejo Deportivo Municipal",
  "Canchas El Bosque",
  "Cancha 1",
  "Cancha 2",
];

export default function ConfigurarPartidoPage() {
  const params = useParams<{ id: string; matchId: string }>();
  const router = useRouter();

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [hora, setHora] = useState("");
  const [minuto, setMinuto] = useState("");
  const [sede, setSede] = useState("");
  const [openHora, setOpenHora] = useState(false);
  const [openMinuto, setOpenMinuto] = useState(false);
  const [openSede, setOpenSede] = useState(false);

  const days = getCalendarDays(viewYear, viewMonth);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  function isSelected(day: number, current: boolean) {
    if (!selectedDate || !current) return false;
    return selectedDate.getFullYear() === viewYear && selectedDate.getMonth() === viewMonth && selectedDate.getDate() === day;
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

      <div className="flex-1 px-4">
        {/* Title */}
        <h1 className="font-heading text-lg font-bold text-text-primary mb-4">
          Ingresa la fecha y horario del partido
        </h1>

        {/* Inline calendar */}
        <div className="mb-6">
          {/* Month nav */}
          <div className="mb-3 flex items-center justify-between">
            <span className="font-heading text-base font-bold text-text-primary">
              {monthNames[viewMonth]}
            </span>
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="cursor-pointer p-1 text-text-secondary hover:text-text-primary">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button onClick={nextMonth} className="cursor-pointer p-1 text-text-secondary hover:text-text-primary">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="mb-2 grid grid-cols-7">
            {dayHeaders.map((h, i) => (
              <div key={i} className="text-center font-heading text-xs font-semibold text-text-secondary">
                {h}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {days.map((d, i) => (
              <button
                key={i}
                onClick={() => {
                  if (d.current) setSelectedDate(new Date(viewYear, viewMonth, d.day));
                }}
                className={`flex h-10 w-full cursor-pointer items-center justify-center rounded-full font-body text-sm transition-colors ${
                  isSelected(d.day, d.current)
                    ? "bg-surface-secondary text-text-invert font-bold"
                    : d.current
                      ? "text-text-primary hover:bg-btn-regular"
                      : "text-text-secondary/40"
                }`}
              >
                {d.day}
              </button>
            ))}
          </div>
        </div>

        {/* Seleccionar horario */}
        <div className="mb-6">
          <h3 className="font-heading text-sm font-bold text-text-primary mb-3">
            Seleccionar horario (Tiempo: 20min)
          </h3>
          <div className="flex gap-3">
            {/* Hora dropdown */}
            <div className="relative flex-1">
              <button
                onClick={() => { setOpenHora(!openHora); setOpenMinuto(false); setOpenSede(false); }}
                className="flex w-full cursor-pointer items-center rounded-lg border border-border-primary px-3 py-3 transition-colors hover:bg-btn-regular"
              >
                <span className={`flex-1 text-left font-body text-sm ${hora ? "text-text-primary" : "text-text-secondary"}`}>
                  {hora || "Hora"}
                </span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-text-secondary">
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {openHora && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[200px] overflow-y-auto rounded-xl border border-border-primary bg-surface-primary shadow-lg">
                  {hours.map((h) => (
                    <button
                      key={h}
                      onClick={() => { setHora(h); setOpenHora(false); }}
                      className="flex w-full cursor-pointer items-center px-4 py-2.5 font-body text-sm text-text-primary transition-colors hover:bg-btn-regular"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Minuto dropdown */}
            <div className="relative flex-1">
              <button
                onClick={() => { setOpenMinuto(!openMinuto); setOpenHora(false); setOpenSede(false); }}
                className="flex w-full cursor-pointer items-center rounded-lg border border-border-primary px-3 py-3 transition-colors hover:bg-btn-regular"
              >
                <span className={`flex-1 text-left font-body text-sm ${minuto ? "text-text-primary" : "text-text-secondary"}`}>
                  {minuto || "Minuto"}
                </span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-text-secondary">
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {openMinuto && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[200px] overflow-y-auto rounded-xl border border-border-primary bg-surface-primary shadow-lg">
                  {minutes.map((m) => (
                    <button
                      key={m}
                      onClick={() => { setMinuto(m); setOpenMinuto(false); }}
                      className="flex w-full cursor-pointer items-center px-4 py-2.5 font-body text-sm text-text-primary transition-colors hover:bg-btn-regular"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Seleccionar sede */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading text-sm font-bold text-text-primary">
              Seleccionar sede
            </h3>
            <button className="cursor-pointer font-heading text-sm font-semibold text-text-primary underline underline-offset-2">
              Agregar sede
            </button>
          </div>
          <div className="relative">
            <button
              onClick={() => { setOpenSede(!openSede); setOpenHora(false); setOpenMinuto(false); }}
              className="flex w-full cursor-pointer items-center rounded-lg border border-border-primary px-3 py-3 transition-colors hover:bg-btn-regular"
            >
              <span className={`flex-1 text-left font-body text-sm ${sede ? "text-text-primary" : "text-text-secondary"}`}>
                {sede || "Elegir"}
              </span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-text-secondary">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {openSede && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[200px] overflow-y-auto rounded-xl border border-border-primary bg-surface-primary shadow-lg">
                {sedes.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSede(s); setOpenSede(false); }}
                    className="flex w-full cursor-pointer items-center px-4 py-2.5 font-body text-sm text-text-primary transition-colors hover:bg-btn-regular"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guardar cambios — sticky bottom */}
      <div className="sticky bottom-0 bg-surface-primary px-4 pb-6 pt-3">
        <button
          onClick={() => {
            if (selectedDate && hora) {
              const config = {
                date: selectedDate.toISOString(),
                hora,
                minuto: minuto || "00 min",
                sede: sede || "",
              };
              try {
                const stored = JSON.parse(localStorage.getItem("matchConfigs") || "{}");
                stored[params.matchId] = config;
                localStorage.setItem("matchConfigs", JSON.stringify(stored));
              } catch {}
            }
            router.back();
          }}
          className="w-full cursor-pointer rounded-lg bg-surface-secondary py-3.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700"
        >
          Guardar cambios
        </button>
      </div>
    </div>
  );
}
