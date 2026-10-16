"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSeasonStage, deleteSeason, getSeason, getSeasonScorers, getSeasonStandings, type SeasonSummary } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { FINAL_FORMAT_LABEL, STAGE_LABEL } from "@/_lib/season";
import { BackHeader } from "@/_components/back-header";
import { btnOutline, btnSolid, btnText } from "@/_components/button-styles";
import { ClubCrest } from "@/_components/club-crest";
import { ScorersList, StandingsTable } from "@/_components/tournament-results";
import { Toast } from "@/_components/toast";
import { SeasonStages, SeasonStatusChip } from "@/_components/season-stages";
import { fieldClass, labelClass } from "../_components/season-ui";

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );
}

/** La página de una temporada para el organizador (especificación 012): etapas, próxima acción, tabla General y goleadores. */
export default function TemporadaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: season, loading, error, refetch } = useApi(() => getSeason(id));
  const { data: standings, refetch: refetchStandings } = useApi(() => getSeasonStandings(id));
  const { data: scorers } = useApi(() => getSeasonScorers(id));
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (loading && !season) return <Spinner />;
  if (error || !season) {
    return (
      <div className="w-full">
        <BackHeader onBack={() => router.push("/torneos?tab=temporadas")} label="Temporadas" />
        <p className="px-4 py-16 text-center font-body text-sm text-text-secondary">No encontramos esta temporada.</p>
      </div>
    );
  }

  const apertura = season.tournaments.find((t) => t.stage === "apertura");
  const qualifyCount = season.finalFormat === "ninguna" ? null : season.finalTeams;

  async function remove() {
    setDeleting(true);
    const result = await deleteSeason(season!.id);
    setDeleting(false);
    if (!result.ok) {
      setConfirmDelete(false);
      setToast({ message: result.error ?? "No se pudo eliminar la temporada", tone: "error" });
      return;
    }
    router.replace("/torneos?tab=temporadas");
  }

  return (
    <div className="w-full pb-10 md:mx-auto md:max-w-3xl">
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
      <BackHeader onBack={() => router.push("/torneos?tab=temporadas")} label="Temporadas" />

      <div className="mx-4 mt-2 rounded-xl bg-surface-secondary px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <h1 className="min-w-0 font-heading text-base font-bold text-text-invert">{season.name}</h1>
          <SeasonStatusChip status={season.status} />
        </div>
        <p className="mt-0.5 font-body text-xs text-brand-500">
          {season.teamsCount} equipos · Fase final: {FINAL_FORMAT_LABEL[season.finalFormat]}
          {season.finalTeams !== null && ` (clasifican ${season.finalTeams})`}
        </p>
      </div>

      {season.champion && (
        <div className="mx-4 mt-3 flex items-center gap-3 rounded-xl border-2 border-yellow bg-yellow/5 px-4 py-3">
          <ClubCrest club={season.champion} size="h-10 w-10" textSize="text-xs" />
          <div className="min-w-0">
            <p className="font-body text-xs text-text-secondary">Campeón de la temporada</p>
            <p className="truncate font-heading text-sm font-bold text-text-primary">{season.champion.name}</p>
          </div>
        </div>
      )}

      {season.finalOutdated && (
        <div role="status" className="mx-4 mt-3 rounded-xl border border-border-primary bg-yellow/20 px-4 py-3">
          <p className="font-body text-sm text-text-primary">
            Se corrigió un resultado después de generar la fase final: la tabla General de hoy ya no da los mismos clasificados. La fase
            final queda como se generó.
          </p>
        </div>
      )}

      <section className="mt-6 px-4" aria-labelledby="etapas">
        <h2 id="etapas" className="mb-1 font-heading text-base font-bold text-text-primary">
          Etapas
        </h2>
        <SeasonStages season={season} hrefFor={(t) => `/torneos/${t.id}`} />
        <NextStep
          season={season}
          aperturaFinished={apertura?.status === "finalizado"}
          onCreated={(stage, tournamentId) => {
            setToast({ message: stage === "clausura" ? "Clausura creado" : "Fase final generada", tone: "success" });
            refetch();
            refetchStandings();
            router.push(`/torneos/${tournamentId}`);
          }}
          onError={(message) => setToast({ message, tone: "error" })}
        />
      </section>

      <section className="mt-8 px-4" aria-labelledby="general">
        <h2 id="general" className="mb-1 font-heading text-base font-bold text-text-primary">
          Tabla General
        </h2>
        <p className="mb-3 font-body text-xs text-text-secondary">
          Suma la Apertura y el Clausura. No cuentan las llaves de cada torneo ni la fase final.
          {qualifyCount !== null && ` Los ${qualifyCount} primeros clasifican a la fase final.`}
        </p>
        {standings && standings.length > 0 ? (
          <StandingsTable standings={standings} qualifyCount={qualifyCount} qualifyLabel="la fase final" />
        ) : (
          <p className="font-body text-sm text-text-secondary">Todavía no hay partidos jugados.</p>
        )}
      </section>

      <section className="mt-8 px-4" aria-labelledby="goleadores">
        <h2 id="goleadores" className="mb-3 font-heading text-base font-bold text-text-primary">
          Goleador general
        </h2>
        {scorers && scorers.length > 0 ? (
          <ScorersList scorers={scorers} />
        ) : (
          <p className="font-body text-sm text-text-secondary">Todavía no hay goles registrados.</p>
        )}
      </section>

      <section className="mt-10 px-4">
        {confirmDelete ? (
          <div className="rounded-xl border border-border-primary p-4">
            <p className="font-body text-sm text-text-primary">
              ¿Eliminar la temporada? Sus torneos no se borran: quedan como torneos sueltos, con sus partidos y resultados.
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={remove} disabled={deleting} className={`${btnSolid} flex-1`}>
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className={`${btnOutline} flex-1`}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className={`${btnText} w-full`}>
            Eliminar temporada
          </button>
        )}
      </section>
    </div>
  );
}

/**
 * Lo próximo que toca: crear el Clausura (con la Apertura terminada) o generar la fase final (con el
 * Clausura terminado). Mientras no se pueda, dice qué falta.
 */
function NextStep({
  season,
  aperturaFinished,
  onCreated,
  onError,
}: {
  season: SeasonSummary;
  aperturaFinished: boolean;
  onCreated: (stage: "clausura" | "final", tournamentId: string) => void;
  onError: (message: string) => void;
}) {
  const [startDate, setStartDate] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const stage: "clausura" | "final" | null =
    season.status === "apertura" && aperturaFinished ? "clausura" : season.status === "final_pendiente" ? "final" : null;

  if (!stage) {
    const waiting =
      season.status === "apertura"
        ? "El Clausura se crea cuando termine la Apertura."
        : season.status === "clausura" && season.finalFormat !== "ninguna"
          ? "La fase final se genera cuando termine el Clausura."
          : null;
    return waiting ? <p className="mt-3 font-body text-sm text-text-secondary">{waiting}</p> : null;
  }

  async function create() {
    if (!stage || !startDate || saving) return;
    setSaving(true);
    const result = await createSeasonStage(season.id, stage, { startDate, ...(name.trim() ? { name: name.trim() } : {}) });
    setSaving(false);
    if (!result.ok) {
      onError(result.error ?? "No se pudo completar la acción");
      return;
    }
    onCreated(stage, result.data.tournamentId);
  }

  const title = stage === "clausura" ? "Crear el Clausura" : "Generar la fase final";
  const help =
    stage === "clausura"
      ? "Se crea con los mismos equipos y la misma configuración de la Apertura. Después armas su fixture como siempre."
      : `Entran los ${season.finalTeams} primeros de la tabla General${season.finalFormat === "llaves" ? ", cruzados mejor contra peor" : ""}. Después armas su fixture como siempre.`;

  return (
    <form
      className="mt-4 rounded-xl border border-border-primary p-4"
      onSubmit={(e) => {
        e.preventDefault();
        create();
      }}
    >
      <h3 className="font-heading text-sm font-bold text-text-primary">{title}</h3>
      <p className="mt-1 mb-4 font-body text-xs text-text-secondary">{help}</p>
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="stage-date" className={labelClass}>
            Fecha de inicio
          </label>
          <input id="stage-date" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="stage-name" className={labelClass}>
            Nombre <span className="font-normal text-text-secondary">(opcional)</span>
          </label>
          <input
            id="stage-name"
            type="text"
            maxLength={120}
            placeholder={stage === "clausura" ? "Clausura y el año de la Apertura" : `${season.name} · ${STAGE_LABEL.final}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
          />
        </div>
        <button type="submit" disabled={!startDate || saving} className={`${btnSolid} w-full`}>
          {saving ? "Un momento..." : title}
        </button>
      </div>
    </form>
  );
}
