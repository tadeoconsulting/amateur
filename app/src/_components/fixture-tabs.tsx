"use client";

import { useState } from "react";
import type { MatchListItem } from "@/_lib/api";
import { dayRangeLabel, formatMatchDate, UNSCHEDULED_LABEL } from "@/_lib/match-format";
import { STEPPER_FROM, buildFixtureTabs, currentTabKey, groupByDay, matchesOfTab } from "@/_lib/fixture";
import { MatchRow } from "@/_components/match-row";

/**
 * Lista de partidos de un torneo, organizada por fecha — como se armó el fixture — y, dentro de
 * cada fecha, por día ("Sáb 10 Oct"), con el partido de cada día en orden de hora. La usan el
 * fan, el jugador, el club y el organizador, para que las cuatro vistas muestren la misma
 * estructura en vez de cada una su propia lista.
 *
 * - Con pocas fechas (hasta 4) se eligen con pestañas; con más (desde `STEPPER_FROM`), con flechas
 *   anterior/siguiente y un selector para saltar a cualquiera, mostrando los días que abarca.
 * - Los partidos de un cuadro de eliminación van en sus propias rondas (Octavos, Cuartos,
 *   Semifinal, Final), después de las fechas.
 * - Se abre en la fecha "actual": la primera que todavía tiene partidos por jugar.
 */
export function FixtureTabs({
  matches,
  hrefFor,
  highlightClubId,
  onEdit,
}: {
  matches: MatchListItem[];
  /** Si no se pasa (vista pública de un fan), la fila se muestra igual pero sin link. */
  hrefFor?: (match: MatchListItem) => string;
  /** Si se pasa, resalta (fondo) los partidos donde juega este club. */
  highlightClubId?: string;
  /** Si se pasa (el organizador), los partidos que todavía no empezaron muestran un botón para editarlos. */
  onEdit?: (match: MatchListItem) => void;
}) {
  const tabs = buildFixtureTabs(matches);
  const [pickedKey, setPickedKey] = useState<string | null>(null);

  if (matches.length === 0) {
    return <p className="px-4 py-8 text-center font-body text-sm text-text-secondary">Todavía no hay partidos programados.</p>;
  }

  const activeKey = tabs.some((t) => t.key === pickedKey) ? pickedKey : currentTabKey(tabs, matches);
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === activeKey));
  const active = tabs[activeIndex];
  const tabMatches = matchesOfTab(matches, active);
  const sections = groupByDay(tabMatches);
  const useStepper = tabs.length >= STEPPER_FROM;
  const range = dayRangeLabel(tabMatches);

  const arrowClass =
    "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border-primary text-text-primary transition-colors hover:bg-btn-regular focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div>
      {tabs.length > 1 && !useStepper && (
        <div role="tablist" aria-label="Fechas del torneo" className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={active.key === tab.key}
              onClick={() => setPickedKey(tab.key)}
              className={`min-h-11 shrink-0 cursor-pointer rounded-lg px-4 py-2 font-heading text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary ${
                active.key === tab.key ? "bg-surface-secondary text-text-invert" : "border border-border-primary text-text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {tabs.length > 1 && useStepper && (
        <div role="group" aria-label="Fechas del torneo" className="flex items-center justify-between gap-3 px-4 pb-3">
          <button type="button" aria-label="Fecha anterior" disabled={activeIndex === 0} onClick={() => setPickedKey(tabs[activeIndex - 1].key)} className={arrowClass}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12.5 15L7.5 10l5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="min-w-0 flex-1 text-center">
            <label className="relative mx-auto block w-fit max-w-full">
              <span className="sr-only">Ir a una fecha</span>
              <select
                value={active.key}
                onChange={(e) => setPickedKey(e.target.value)}
                className="max-w-full cursor-pointer appearance-none truncate rounded-lg bg-transparent py-1 pl-2 pr-6 font-heading text-sm font-bold text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
              >
                {tabs.map((tab) => (
                  <option key={tab.key} value={tab.key}>
                    {tab.label}
                  </option>
                ))}
              </select>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-text-secondary">
                <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </label>
            <p aria-live="polite" className="truncate font-body text-xs text-text-secondary">
              {range ?? `${UNSCHEDULED_LABEL} · ${activeIndex + 1} de ${tabs.length}`}
            </p>
          </div>
          <button type="button" aria-label="Fecha siguiente" disabled={activeIndex === tabs.length - 1} onClick={() => setPickedKey(tabs[activeIndex + 1].key)} className={arrowClass}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 px-4">
        {sections.map((section) => (
          <section key={section.key} aria-label={section.date ? formatMatchDate(section.date) : UNSCHEDULED_LABEL} className="overflow-hidden rounded-xl border border-border-primary">
            <h3 className="bg-btn-regular px-4 py-2 font-heading text-xs font-bold text-text-primary">
              {section.date ? formatMatchDate(section.date) : UNSCHEDULED_LABEL}
            </h3>
            {section.matches.map((match, i) => (
              <MatchRow
                key={match.id}
                match={match}
                first={i === 0}
                href={hrefFor?.(match)}
                mine={highlightClubId != null && (match.homeTeam?.id === highlightClubId || match.awayTeam?.id === highlightClubId)}
                onEdit={onEdit}
              />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
