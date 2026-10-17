"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSeason, getTournament, updateSeason, type SeasonSummary } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { FINAL_FORMAT_LABEL, type FinalFormat } from "@/_lib/season";
import { BackHeader } from "@/_components/back-header";
import { btnOutline, btnSolid } from "@/_components/button-styles";
import { fieldClass, labelClass } from "../../_components/season-ui";
import { FinalPhaseFields, validFinalTeams } from "../../_components/final-phase-fields";

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );
}

/**
 * Editar una temporada (especificación 012): el nombre siempre; el tipo de fase final y cuántos clasifican,
 * solo mientras la fase final no esté generada (después la API responde 409). El tope de clasificados es el
 * mismo que valida la API: con el Clausura creado, los equipos de la temporada; antes, el cupo de la Apertura.
 */
export default function EditarTemporadaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: season, error } = useApi(() => getSeason(id));
  const back = () => router.push(`/torneos/temporadas/${id}`);

  if (error) {
    return (
      <div className="w-full">
        <BackHeader onBack={() => router.push("/torneos?tab=temporadas")} label="Temporadas" />
        <p className="px-4 py-16 text-center font-body text-sm text-text-secondary">No encontramos esta temporada.</p>
      </div>
    );
  }
  if (!season) return <Spinner />;
  return <EditForm season={season} onBack={back} onSaved={back} />;
}

function EditForm({ season, onBack, onSaved }: { season: SeasonSummary; onBack: () => void; onSaved: () => void }) {
  const apertura = season.tournaments.find((t) => t.stage === "apertura");
  const hasClausura = season.tournaments.some((t) => t.stage === "clausura");
  const finalLocked = season.tournaments.some((t) => t.stage === "final");
  // El cupo de la Apertura solo importa mientras sus equipos todavía pueden cambiar.
  const { data: aperturaDetail } = useApi(() => (apertura && !hasClausura ? getTournament(apertura.id) : Promise.resolve(null)));

  const [name, setName] = useState(season.name);
  const [finalFormat, setFinalFormat] = useState<FinalFormat>(season.finalFormat);
  const [finalTeams, setFinalTeams] = useState<number | null>(season.finalTeams);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const maxTeams = hasClausura ? season.teamsCount : aperturaDetail ? Math.max(aperturaDetail.maxTeams ?? 0, season.teamsCount) : null;
  const teams = validFinalTeams(finalFormat, finalTeams, maxTeams);
  const needsTeams = finalFormat !== "ninguna";
  const configChanged = finalFormat !== season.finalFormat || (needsTeams ? teams !== season.finalTeams : season.finalTeams !== null);
  const nameChanged = name.trim() !== season.name;
  const configValid = finalLocked || !needsTeams || teams !== null;
  const canSave = name.trim().length > 0 && (nameChanged || (!finalLocked && configChanged)) && configValid && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setError("");
    const result = await updateSeason(season.id, {
      ...(nameChanged ? { name: name.trim() } : {}),
      ...(!finalLocked && configChanged ? { finalFormat, finalTeams: needsTeams ? teams : null } : {}),
    });
    if (!result.ok) {
      setSaving(false);
      setError(result.error ?? "No se pudieron guardar los cambios");
      return;
    }
    onSaved();
  }

  return (
    <div className="w-full pb-10 md:mx-auto md:max-w-xl">
      <BackHeader onBack={onBack} label={season.name} />
      <div className="px-4">
        <h1 className="mb-6 font-heading text-xl font-bold text-text-primary">Editar temporada</h1>

        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div>
            <label htmlFor="season-name" className={labelClass}>
              Nombre de la temporada
            </label>
            <input id="season-name" type="text" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
            <p className="mt-2 font-body text-xs text-text-secondary">El enlace público no cambia al renombrarla.</p>
          </div>

          {finalLocked ? (
            <div className="rounded-xl border border-border-primary p-4">
              <p className="font-heading text-sm font-bold text-text-primary">
                Fase final: {FINAL_FORMAT_LABEL[season.finalFormat]}
                {season.finalTeams !== null && ` (clasifican ${season.finalTeams})`}
              </p>
              <p className="mt-1 font-body text-xs text-text-secondary">
                La fase final ya está generada: su tipo y cuántos clasifican ya no se pueden cambiar.
              </p>
            </div>
          ) : (
            <FinalPhaseFields finalFormat={finalFormat} onFormatChange={setFinalFormat} teams={teams} onTeamsChange={setFinalTeams} maxTeams={maxTeams} />
          )}

          {error && (
            <p role="alert" className="font-body text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button type="submit" disabled={!canSave} className={`${btnSolid} w-full`}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            <button type="button" onClick={onBack} className={`${btnOutline} w-full`}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
