"use client";

import Link from "next/link";
import { useState } from "react";
import type { MatchListItem } from "@/_lib/api";
import { formatMatchDate, formatTime12, UNSCHEDULED_LABEL } from "@/_lib/match-format";
import { isUnscheduled } from "@/_lib/fixture";
import { ClubCrest } from "@/_components/club-crest";

/**
 * Lista de partidos de un torneo, organizada en tabs "Fecha N" — como se armó el fixture —
 * y, dentro de cada fecha, sub-agrupada por grupo cuando el torneo los tiene. La usan tanto
 * el organizador como el club, para que las dos vistas muestren la misma estructura en vez
 * de cada una su propia lista plana.
 *
 * Cada partido en juego se marca "En vivo" en lugar de su hora programada, sin importar en
 * qué pantalla aparezca.
 */
export function FixtureTabs({
  matches,
  hrefFor,
  highlightClubId,
}: {
  matches: MatchListItem[];
  /** Si no se pasa (vista pública de un fan: no hay a dónde llevarlo, ningún rol tiene una
   * ficha de partido sin sesión), la fila se muestra igual pero sin link. */
  hrefFor?: (match: MatchListItem) => string;
  /** Si se pasa, resalta (fondo + borde) los partidos donde juega este club. */
  highlightClubId?: string;
}) {
  const matchdays = [...new Set(matches.map((m) => m.matchday))].sort((a, b) => a - b);
  const [activeMatchday, setActiveMatchday] = useState<number | null>(null);
  const activeMatchdayIndex = activeMatchday ?? matchdays[0];

  if (matches.length === 0) {
    return (
      <p className="px-4 py-8 text-center font-body text-sm text-text-secondary">
        Todavía no hay partidos programados.
      </p>
    );
  }

  const dayMatches = matches.filter((m) => m.matchday === activeMatchdayIndex);
  const grouped = dayMatches.reduce<Record<string, MatchListItem[]>>((acc, m) => {
    const g = m.groupName || "General";
    (acc[g] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div>
      {matchdays.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
          {matchdays.map((day) => (
            <button
              key={day}
              onClick={() => setActiveMatchday(day)}
              className={`shrink-0 cursor-pointer rounded-lg px-4 py-2 font-heading text-xs font-semibold transition-colors ${
                activeMatchdayIndex === day
                  ? "bg-surface-secondary text-text-invert"
                  : "border border-border-primary text-text-primary"
              }`}
            >
              Fecha {day}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4 px-4">
        {Object.entries(grouped).map(([group, groupMatches]) => (
          <div key={group} className="overflow-hidden rounded-xl border border-border-primary">
            <div className="bg-btn-regular px-4 py-2">
              <span className="font-heading text-xs font-bold text-text-primary">{group}</span>
            </div>
            {groupMatches.map((match, mi) => {
              const mine =
                highlightClubId != null &&
                (match.homeTeam?.id === highlightClubId || match.awayTeam?.id === highlightClubId);
              const live = match.status === "en_curso";
              const rowClassName = `block px-4 py-3 transition-colors ${hrefFor ? "hover:bg-btn-regular" : ""} ${mine ? "bg-field-light" : ""} ${
                mi > 0 ? "border-t border-border-primary" : ""
              }`;
              const rowContent = (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <ClubCrest club={match.homeTeam} />
                      <span className="truncate font-body text-sm text-text-primary">
                        {match.homeTeam?.name ?? "Por definir"}
                      </span>
                      <span className="ml-auto shrink-0 font-heading text-sm font-bold text-text-primary">
                        {match.homeScore ?? "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ClubCrest club={match.awayTeam} />
                      <span className="truncate font-body text-sm text-text-primary">
                        {match.awayTeam?.name ?? "Por definir"}
                      </span>
                      <span className="ml-auto shrink-0 font-heading text-sm font-bold text-text-primary">
                        {match.awayScore ?? "-"}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {live ? (
                      <span className="inline-flex items-center gap-1 font-heading text-xs font-bold text-field-green">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-field-green" />
                        En vivo
                      </span>
                    ) : match.status === "finalizado" ? (
                      <span className="font-heading text-xs font-bold text-text-secondary">Finalizado</span>
                    ) : isUnscheduled(match) ? (
                      <span className="font-body text-xs text-text-secondary">{UNSCHEDULED_LABEL}</span>
                    ) : (
                      <>
                        <p className="font-heading text-xs font-bold text-text-primary">{formatTime12(match.time)}</p>
                        <p className="font-body text-xs text-text-secondary">{formatMatchDate(match.date)}</p>
                      </>
                    )}
                  </div>
                </div>
              );

              return hrefFor ? (
                <Link key={match.id} href={hrefFor(match)} className={rowClassName}>
                  {rowContent}
                </Link>
              ) : (
                <div key={match.id} className={rowClassName}>
                  {rowContent}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
