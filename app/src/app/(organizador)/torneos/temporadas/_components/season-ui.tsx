"use client";

import Link from "next/link";
import type { SeasonSummary } from "@/_lib/api";
import { SEASON_STAGES, SEASON_STATUS_LABEL, STAGE_LABEL, type SeasonStatus } from "@/_lib/season";
import { ClubCrest } from "@/_components/club-crest";

/** Campo de texto o fecha del Crono DS (el mismo del asistente "Crear torneo"). */
export const fieldClass =
  "w-full rounded border border-transparent bg-btn-regular px-3 py-3 font-body text-sm text-text-primary placeholder:text-text-primary/60 transition-colors hover:border-border-primary hover:bg-surface-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none";

export const labelClass = "mb-2 block font-heading text-sm font-semibold text-text-primary";

/** Opción elegible en forma de botón (los clasificados, como "Equipos que clasifican a las llaves"). */
export function chipClass(selected: boolean) {
  return `h-11 min-w-11 cursor-pointer rounded-lg border px-3 font-heading text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary ${
    selected ? "border-border-primary bg-surface-secondary text-text-invert" : "border-border-primary text-text-primary hover:bg-btn-regular"
  }`;
}

const STATUS_TONE: Record<SeasonStatus, string> = {
  apertura: "bg-brand-200 text-text-primary",
  clausura: "bg-brand-200 text-text-primary",
  final_pendiente: "bg-yellow text-text-primary",
  final: "bg-brand-200 text-text-primary",
  terminada: "bg-verification text-text-primary",
};

export function SeasonStatusChip({ status }: { status: SeasonStatus }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-heading text-[10px] font-bold ${STATUS_TONE[status]}`}>
      {SEASON_STATUS_LABEL[status]}
    </span>
  );
}

/** Una fila por etapa (Apertura, Clausura, fase final): su torneo, su estado y su campeón. */
export function SeasonStages({ season, linkTournaments = false }: { season: SeasonSummary; linkTournaments?: boolean }) {
  const stages = SEASON_STAGES.filter((stage) => stage !== "final" || season.finalFormat !== "ninguna");
  return (
    <ol className="flex flex-col">
      {stages.map((stage) => {
        const t = season.tournaments.find((x) => x.stage === stage);
        const detail = !t ? "Pendiente" : t.status === "finalizado" ? "Terminado" : t.status === "en_curso" ? "En juego" : "Por empezar";
        const body = (
          <>
            <span
              aria-hidden="true"
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-heading text-[10px] font-bold ${
                t?.status === "finalizado" ? "bg-verification text-text-primary" : t ? "bg-surface-secondary text-text-invert" : "border border-border-primary text-text-secondary"
              }`}
            >
              {SEASON_STAGES.indexOf(stage) + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-heading text-sm font-bold text-text-primary">{STAGE_LABEL[stage]}</span>
              <span className="block truncate font-body text-xs text-text-secondary">{t ? `${t.name} · ${detail}` : detail}</span>
            </span>
            {t?.champion && (
              <span className="flex min-w-0 shrink items-center gap-1.5 rounded-full border border-yellow bg-yellow/20 py-0.5 pr-2.5 pl-0.5">
                <ClubCrest club={t.champion} size="h-5 w-5" textSize="text-[7px]" />
                <span className="truncate font-heading text-[11px] font-semibold text-text-primary">
                  Campeón <span className="font-bold">{t.champion.shortName || t.champion.name}</span>
                </span>
              </span>
            )}
          </>
        );
        return (
          <li key={stage} className="border-b border-brand-200 last:border-0">
            {t && linkTournaments ? (
              <Link href={`/torneos/${t.id}`} className="flex min-h-14 items-center gap-3 py-2.5 transition-colors hover:bg-btn-regular">
                {body}
              </Link>
            ) : (
              <div className="flex min-h-14 items-center gap-3 py-2.5">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
