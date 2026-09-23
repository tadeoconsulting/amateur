"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getMatches, getStandings, getScorers, getTournament } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { UNSCHEDULED_LABEL } from "@/_lib/match-format";

const tabs = ["Partidos", "Llaves", "Tabla", "Goleadores", "Equipos"] as const;
type Tab = (typeof tabs)[number];

const llavesRounds = ["16 avos", "Octavos", "Cuartos", "Semifinal", "Final"] as const;

const tournamentOptions = [
  { id: "t1", name: "Copa Comunidad Futbolera", detail: "10 equipos · Liga · Sub 12 · Activo" },
  { id: "t2", name: "Copa Verano", detail: "8 equipos · Eliminación · Sub 18 · Activo" },
];

export default function JugadorTorneoDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("Partidos");
  const [activeLlavesRound, setActiveLlavesRound] = useState<(typeof llavesRounds)[number]>(llavesRounds[4]);
  const [showTournamentPicker, setShowTournamentPicker] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(tournamentOptions[0]);

  const { data: matchesData, loading: loadingMatches } = useApi(() => getMatches({ tournamentId: id }));
  const { data: standingsData, loading: loadingStandings } = useApi(() => getStandings(id));
  const { data: scorersData, loading: loadingScorers } = useApi(() => getScorers(id));
  const { data: tournamentDetail, loading: loadingTournament } = useApi(() => getTournament(id));

  if (loadingMatches || loadingStandings) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const allMatches = matchesData ?? [];
  const standings = standingsData ?? [];
  const topScorers = scorersData ?? [];
  const clubs = tournamentDetail?.teams.map((t) => t.club) ?? [];

  const groupedMatches: Record<string, typeof allMatches> = {};
  for (const m of allMatches) {
    const dateLabel =
      m.time === ""
        ? UNSCHEDULED_LABEL
        : new Date(m.date).toLocaleDateString("es-PE", {
            weekday: "long",
            day: "numeric",
            month: "long",
          });
    const key = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
    if (!groupedMatches[key]) groupedMatches[key] = [];
    groupedMatches[key].push(m);
  }

  return (
    <div className="w-full pb-8">
      {/* Header */}
      <div className="px-4 pt-4">
        <button
          onClick={() => router.back()}
          className="flex cursor-pointer items-center gap-1 text-sm font-semibold text-text-primary"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver a Mis Torneos
        </button>
      </div>

      {/* Tournament info card */}
      <div className="mx-4 mt-4 rounded-xl border border-brand-200 px-4 py-3">
        <button
          onClick={() => setShowTournamentPicker(true)}
          className="flex w-full cursor-pointer items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3D1952]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-text-primary">{tournamentDetail?.name ?? selectedTournament.name}</p>
              <p className="text-xs text-text-secondary">
                {tournamentDetail?._count.teams ?? "?"} equipos | {tournamentDetail?.format === "liga" ? "Liga" : tournamentDetail?.format === "grupos" ? "Grupos" : "Eliminación"} | {tournamentDetail?.category || "Libre"} |{" "}
                <span className="rounded bg-accent-green px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Activo
                </span>
              </p>
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-secondary">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-2 overflow-x-auto px-4 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab
                ? "bg-surface-secondary text-text-invert"
                : "border border-border-primary text-text-primary"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4 px-4">
        {activeTab === "Partidos" && (
          <div className="space-y-6">
            {Object.entries(groupedMatches).map(([date, dateMatches]) => (
              <div key={date}>
                <p className="mb-3 text-sm font-semibold italic text-text-primary">{date}</p>
                {/* Group matches by group */}
                {Object.entries(
                  dateMatches.reduce<Record<string, typeof dateMatches>>((acc, m) => {
                    const g = m.groupName || "Sin grupo";
                    if (!acc[g]) acc[g] = [];
                    acc[g].push(m);
                    return acc;
                  }, {})
                ).map(([group, gMatches]) => (
                  <div key={group} className="mb-3 rounded-lg border border-brand-100">
                    <div className="border-b border-brand-100 px-3 py-2">
                      <span className="text-xs font-semibold text-text-primary">{group}</span>
                    </div>
                    {gMatches.map((match) => (
                      <div key={match.id} className="flex items-center justify-between px-3 py-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-200">
                              <span className="text-[8px]">⚽</span>
                            </div>
                            <span className="text-sm text-text-primary">{match.homeTeam?.name ?? "Por definir"}</span>
                            <span className="ml-auto text-sm font-bold text-text-primary">
                              {match.homeScore ?? "-"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-200">
                              <span className="text-[8px]">⚽</span>
                            </div>
                            <span className="text-sm text-text-primary">{match.awayTeam?.name ?? "Por definir"}</span>
                            <span className="ml-auto text-sm font-bold text-text-primary">
                              {match.awayScore ?? "-"}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4 text-right">
                          <p className="text-xs text-text-secondary">Fecha {match.matchday}</p>
                          <p className="text-xs text-text-secondary">
                            {match.time === ""
                              ? UNSCHEDULED_LABEL
                              : new Date(match.date).toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {activeTab === "Llaves" && (
          <div>
            <div className="flex gap-2 overflow-x-auto scrollbar-none">
              {llavesRounds.map((round) => (
                <button
                  key={round}
                  onClick={() => setActiveLlavesRound(round)}
                  className={`shrink-0 cursor-pointer border-b-2 px-3 pb-2 text-sm font-medium transition-colors ${
                    activeLlavesRound === round
                      ? "border-brand-900 text-text-primary"
                      : "border-transparent text-text-secondary"
                  }`}
                >
                  {round}
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-brand-100 px-3 py-3">
              <div className="border-b border-brand-100 pb-2">
                <span className="text-xs text-text-secondary">16 jul | Final</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-200">
                      <span className="text-[8px]">⚽</span>
                    </div>
                    <span className="text-sm text-text-primary">Equipo A</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-200">
                      <span className="text-[8px]">⚽</span>
                    </div>
                    <span className="text-sm text-text-primary">Equipo B</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-secondary">13 Ago</p>
                  <p className="text-xs text-text-secondary">2:00 pm</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Tabla" && (
          <div className="rounded-lg border border-brand-100">
            <div className="border-b border-brand-100 px-3 py-2">
              <span className="text-sm font-semibold text-text-primary">Posiciones</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-brand-100 text-text-secondary">
                    <th className="px-3 py-2 text-left font-medium">Equipo</th>
                    <th className="px-1.5 py-2 text-center font-medium">PTS</th>
                    <th className="px-1.5 py-2 text-center font-medium">PJ</th>
                    <th className="px-1.5 py-2 text-center font-medium">PG</th>
                    <th className="px-1.5 py-2 text-center font-medium">PE</th>
                    <th className="px-1.5 py-2 text-center font-medium">PP</th>
                    <th className="px-1.5 py-2 text-center font-medium">DG</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row) => (
                    <tr key={row.position} className="border-b border-brand-50">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${row.position === 1 ? "text-accent-green" : "text-text-primary"}`}>
                            {row.position}
                          </span>
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-200">
                            <span className="text-[8px]">⚽</span>
                          </div>
                          <span className="text-text-primary">{row.clubName}</span>
                        </div>
                      </td>
                      <td className="px-1.5 py-2 text-center font-semibold text-text-primary">{row.points}</td>
                      <td className="px-1.5 py-2 text-center text-text-secondary">{row.played}</td>
                      <td className="px-1.5 py-2 text-center text-text-secondary">{row.won}</td>
                      <td className="px-1.5 py-2 text-center text-text-secondary">{row.drawn}</td>
                      <td className="px-1.5 py-2 text-center text-text-secondary">{row.lost}</td>
                      <td className="px-1.5 py-2 text-center text-text-secondary">
                        {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="h-2.5 w-2.5 rounded-sm bg-accent-green" />
              <span className="text-xs text-text-secondary">Clasifica</span>
            </div>
          </div>
        )}

        {activeTab === "Goleadores" && (
          <div className="space-y-0">
            {topScorers.map((scorer, idx) => (
              <div
                key={scorer.playerId}
                className={`flex items-center justify-between py-3 ${idx === 0 ? "border-b border-brand-100 pb-4" : ""} ${idx > 0 ? "border-b border-brand-50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  {idx > 0 && (
                    <span className="w-4 text-sm font-semibold text-text-secondary">{idx + 1}</span>
                  )}
                  <div className={`flex items-center justify-center rounded-full bg-brand-200 ${idx === 0 ? "h-12 w-12" : "h-8 w-8"}`}>
                    <svg width={idx === 0 ? 24 : 16} height={idx === 0 ? 24 : 16} viewBox="0 0 24 24" fill="none" className="text-text-secondary">
                      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <p className={`font-semibold text-text-primary ${idx === 0 ? "text-sm" : "text-sm"}`}>
                      {scorer.firstName} {scorer.lastName}
                      {idx === 0 && (
                        <span className="ml-1.5 inline-block">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="inline text-accent-green">
                            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 12c0 4.29 2.79 8.14 6.84 9.8.55.22 1.17.22 1.72 0A12.024 12.024 0 0021 12c0-.94-.12-1.85-.34-2.72" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-text-secondary">{scorer.clubName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-text-primary">
                    {String(scorer.goals).padStart(2, "0")}
                  </p>
                  <p className="text-[10px] text-text-secondary">Goles</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Equipos" && (
          <div className="space-y-2">
            {clubs.slice(0, 4).map((club) => (
              <div key={club.id} className="flex items-center gap-3 rounded-lg border border-brand-100 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-200">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-text-secondary">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M12 8v4l3 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{club.name}</p>
                  <p className="text-xs text-text-secondary">{club.shortName}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tournament Picker Bottom Sheet */}
      {showTournamentPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setShowTournamentPicker(false)}
        >
          <div
            className="w-full max-w-[430px] rounded-t-2xl bg-white px-4 pb-8 pt-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-heading text-lg font-bold text-text-primary">Elige un torneo</h3>
            <div className="mt-4 space-y-3">
              {tournamentOptions.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTournament(t);
                    setShowTournamentPicker(false);
                  }}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                    selectedTournament.id === t.id ? "border-accent-green bg-accent-green/5" : "border-brand-100"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3D1952]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                    <p className="text-xs text-text-secondary">{t.detail}</p>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTournamentPicker(false)}
              className="mt-4 w-full cursor-pointer rounded-xl bg-brand-900 py-3 font-heading text-sm font-semibold text-text-invert"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
