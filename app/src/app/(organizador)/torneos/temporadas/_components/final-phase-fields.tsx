"use client";

import { FINAL_FORMATS, FINAL_FORMAT_LABEL, finalTeamsOptions, type FinalFormat } from "@/_lib/season";
import { chipClass, labelClass } from "./season-ui";

const FINAL_FORMAT_HELP: Record<FinalFormat, string> = {
  llaves: "Eliminación directa entre los mejores de la General: el 1.º contra el último, el 2.º contra el penúltimo...",
  liguilla: "Todos contra todos entre los mejores de la General; gana el de más puntos.",
  ninguna: "Gana la temporada quien termine primero en la tabla General.",
};

/**
 * Tipo de fase final y cuántos clasifican, para crear y para editar una temporada. Las opciones de
 * clasificados son las mismas que acepta la API (`finalTeamsOptions`). `maxTeams` es el tope (null =
 * todavía no se eligió la Apertura). `teams` llega ya filtrado: null si la cantidad elegida dejó de valer.
 */
export function FinalPhaseFields({
  finalFormat,
  onFormatChange,
  teams,
  onTeamsChange,
  maxTeams,
}: {
  finalFormat: FinalFormat;
  onFormatChange: (format: FinalFormat) => void;
  teams: number | null;
  onTeamsChange: (n: number) => void;
  maxTeams: number | null;
}) {
  const options = maxTeams === null ? [] : finalTeamsOptions(finalFormat, maxTeams);
  return (
    <>
      <fieldset>
        <legend className={labelClass}>Fase final</legend>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Tipo de fase final">
          {FINAL_FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={finalFormat === f}
              aria-label={`${FINAL_FORMAT_LABEL[f]}. ${FINAL_FORMAT_HELP[f]}`}
              onClick={() => onFormatChange(f)}
              className={`flex cursor-pointer items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary ${
                finalFormat === f ? "border-text-primary bg-btn-regular" : "border-border-primary hover:bg-btn-regular"
              }`}
            >
              <span>
                <span className="block font-heading text-sm font-bold text-text-primary">{FINAL_FORMAT_LABEL[f]}</span>
                <span className="block font-body text-xs text-text-secondary">{FINAL_FORMAT_HELP[f]}</span>
              </span>
              <span
                aria-hidden="true"
                className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 ${finalFormat === f ? "border-text-primary bg-text-primary" : "border-border-primary"}`}
              />
            </button>
          ))}
        </div>
      </fieldset>

      {finalFormat !== "ninguna" && (
        <fieldset>
          <legend className={labelClass}>Equipos que clasifican de la General</legend>
          {maxTeams === null ? (
            <p className="font-body text-sm text-text-secondary">Elige primero la Apertura.</p>
          ) : options.length === 0 ? (
            <p className="font-body text-sm text-text-secondary">
              La temporada no tiene equipos suficientes para {finalFormat === "llaves" ? "unas llaves" : "una liguilla"}.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Equipos que clasifican">
                {options.map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={teams === n} onClick={() => onTeamsChange(n)} className={chipClass(teams === n)}>
                    {n}
                  </button>
                ))}
              </div>
              <p className="mt-2 font-body text-xs text-text-secondary">
                {finalFormat === "llaves" ? "Las llaves necesitan un cuadro parejo: 2, 4, 8 o 16." : "Desde 3 hasta el total de equipos."}
              </p>
            </>
          )}
        </fieldset>
      )}
    </>
  );
}

/** La cantidad elegida, solo si sigue siendo una opción válida (al cambiar el tipo o la Apertura puede dejar de serlo). */
export function validFinalTeams(finalFormat: FinalFormat, finalTeams: number | null, maxTeams: number | null): number | null {
  if (finalTeams === null || maxTeams === null) return null;
  return finalTeamsOptions(finalFormat, maxTeams).includes(finalTeams) ? finalTeams : null;
}
