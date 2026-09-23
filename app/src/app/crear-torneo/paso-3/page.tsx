"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/_components/mobile-shell";
import { StepIndicator } from "../_components/step-indicator";
import { CondicionModal } from "../_components/condicion-modal";
import { BasesListModal } from "../_components/bases-list-modal";
import { useWizard } from "../_components/wizard-context";
import { formatFromCompetitionLabel } from "@/_lib/tournament-labels";

export default function CrearTorneoPaso3Page() {
  const router = useRouter();
  const { state, update } = useWizard();
  const { minutos, jugadores, delegado, costoInscripcion, costoArbitraje, condiciones, tiempoExtra, clasificanPorGrupo } = state;
  const format = formatFromCompetitionLabel(state.tipoCompetencia);
  // El tiempo extra y los penales solo existen en un cuadro de eliminación (especificación 007).
  const esEliminatorio = format === "eliminacion" || format === "relampago" || format === "copa";
  const [showCondicionModal, setShowCondicionModal] = useState(false);
  const [showBasesList, setShowBasesList] = useState(false);
  const [torneoCreado, setTorneoCreado] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setMinutos = (value: number) => update({ minutos: value });
  const setJugadores = (value: number) => update({ jugadores: value });
  const setDelegado = (value: boolean) => update({ delegado: value });
  const setCostoInscripcion = (value: string) => update({ costoInscripcion: value });
  const setCostoArbitraje = (value: string) => update({ costoArbitraje: value });
  const setTiempoExtra = (value: number) => update({ tiempoExtra: value });
  const setClasificanPorGrupo = (value: number) => update({ clasificanPorGrupo: value });

  async function handleCrearTorneo() {
    if (saving || torneoCreado) return;

    // Lo que faltó completar en los pasos anteriores (por ejemplo si se abrió este paso directo).
    const missing = [
      !state.nombre.trim() && "nombre",
      !state.fecha && "fecha de inicio",
      !state.sede && "sede",
      !state.modalidad && "modalidad",
      !state.tipoCompetencia && "tipo de competencia",
      state.cantidadEquipos < 2 && "cantidad de equipos (mínimo 2)",
    ].filter(Boolean);
    if (missing.length > 0) {
      setError(`Falta completar: ${missing.join(", ")}. Vuelve a los pasos anteriores.`);
      return;
    }

    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.nombre.trim(),
          startDate: state.fecha,
          location: `${state.sede!.nombre}, ${state.sede!.direccion}`,
          format: formatFromCompetitionLabel(state.tipoCompetencia),
          maxTeams: state.cantidadEquipos,
          modality: state.modalidad,
          gender: state.genero || null,
          category: state.categoria || null,
          // 0 en el formulario significa "sin definir".
          minutesPerHalf: state.minutos > 0 ? state.minutos : null,
          playersPerTeam: state.jugadores > 0 ? state.jugadores : null,
          assignDelegates: state.delegado,
          registrationFee: state.costoInscripcion.trim() || null,
          refereeFee: state.costoArbitraje.trim() || null,
          rules: state.condiciones,
          // Solo tienen efecto en un cuadro de eliminación (eliminacion/relampago/copa).
          extraTimeMinutes: esEliminatorio && state.tiempoExtra > 0 ? state.tiempoExtra : null,
          groupsAdvancePerGroup: format === "copa" ? state.clasificanPorGrupo : null,
          // Un torneo recién creado queda abierto para inscribir equipos.
          status: "inscripcion",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear el torneo");
        return;
      }
      setCreatedId(data.id);
      setTorneoCreado(true);
      setShowBasesList(true);
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  function handleAddCondicion(texto: string) {
    update({ condiciones: [...condiciones, texto] });
    setShowCondicionModal(false);
  }

  function handleEditCondicion(index: number, newText: string) {
    update({ condiciones: condiciones.map((c, i) => (i === index ? newText : c)) });
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

          {esEliminatorio && (
            <div className="flex items-center justify-between">
              <span className="font-body text-sm text-text-primary leading-snug max-w-[55%]">
                Minutos de cada tiempo extra (si hay empate)
              </span>
              <input
                type="number"
                min={0}
                value={tiempoExtra}
                onChange={(e) => setTiempoExtra(Math.max(0, parseInt(e.target.value) || 0))}
                aria-describedby="tiempo-extra-ayuda"
                className="w-24 rounded border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary text-center transition-colors hover:border-text-primary focus:border-text-primary focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          )}
          {esEliminatorio && (
            <p id="tiempo-extra-ayuda" className="-mt-2 font-body text-xs text-text-secondary">
              Si el partido sigue empatado, se juega a tiempo extra y, de seguir igual, a penales. Déjalo en 0 para usar 15 minutos por tiempo.
            </p>
          )}
        </div>

        {format === "copa" && (
          <div className="mb-6">
            <h2 className="font-heading text-base font-bold text-text-primary mb-4">
              Cuadro de eliminación
            </h2>
            <div className="flex items-center justify-between">
              <span className="font-body text-sm text-text-primary leading-snug max-w-[55%]">
                Equipos que clasifican por grupo
              </span>
              <div className="flex gap-2" role="radiogroup" aria-label="Equipos que clasifican por grupo">
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={clasificanPorGrupo === n}
                    onClick={() => setClasificanPorGrupo(n)}
                    className={`h-11 w-11 cursor-pointer rounded-lg border font-heading text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary ${
                      clasificanPorGrupo === n
                        ? "border-border-primary bg-surface-secondary text-text-invert"
                        : "border-border-primary text-text-primary hover:bg-btn-regular"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-2 font-body text-xs text-text-secondary">
              Cuando termine la fase de grupos, arman el cuadro con los mejores de cada grupo.
            </p>
          </div>
        )}

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
          {error && <p className="font-body text-sm text-red-600">{error}</p>}
          <button
            onClick={handleCrearTorneo}
            disabled={saving || torneoCreado}
            className="w-full rounded-lg bg-surface-secondary py-3.5 font-heading text-sm font-bold text-text-invert hover:bg-brand-700 transition-colors cursor-pointer disabled:opacity-40"
          >
            {saving ? "Creando..." : "Crear torneo"}
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
          // Al terminar se va al torneo nuevo, que es donde se agregan los equipos.
          if (torneoCreado) router.push(createdId ? `/torneos/${createdId}` : "/torneos");
        }}
        onEdit={handleEditCondicion}
      />
    </MobileShell>
  );
}
