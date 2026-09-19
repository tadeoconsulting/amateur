"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/_components/mobile-shell";
import { StepIndicator } from "./_components/step-indicator";
import { CrearSedeModal, type Sede } from "./_components/crear-sede-modal";
import { useWizard } from "./_components/wizard-context";

export default function CrearTorneoPage() {
  const router = useRouter();
  const { state, update } = useWizard();
  const { nombre, fecha, sede, sedes } = state;
  const [showSedeList, setShowSedeList] = useState(false);
  const [showCrearSede, setShowCrearSede] = useState(false);

  const setNombre = (value: string) => update({ nombre: value });
  const setFecha = (value: string) => update({ fecha: value });

  // Nombre, fecha y sede son lo mínimo para que el torneo exista (la base los exige).
  const canContinue = nombre.trim() !== "" && fecha !== "" && sede !== null;

  function handleSelectSede(s: Sede) {
    update({ sede: s });
    setShowSedeList(false);
  }

  function handleCreatedSede(s: Sede) {
    update({ sedes: [...sedes, s], sede: s });
  }

  function handleContinuar() {
    router.push("/crear-torneo/paso-2");
  }

  return (
    <MobileShell>
      {/* Header */}
      <header className="px-4 py-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 font-heading text-base font-semibold text-text-primary cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180">
            <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Salir
        </button>
      </header>

      <div className="flex flex-1 flex-col px-4 pb-6">
        <StepIndicator current={1} total={3} />

        {/* Titles */}
        <p className="font-heading text-sm font-semibold text-text-secondary mb-1">
          Crea tu primer torneo
        </p>
        <h1 className="font-heading text-[22px] font-bold text-text-primary leading-tight mb-8">
          Información del torneo
        </h1>

        {/* Form */}
        <div className="flex flex-col gap-6 flex-1">
          {/* Nombre del torneo */}
          <div>
            <label className="block font-heading text-sm font-semibold text-text-primary mb-2">
              Nombre del torneo
            </label>
            <input
              type="text"
              placeholder="Ingresar nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded border border-transparent bg-btn-regular px-3 py-3 font-body text-sm text-text-primary placeholder:text-text-primary/60 transition-colors hover:border-border-primary hover:bg-surface-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none"
            />
          </div>

          {/* Fecha de inicio */}
          <div>
            <label className="block font-heading text-sm font-semibold text-text-primary mb-2">
              Fecha de inicio
            </label>
            <div className="relative">
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full rounded border border-transparent bg-btn-regular px-3 py-3 font-body text-sm text-text-primary transition-colors hover:border-border-primary hover:bg-surface-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3 8h14M7 2v4M13 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Sede del torneo */}
          <div className="relative">
            <label className="block font-heading text-sm font-semibold text-text-primary mb-2">
              Sede del torneo
            </label>
            <button
              onClick={() => setShowSedeList(!showSedeList)}
              className="flex w-full items-center rounded border border-transparent bg-btn-regular px-3 py-3 text-left cursor-pointer transition-colors hover:border-border-primary hover:bg-surface-primary"
            >
              <span className={`flex-1 font-body text-sm truncate ${sede ? "text-text-primary" : "text-text-primary/60"}`}>
                {sede ? `${sede.nombre}, ${sede.direccion}` : "Ejm: Estadio Municipal, Jr Cruz 435, Distrito..."}
              </span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-secondary ml-2 shrink-0">
                <path d="M10 2C6.69 2 4 4.69 4 8c0 4.5 6 10 6 10s6-5.5 6-10c0-3.31-2.69-6-6-6zm0 8a2 2 0 110-4 2 2 0 010 4z" fill="currentColor" />
              </svg>
            </button>

            {/* Dropdown */}
            {showSedeList && (
              <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border border-border-primary bg-surface-primary shadow-lg max-h-60 overflow-y-auto">
                {sedes.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectSede(s)}
                    className="w-full text-left px-4 py-3 border-b border-brand-200 last:border-0 hover:bg-brand-300 cursor-pointer"
                  >
                    <p className="font-heading text-sm font-semibold text-text-primary">{s.nombre}</p>
                    <p className="font-body text-xs text-text-secondary mt-0.5">{s.direccion}</p>
                  </button>
                ))}
                <button
                  onClick={() => { setShowSedeList(false); setShowCrearSede(true); }}
                  className="w-full text-left px-4 py-3 hover:bg-brand-300 cursor-pointer flex items-center gap-2"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-field-green">
                    <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M9 5v8M5 9h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span className="font-heading text-sm font-semibold text-field-dark">Crear nueva sede</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="mt-auto pt-8 flex flex-col gap-3">
          <button
            onClick={handleContinuar}
            disabled={!canContinue}
            className="w-full rounded-lg bg-surface-secondary py-3.5 font-heading text-sm font-bold text-text-invert hover:bg-brand-700 transition-colors cursor-pointer disabled:opacity-40"
          >
            Continuar
          </button>
          <button
            onClick={() => router.push("/torneos")}
            className="w-full py-3 font-heading text-sm font-semibold text-text-primary cursor-pointer"
          >
            Omitir este paso
          </button>
        </div>
      </div>

      <CrearSedeModal
        open={showCrearSede}
        onClose={() => setShowCrearSede(false)}
        onCreated={handleCreatedSede}
      />
    </MobileShell>
  );
}
