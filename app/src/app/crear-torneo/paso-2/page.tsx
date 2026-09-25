"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/_components/mobile-shell";
import { StepIndicator } from "../_components/step-indicator";
import { ModalidadModal } from "../_components/modalidad-modal";
import { CompetenciaModal } from "../_components/competencia-modal";
import { useWizard } from "../_components/wizard-context";

export default function CrearTorneoPaso2Page() {
  const router = useRouter();
  const { state, update, tournamentId, basePath, exitHref } = useWizard();
  const editing = tournamentId !== null;
  const { modalidad, tipoCompetencia, genero, categoria, cantidadEquipos } = state;
  const [showCompetencia, setShowCompetencia] = useState(false);
  const [showModalidad, setShowModalidad] = useState(false);

  const setModalidad = (value: string) => update({ modalidad: value });
  const setTipoCompetencia = (value: string) => update({ tipoCompetencia: value });
  const setGenero = (value: string) => update({ genero: value });
  const setCategoria = (value: string) => update({ categoria: value });
  const setCantidadEquipos = (value: number) => update({ cantidadEquipos: value });

  // Modalidad, tipo de competencia y al menos 2 equipos: sin eso no se puede armar el torneo.
  const canContinue = modalidad !== "" && tipoCompetencia !== "" && cantidadEquipos >= 2;

  function handleContinuar() {
    router.push(`${basePath}/paso-3`);
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

      <div className="flex flex-1 flex-col px-4 pb-6">
        <StepIndicator current={2} total={3} />

        {/* Titles */}
        <p className="font-heading text-sm font-semibold text-text-secondary mb-1">
          {editing ? "Edita tu torneo" : "Crea tu primer torneo"}
        </p>
        <h1 className="font-heading text-[22px] font-bold text-text-primary leading-tight mb-8">
          Define la modalidad
        </h1>

        {/* Form */}
        <div className="flex flex-col gap-6 flex-1">
          {/* Modalidad del torneo */}
          <div>
            <label className="block font-heading text-sm font-semibold text-text-primary mb-2">
              Modalidad del torneo
            </label>
            <button
              onClick={() => setShowModalidad(true)}
              className="flex w-full items-center rounded border border-transparent bg-btn-regular px-3 py-3 text-left cursor-pointer transition-colors hover:border-border-primary hover:bg-surface-primary"
            >
              <span className={`flex-1 font-body text-sm ${modalidad ? "text-text-primary" : "text-text-primary/60"}`}>
                {modalidad || "Elige una opción"}
              </span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-secondary ml-2 shrink-0">
                <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Tipo de competencia */}
          <div>
            <label className="block font-heading text-sm font-semibold text-text-primary mb-2">
              Tipo de competencia
            </label>
            <button
              onClick={() => setShowCompetencia(true)}
              className="flex w-full items-center rounded border border-transparent bg-btn-regular px-3 py-3 text-left cursor-pointer transition-colors hover:border-border-primary hover:bg-surface-primary"
            >
              <span className={`flex-1 font-body text-sm ${tipoCompetencia ? "text-text-primary" : "text-text-primary/60"}`}>
                {tipoCompetencia || "Fechas, Relámpago o Liga"}
              </span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-secondary ml-2 shrink-0">
                <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Elige el género */}
          <div>
            <label className="block font-heading text-sm font-semibold text-text-primary mb-2">
              Elige el género
            </label>
            <div className="flex gap-3">
              {["Femenino", "Masculino", "Mixto"].map((g) => (
                <button
                  key={g}
                  onClick={() => setGenero(g)}
                  className={`flex-1 rounded py-2.5 font-heading text-sm font-semibold cursor-pointer transition-colors ${
                    genero === g
                      ? "bg-surface-secondary text-text-invert"
                      : "border border-border-primary text-text-primary hover:bg-btn-regular"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Elige una categoría */}
          <div>
            <label className="block font-heading text-sm font-semibold text-text-primary mb-2">
              Elige una categoría
            </label>
            <div className="flex gap-3">
              {["Definir edad", "Libre", "Master"].map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoria(c)}
                  className={`flex-1 rounded py-2.5 font-heading text-sm font-semibold cursor-pointer transition-colors ${
                    categoria === c
                      ? "bg-surface-secondary text-text-invert"
                      : "border border-border-primary text-text-primary hover:bg-btn-regular"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Cantidad de equipos */}
          <div className="flex items-center justify-between">
            <label className="font-heading text-sm font-semibold text-text-primary">
              Cantidad de equipos en el torneo
            </label>
            <input
              type="number"
              min={0}
              value={cantidadEquipos}
              onChange={(e) => setCantidadEquipos(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-20 rounded border border-transparent bg-btn-regular px-3 py-3 font-body text-sm text-text-primary text-center transition-colors hover:border-border-primary hover:bg-surface-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
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
            onClick={() => router.push(exitHref)}
            className="w-full py-3 font-heading text-sm font-semibold text-text-primary cursor-pointer"
          >
            {editing ? "Cancelar" : "Omitir este paso"}
          </button>
        </div>
      </div>

      <ModalidadModal
        open={showModalidad}
        value={modalidad}
        onClose={() => setShowModalidad(false)}
        onSave={(m) => { setModalidad(m); setShowModalidad(false); }}
      />

      <CompetenciaModal
        open={showCompetencia}
        value={tipoCompetencia}
        onClose={() => setShowCompetencia(false)}
        onSave={(t) => { setTipoCompetencia(t); setShowCompetencia(false); }}
      />
    </MobileShell>
  );
}
