"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { getTournament, getMatches, type MatchListItem } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { UNSCHEDULED_LABEL } from "@/_lib/match-format";
import { formatLabel } from "@/_lib/tournament-labels";
import { isUnscheduled } from "@/_lib/fixture";

const clubColors = ["#E53935", "#43A047", "#1E88E5", "#FB8C00", "#8E24AA", "#00ACC1", "#F4511E", "#7B1FA2"];

function formatMatchDate(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.toLocaleDateString("es-PE", { weekday: "short", timeZone: "UTC" });
  const num = d.getUTCDate();
  const month = d.toLocaleDateString("es-PE", { month: "short", timeZone: "UTC" });
  return `${day.charAt(0).toUpperCase() + day.slice(1)} ${num} ${month.charAt(0).toUpperCase() + month.slice(1)}`;
}

function formatTime(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "pm" : "am";
  const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h12.toString().padStart(2, "0")}:${m} ${ampm}`;
}

function PartidosFixtureContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { data: tournament } = useApi(() => getTournament(params.id));
  const { data: allMatches, loading } = useApi(() => getMatches({ tournamentId: params.id }));
  const [activeMatchday, setActiveMatchday] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (searchParams.get("saved") === "true") {
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  if (loading || !tournament || !allMatches) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  // Las fechas son las que tiene el fixture (una liga de 8 equipos tiene 7).
  const matchdays = [...new Set(allMatches.map((m) => m.matchday))].sort((a, b) => a - b);
  const activeMatchdayIndex = activeMatchday ?? matchdays[0];
  const tournamentMatches = allMatches
    .filter((m: MatchListItem) => m.matchday === activeMatchdayIndex);

  const grouped = tournamentMatches.reduce<Record<string, MatchListItem[]>>((acc, m) => {
    const group = m.groupName || "General";
    if (!acc[group]) acc[group] = [];
    acc[group].push(m);
    return acc;
  }, {});

  return (
    <div className="flex min-h-dvh flex-col pb-20">
      {/* Success toast */}
      {showToast && (
        <div className="fixed top-0 left-0 right-0 z-[120] flex justify-center">
          <div className="mx-auto w-full max-w-[430px] px-4 pt-3">
            <div className="flex items-center justify-between rounded-lg bg-verification px-4 py-3 animate-slide-down">
              <p className="font-heading text-sm font-semibold text-text-primary">
                Se definió los partidos con éxito.
              </p>
              <button
                onClick={() => setShowToast(false)}
                className="cursor-pointer p-1 text-text-primary"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-text-primary">
            <path
              d="M5.5 2.5h11v5a5.5 5.5 0 01-11 0v-5zM4.5 3.5H2.5a.5.5 0 00-.5.5v1.5A3 3 0 005 8.5h.5M17.5 3.5h2a.5.5 0 01.5.5v1.5A3 3 0 0117 8.5h-.5M8.5 13.5v2.5M13.5 13.5v2.5M7.5 16h7a1 1 0 011 1v1.5h-9V17a1 1 0 011-1z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h1 className="font-heading text-xl font-bold text-text-primary">Fixture</h1>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg bg-surface-secondary px-4 py-2 font-heading text-xs font-bold text-text-invert transition-colors hover:bg-brand-700 cursor-pointer">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 5.5L7 2l5 3.5M7 2v10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 8l-2 1.5V12h4v-2.5a1 1 0 012 0V12h4V9.5L10 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Compartir
        </button>
      </header>

      {/* Tournament info pill */}
      <div className="mx-4 mb-4 rounded-xl border border-border-primary p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red/10">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 2h8v4a4 4 0 01-8 0V2zM3 3H1.5a.5.5 0 00-.5.5v1a2 2 0 002 2H3M13 3h1.5a.5.5 0 01.5.5v1a2 2 0 01-2 2h-.5M6 10v2M10 10v2M5 12h6a1 1 0 011 1v1H4v-1a1 1 0 011-1z"
                stroke="var(--color-red)"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-sm font-bold text-text-primary">
              {tournament.name}
            </p>
            <p className="font-body text-xs text-text-secondary">
              {tournament._count.teams} equipos | {formatLabel(tournament.format)} | {tournament.category || "Libre"}
              {" "}
              <span className="inline-flex items-center rounded-full bg-verification px-1.5 py-0.5 text-[10px] font-bold text-text-primary">
                Activo
              </span>
            </p>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-text-secondary">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Matchday tabs */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-4 no-scrollbar">
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

      {/* Match cards by group */}
      <div className="flex flex-col gap-4 px-4">
        {Object.entries(grouped).length > 0 ? (
          Object.entries(grouped).map(([group, groupMatches]) => (
            <div key={group} className="contents">
              {groupMatches.map((match, mi) => (
                <Link
                  key={match.id}
                  href={`/torneos/${params.id}/partido/${match.id}`}
                  className="block rounded-xl border border-border-primary overflow-hidden"
                >
                  {/* Group header */}
                  <div className="flex items-center justify-between bg-btn-regular px-4 py-2">
                    <span className="font-heading text-xs font-bold text-text-primary">{group}</span>
                    <div className="flex items-center gap-1 text-text-secondary">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M6 1C3.79 1 2 2.79 2 5c0 2.5 4 6 4 6s4-3.5 4-6c0-2.21-1.79-4-4-4zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="currentColor" />
                      </svg>
                      <span className="font-body text-[11px]">{match.location}</span>
                    </div>
                  </div>

                  {/* Match content */}
                  <div className="flex items-center px-4 py-3">
                    {/* Teams */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: clubColors[mi % clubColors.length] + "20" }}
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M3 1h6v3a3 3 0 01-6 0V1z" stroke={clubColors[mi % clubColors.length]} strokeWidth="1" />
                          </svg>
                        </div>
                        <span className="font-body text-sm text-text-primary">{match.homeTeam?.name ?? "Por definir"}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: clubColors[(mi + 1) % clubColors.length] + "20" }}
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M3 1h6v3a3 3 0 01-6 0V1z" stroke={clubColors[(mi + 1) % clubColors.length]} strokeWidth="1" />
                          </svg>
                        </div>
                        <span className="font-body text-sm text-text-primary">{match.awayTeam?.name ?? "Por definir"}</span>
                      </div>
                    </div>

                    {/* Separator */}
                    <div className="mx-3 h-12 w-px bg-border-primary" />

                    {/* Date & time */}
                    <div className="text-right">
                      {isUnscheduled(match) ? (
                        <p className="font-heading text-sm font-bold text-text-secondary">{UNSCHEDULED_LABEL}</p>
                      ) : (
                        <>
                          <p className="font-heading text-sm font-bold text-text-primary">{formatTime(match.time)}</p>
                          <p className="font-body text-xs text-text-secondary">{formatMatchDate(match.date)}</p>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="font-body text-sm text-text-secondary">
              No hay partidos programados para esta fecha
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PartidosFixturePage() {
  return (
    <Suspense fallback={null}>
      <PartidosFixtureContent />
    </Suspense>
  );
}
