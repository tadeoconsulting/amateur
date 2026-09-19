"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getTournament, getMatches } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";

const matchdays = ["Fecha 1", "Fecha 2", "Fecha 3", "Cuartos", "Semi", "Final"];

const clubColors = ["#E53935", "#43A047", "#1E88E5", "#FB8C00", "#8E24AA", "#00ACC1", "#F4511E", "#7B1FA2"];

type MatchConfig = {
  date: string;
  hora: string;
  minuto: string;
  sede: string;
};

function formatConfigDate(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.toLocaleDateString("es-PE", { weekday: "short" });
  const num = d.getDate();
  const month = d.toLocaleDateString("es-PE", { month: "short" });
  return `${day.charAt(0).toUpperCase() + day.slice(1)} ${num} ${month.charAt(0).toUpperCase() + month.slice(1)}`;
}

function formatConfigTime(hora: string, minuto: string) {
  const minNum = minuto.replace(" min", "");
  return hora.replace(":00", ":" + minNum.padStart(2, "0"));
}

export default function ManualFixturePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: tournament, loading: loadingT } = useApi(() => getTournament(params.id));
  const { data: allMatches, loading: loadingM } = useApi(() => getMatches({ tournamentId: params.id }));
  const [activeMatchday, setActiveMatchday] = useState("Fecha 1");
  const [matchConfigs, setMatchConfigs] = useState<Record<string, MatchConfig>>({});

  useEffect(() => {
    function loadConfigs() {
      try {
        const stored = JSON.parse(localStorage.getItem("matchConfigs") || "{}");
        setMatchConfigs(stored);
      } catch {}
    }
    loadConfigs();
    window.addEventListener("focus", loadConfigs);
    return () => window.removeEventListener("focus", loadConfigs);
  }, []);

  if (loadingT || loadingM || !tournament) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const activeMatchdayIndex = matchdays.indexOf(activeMatchday) + 1;
  const tournamentMatches = (allMatches ?? [])
    .filter((m) => m.matchday === activeMatchdayIndex);

  const grouped = tournamentMatches.reduce<Record<string, typeof tournamentMatches>>((acc, m) => {
    const group = m.groupName || "General";
    if (!acc[group]) acc[group] = [];
    acc[group].push(m);
    return acc;
  }, {});

  return (
    <div className="flex min-h-dvh flex-col pb-20">
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
              {tournament._count.teams} equipos | {tournament.format === "liga" ? "Liga" : tournament.format === "grupos" ? "Grupos" : "Relámpago"} | {tournament.category || "Libre"}
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
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
        {matchdays.map((day) => (
          <button
            key={day}
            onClick={() => setActiveMatchday(day)}
            className={`shrink-0 cursor-pointer rounded-lg px-4 py-2 font-heading text-xs font-semibold transition-colors ${
              activeMatchday === day
                ? "bg-surface-secondary text-text-invert"
                : "border border-border-primary text-text-primary"
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* "Por definir" label */}
      <p className="px-4 pb-3 font-body text-sm text-text-secondary">Por definir</p>

      {/* Match cards by group */}
      <div className="flex flex-col gap-4 px-4">
        {Object.entries(grouped).length > 0 ? (
          Object.entries(grouped).map(([group, groupMatches]) => (
            <div key={group} className="contents">
              {groupMatches.map((match, mi) => {
                const config = matchConfigs[match.id];
                return (
                  <div
                    key={match.id}
                    onClick={config ? () => router.push(`/torneos/${params.id}/partido/${match.id}`) : undefined}
                    className={`rounded-xl border border-border-primary overflow-hidden${config ? " cursor-pointer transition-colors hover:bg-btn-regular" : ""}`}
                  >
                    {/* Group header */}
                    <div className="flex items-center justify-between bg-btn-regular px-4 py-2">
                      <span className="font-heading text-xs font-bold text-text-primary">{group}</span>
                      {config?.sede && (
                        <div className="flex items-center gap-1 text-text-secondary">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M6 1C3.79 1 2 2.79 2 5c0 2.5 4 6 4 6s4-3.5 4-6c0-2.21-1.79-4-4-4zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="currentColor" />
                          </svg>
                          <span className="font-body text-[11px]">{config.sede}</span>
                        </div>
                      )}
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
                          <span className="font-body text-sm text-text-primary">{match.homeTeam.name}</span>
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
                          <span className="font-body text-sm text-text-primary">{match.awayTeam.name}</span>
                        </div>
                      </div>

                      {/* Separator */}
                      <div className="mx-3 h-12 w-px bg-border-primary" />

                      {/* Configured: show date/time — Unconfigured: show Configurar */}
                      {config ? (
                        <div className="text-right">
                          <p className="font-heading text-sm font-bold text-text-primary">
                            {formatConfigTime(config.hora, config.minuto)}
                          </p>
                          <p className="font-body text-xs text-text-secondary">
                            {formatConfigDate(config.date)}
                          </p>
                        </div>
                      ) : (
                        <button
                          onClick={() => router.push(`/torneos/${params.id}/configurar/${match.id}`)}
                          className="cursor-pointer font-heading text-sm font-bold text-text-primary"
                        >
                          Configurar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
