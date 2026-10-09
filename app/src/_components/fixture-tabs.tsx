"use client";

import { useState } from "react";
import type { MatchListItem } from "@/_lib/api";
import { formatMatchDate, UNSCHEDULED_LABEL } from "@/_lib/match-format";
import { buildFixtureTabs, currentTabKey, groupByDay, matchesOfTab } from "@/_lib/fixture";
import { MatchRow } from "@/_components/match-row";
import { PillTabs } from "@/_components/pill-tabs";

/**
 * Lista de partidos de un torneo, organizada por fecha — como se armó el fixture — y, dentro de
 * cada fecha, por día ("Sáb 10 Oct"), con el partido de cada día en orden de hora. La usan el
 * fan, el jugador, el club y el organizador, para que las cuatro vistas muestren la misma
 * estructura en vez de cada una su propia lista.
 *
 * - Las fechas se eligen con pestañas (`PillTabs`; con muchas, la barra se desplaza y la elegida queda a la vista).
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

  const activeKey = tabs.some((t) => t.key === pickedKey) ? pickedKey : currentTabKey(tabs, matches);
  const active = tabs.find((t) => t.key === activeKey) ?? tabs[0];

  if (matches.length === 0) {
    return <p className="px-4 py-8 text-center font-body text-sm text-text-secondary">Todavía no hay partidos programados.</p>;
  }

  const sections = groupByDay(matchesOfTab(matches, active));

  return (
    <div>
      {tabs.length > 1 && <PillTabs tabs={tabs} value={active.key} onChange={setPickedKey} label="Fechas del torneo" />}

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
