"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/_components/mobile-shell";
import { StepIndicator } from "../_components/step-indicator";
import { CondicionModal } from "../_components/condicion-modal";
import { BasesListModal } from "../_components/bases-list-modal";

export default function CrearTorneoPaso3Page() {
  const router = useRouter();
  const [minutos, setMinutos] = useState(0);
  const [jugadores, setJugadores] = useState(0);
  const [delegado, setDelegado] = useState(false);
  const [costoInscripcion, setCostoInscripcion] = useState("");
  const [costoArbitraje, setCostoArbitraje] = useState("");
  const [condiciones, setCondiciones] = useState<string[]>([]);
  const [showCondicionModal, setShowCondicionModal] = useState(false);
  const [showBasesList, setShowBasesList] = useState(false);
  const [torneoCreado, setTorneoCreado] = useState(false);

  function handleCrearTorneo() {
    setTorneoCreado(true);
    setShowBasesList(true);
  }

  function handleAddCondicion(texto: string) {
    setCondiciones((prev) => [...prev, texto]);
    setShowCondicionModal(false);
  }

  function handleEditCondicion(index: number, newText: string) {
    setCondiciones((prev) => prev.map((c, i) => (i === index ? newText : c)));
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
          Volver al paso anterior
        </button>
      </header>

      <div className="flex flex-1 flex-col px-4 pb-6 overflow-y-auto">
        <StepIndicator current={3} total={3} />

        {/* Titles */}
        <p className="font-heading text-sm font-semibold text-text-secondary mb-1">
          Crea tu primer torneo
        </p>
        <h1 className="font-heading text-[22px] font-bold text-text-primary leading-tight mb-6">
          Establece las bases
        </h1>

        {/* Minutos y jugadores */}
        <h2 className="font-heading text-base font-bold text-text-primary mb-4">
          Minutos y jugadores
        </h2>

        <div className="flex flex-col gap-4 mb-4">
          <div className="flex items-center justify-between">
            <span className="font-body text-sm text-text-primary leading-snug max-w-[55%]">
              Minutos de cada tiempo en el partido
            </span>
            <input
              type="number"
              min={0}
              value={minutos}
              onChange={(e) => setMinutos(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-24 rounded border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary text-center transition-colors hover:border-text-primary focus:border-text-primary focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="font-body text-sm text-text-primary leading-snug max-w-[55%]">
              Cantidad de jugadores inscritos por equipo
            </span>
            <input
              type="number"
              min={0}
              value={jugadores}
              onChange={(e) => setJugadores(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-24 rounded border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary text-center transition-colors hover:border-text-primary focus:border-text-primary focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        </div>

        {/* Checkbox delegado */}
        <label
          className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors mb-6 ${
            delegado ? "bg-surface-secondary" : ""
          }`}
        >
          <input
            type="checkbox"
            checked={delegado}
            onChange={(e) => setDelegado(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-surface-secondary"
          />
          <div>
            <span className={`font-body text-sm font-semibold ${delegado ? "text-text-invert" : "text-text-primary"}`}>
              Asignar un delegado a cada equipo.
            </span>
            {delegado && (
              <p className={`font-body text-xs mt-0.5 ${delegado ? "text-text-invert/70" : "text-text-secondary"}`}>
                Permite agregar jugadores por equipo
              </p>
            )}
          </div>
        </label>

        {/* Costos del torneo */}
        <h2 className="font-heading text-base font-bold text-text-primary mb-4">
          Costos del torneo
        </h2>

        <div className="flex flex-col gap-4 mb-6">
          <div>
            <label className="block font-body text-sm text-text-primary mb-2">
              Costo de inscripción
            </label>
            <input
              type="text"
              placeholder="Ejemplo: S/100"
              value={costoInscripcion}
              onChange={(e) => setCostoInscripcion(e.target.value)}
              className="w-full rounded border border-transparent bg-btn-regular px-3 py-3 font-body text-sm text-text-primary placeholder:text-text-primary/60 transition-colors hover:border-border-primary hover:bg-surface-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-body text-sm text-text-primary mb-2">
              Costo de arbitraje por partido (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ejemplo: S/40 por equipo"
              value={costoArbitraje}
              onChange={(e) => setCostoArbitraje(e.target.value)}
              className="w-full rounded border border-transparent bg-btn-regular px-3 py-3 font-body text-sm text-text-primary placeholder:text-text-primary/60 transition-colors hover:border-border-primary hover:bg-surface-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Descripción de las bases */}
        <h2 className="font-heading text-base font-bold text-text-primary mb-4">
          Descripción de las bases
        </h2>

        <button
          onClick={() => setShowCondicionModal(true)}
          className="flex w-full items-center justify-between rounded border border-transparent bg-btn-regular px-3 py-3 cursor-pointer mb-3 transition-colors hover:border-border-primary hover:bg-surface-primary"
        >
          <span className="font-body text-sm text-text-primary/60">
            Agregar una condición
          </span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-primary">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {condiciones.length > 0 && (
          <button
            onClick={() => setShowBasesList(true)}
            className="flex items-center justify-between w-full py-2 cursor-pointer"
          >
            <span className="font-body text-sm font-semibold text-text-primary underline">
              Ver condiciones agregadas
            </span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-primary">
              <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {/* Bottom actions */}
        <div className="mt-auto pt-6 flex flex-col gap-3">
          <button
            onClick={handleCrearTorneo}
            className="w-full rounded-lg bg-surface-secondary py-3.5 font-heading text-sm font-bold text-text-invert hover:bg-brand-700 transition-colors cursor-pointer"
          >
            Crear torneo
          </button>
          <button
            onClick={() => router.push("/torneos")}
            className="w-full py-3 font-heading text-sm font-semibold text-text-primary cursor-pointer"
          >
            Omitir este paso
          </button>
        </div>
      </div>

      <CondicionModal
        open={showCondicionModal}
        onClose={() => setShowCondicionModal(false)}
        onSave={handleAddCondicion}
      />

      <BasesListModal
        open={showBasesList}
        condiciones={condiciones}
        showToast={torneoCreado}
        onClose={() => {
          setShowBasesList(false);
          if (torneoCreado) router.push("/torneos");
        }}
        onEdit={handleEditCondicion}
      />
    </MobileShell>
  );
}
