"use client";

import { useState } from "react";
import type { MatchListItem } from "@/_lib/api";
import { formatMatchDate, UNSCHEDULED_LABEL } from "@/_lib/match-format";
import { buildFixtureTabs, currentTabKey, groupByDay, matchesOfTab, tabKeyFromSearch, withTabParam } from "@/_lib/fixture";
import { MatchRow } from "@/_components/match-row";
import { Tabs } from "@/_components/tabs";

/**
 * Lista de partidos de un torneo, organizada por fecha — como se armó el fixture — y, dentro de
 * cada fecha, por día ("Sáb 10 Oct"), con el partido de cada día en orden de hora. La usan el
 * fan, el jugador, el club y el organizador, para que las cuatro vistas muestren la misma
 * estructura en vez de cada una su propia lista.
 *
 * - Las fechas se eligen con pestañas (`Tabs`; con muchas, la barra se desplaza y la elegida queda a la vista).
 * - Los partidos de un cuadro de eliminación van en sus propias rondas (Octavos, Cuartos,
 *   Semifinal, Final), después de las fechas.
 * - Se abre en la fecha "actual": la primera que todavía tiene partidos por jugar.
 */
export function FixtureTabs({
  matches,
  hrefFor,
  highlightClubId,
  onEdit,
  onAdd,
  syncUrl = false,
}: {
  matches: MatchListItem[];
  /** A la ficha de cada partido. Si no se pasa, la fila se muestra igual pero sin link. */
  hrefFor?: (match: MatchListItem) => string;
  /** Si se pasa, resalta (fondo) los partidos donde juega este club. */
  highlightClubId?: string;
  /** Si se pasa (el organizador), los partidos que todavía no empezaron muestran un botón para editarlos. */
  onEdit?: (match: MatchListItem) => void;
  /** Si se pasa (el organizador), un botón «+» queda fijo a la derecha de la fila de fechas para agregar un partido, siempre a mano. */
  onAdd?: () => void;
  /** La fecha elegida va en la URL (`?fecha=5`, `?ronda=2`): se puede compartir y sobrevive a recargar. */
  syncUrl?: boolean;
}) {
  const tabs = buildFixtureTabs(matches);
  const [pickedKey, setPickedKey] = useState<string | null>(() => (syncUrl && typeof window !== "undefined" ? tabKeyFromSearch(window.location.search) : null));

  function pick(key: string) {
    setPickedKey(key);
    if (syncUrl) {
      const query = withTabParam(window.location.search.slice(1), key);
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    }
  }

  const activeKey = tabs.some((t) => t.key === pickedKey) ? pickedKey : currentTabKey(tabs, matches);
  const active = tabs.find((t) => t.key === activeKey) ?? tabs[0];

  const addButton = onAdd && (
    <button
      type="button"
      onClick={onAdd}
      aria-label="Agregar partido"
      className="mb-3 inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border-primary px-0 font-heading text-xs font-semibold text-text-primary transition-colors hover:bg-btn-regular focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary cancha:font-body cancha:font-bold sm:px-4"
    >
      <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
      <span className="hidden sm:inline">Agregar partido</span>
    </button>
  );

  if (matches.length === 0) {
    return (
      <div>
        {addButton && <div className="flex justify-end px-4">{addButton}</div>}
        <p className="px-4 py-8 text-center font-body text-sm text-text-secondary">Todavía no hay partidos programados.</p>
      </div>
    );
  }

  const sections = groupByDay(matchesOfTab(matches, active));

  return (
    <div>
      {addButton ? (
        // El «+» va fuera de la barra que se desplaza: queda fijo a la derecha, después de la última fecha.
        <div className="flex items-start gap-2 pr-4">
          <div className="min-w-0 flex-1">
            {tabs.length > 1 && <Tabs tabs={tabs} value={active.key} onChange={pick} label="Fechas del torneo" className="pl-4 pb-3" />}
          </div>
          {addButton}
        </div>
      ) : (
        tabs.length > 1 && <Tabs tabs={tabs} value={active.key} onChange={pick} label="Fechas del torneo" />
      )}

      <div className="flex flex-col gap-4 px-4">
        {sections.map((section) => (
          <section key={section.key} aria-label={section.date ? formatMatchDate(section.date) : UNSCHEDULED_LABEL} className="@container overflow-hidden rounded-xl border border-border-primary">
            <h3 className="bg-btn-regular px-4 py-2 font-heading text-xs cancha:text-sm font-bold text-text-primary">
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
