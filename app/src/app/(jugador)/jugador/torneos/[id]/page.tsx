"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getMatches, getStandings, getScorers, getTournament, getTournaments, type TournamentDetail } from "@/_lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatLabel } from "@/_lib/tournament-labels";
import { useApi } from "@/_lib/use-api";
import { UNSCHEDULED_LABEL } from "@/_lib/match-format";
import { roundLabel } from "@/_lib/fixture";
import { ClubCrest } from "@/_components/club-crest";
import { PlayerAvatar } from "@/_components/player-avatar";
import { TeamsList } from "@/_components/teams-list";

const tabs = ["Partidos", "Llaves", "Tabla", "Goleadores", "Equipos"] as const;
type Tab = (typeof tabs)[number];

function statusBadge(status: string) {
  switch (status) {
    case "en_curso":
      return { text: "Activo", color: "bg-field-green text-white" };
    case "inscripcion":
      return { text: "Convocatoria", color: "bg-amber-500 text-white" };
    case "finalizado":
      return { text: "Finalizado", color: "bg-brand-500 text-white" };
    default:
      return { text: status, color: "bg-brand-500 text-white" };
  }
}

/**
 * Tarjeta del torneo con su selector. La lista son los torneos donde juega la persona (por
 * cualquiera de sus equipos), siempre con el que está viendo. Con uno solo no hay nada que
 * elegir: la tarjeta no abre el selector ni muestra la flecha. Elegir otro lleva a ese torneo.
 */
function TournamentSwitcher({ userId, currentId, tournament }: { userId: string | null; currentId: string; tournament: TournamentDetail | null | undefined }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: mine } = useApi(() => (userId ? getTournaments({ playerId: userId }) : Promise.resolve([])));

  const options = [...(mine ?? [])];
  if (tournament && !options.some((t) => t.id === currentId)) {
    options.push({ ...tournament, teamsCount: tournament._count.teams, matchesCount: tournament._count.matches });
  }
  const canSwitch = options.length > 1;
  const badge = statusBadge(tournament?.status ?? "en_curso");

  const detail = (t: { teamsCount: number; format: string; category: string | null }) =>
    `${t.teamsCount} ${t.teamsCount === 1 ? "equipo" : "equipos"} | ${formatLabel(t.format)} | ${t.category || "Libre"}`;

  return (
    <>
      <div className="mx-4 mt-4 rounded-xl border border-brand-200 px-4 py-3">
        <button
          onClick={() => canSwitch && setOpen(true)}
          className={`flex w-full items-center justify-between ${canSwitch ? "cursor-pointer" : "cursor-default"}`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3D1952]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-bold text-text-primary">{tournament?.name ?? "Torneo"}</p>
              {tournament && (
                <p className="text-xs text-text-secondary">
                  {detail({ teamsCount: tournament._count.teams, format: tournament.format, category: tournament.category })} |{" "}
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${badge.color}`}>{badge.text}</span>
                </p>
              )}
            </div>
          </div>
          {canSwitch && (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 text-text-secondary">
              <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      {open && canSwitch && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Elige un torneo"
            className="max-h-[80dvh] w-full max-w-[430px] overflow-y-auto rounded-t-2xl bg-white px-4 pb-8 pt-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-heading text-lg font-bold text-text-primary">Elige un torneo</h3>
            <div className="mt-4 space-y-3">
              {options.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setOpen(false);
                    if (t.id !== currentId) router.push(`/jugador/torneos/${t.id}`);
                  }}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                    t.id === currentId ? "border-field-green bg-field-green/5" : "border-brand-100"
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3D1952]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-primary">{t.name}</p>
                    <p className="text-xs text-text-secondary">{detail(t)}</p>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="mt-4 w-full cursor-pointer rounded-xl bg-brand-900 py-3 font-heading text-sm font-semibold text-text-invert"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function JugadorTorneoDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("Partidos");
  // Ronda del cuadro que se está viendo; null = la última (la final, o la más avanzada).
  const [llavesRound, setLlavesRound] = useState<number | null>(null);

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

  // "Llaves" solo aparece si el torneo tiene cuadro de eliminación armado (antes mostraba un
  // cuadro de ejemplo fijo en cualquier torneo).
  const bracketMatches = allMatches.filter((m) => m.decisive);
  const hasBracket = bracketMatches.length > 0;
  const visibleTabs = tabs.filter((t) => t !== "Llaves" || hasBracket);
  const shownTab: Tab = activeTab === "Llaves" && !hasBracket ? "Partidos" : activeTab;
  const bracketRounds = [...new Set(bracketMatches.map((m) => m.matchday))].sort((a, b) => a - b);
  const totalRounds = bracketRounds.length > 0 ? Math.max(...bracketRounds) : 0;
  const currentRound = llavesRound !== null && bracketRounds.includes(llavesRound) ? llavesRound : (bracketRounds[bracketRounds.length - 1] ?? 0);

  const groupedMatches: Record<string, typeof allMatches> = {};
  for (const m of allMatches) {
    const dateLabel =
      m.time === ""
        ? UNSCHEDULED_LABEL
        : new Date(m.date).toLocaleDateString("es-PE", { timeZone: "UTC",
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

      {/* Tarjeta del torneo y su selector. `key`: si cambia la persona se vuelve a pedir su lista. */}
      <TournamentSwitcher key={user?.id ?? "anon"} userId={user?.id ?? null} currentId={id} tournament={tournamentDetail} />

      {/* Tabs */}
      <div className="mt-6 flex gap-2 overflow-x-auto px-4 scrollbar-none">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            onClick={(e) => {
              setActiveTab(tab);
              // La barra se desplaza: la pestaña elegida queda a la vista.
              e.currentTarget.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
            }}
            className={`shrink-0 cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              shownTab === tab
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
        {shownTab === "Partidos" && (
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
                            <ClubCrest club={match.homeTeam} />
                            <span className="text-sm text-text-primary">{match.homeTeam?.name ?? "Por definir"}</span>
                            <span className="ml-auto text-sm font-bold text-text-primary">
                              {match.homeScore ?? "-"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ClubCrest club={match.awayTeam} />
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
                              : new Date(match.date).toLocaleDateString("es-PE", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" })}
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

        {shownTab === "Llaves" && (
          <div>
            <div className="flex gap-2 overflow-x-auto scrollbar-none">
              {bracketRounds.map((round) => (
                <button
                  key={round}
                  onClick={() => setLlavesRound(round)}
                  className={`shrink-0 cursor-pointer border-b-2 px-3 pb-2 text-sm font-medium transition-colors ${
                    currentRound === round
                      ? "border-brand-900 text-text-primary"
                      : "border-transparent text-text-secondary"
                  }`}
                >
                  {roundLabel(round, totalRounds)}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              {bracketMatches
                .filter((m) => m.matchday === currentRound)
                .map((match) => (
                  <div key={match.id} className="rounded-lg border border-brand-100 px-3 py-3">
                    <div className="border-b border-brand-100 pb-2">
                      <span className="text-xs text-text-secondary">
                        {roundLabel(match.matchday, totalRounds)}
                        {match.status === "en_curso" ? " | En vivo" : match.status === "finalizado" ? " | Finalizado" : ""}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="min-w-0 flex-1 space-y-2">
                        {[
                          { team: match.homeTeam, score: match.homeScore, winner: match.winnerTeamId !== null && match.winnerTeamId === match.homeTeamId },
                          { team: match.awayTeam, score: match.awayScore, winner: match.winnerTeamId !== null && match.winnerTeamId === match.awayTeamId },
                        ].map((row, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <ClubCrest club={row.team} />
                            <span className={`truncate text-sm ${row.team ? "text-text-primary" : "italic text-text-secondary"} ${row.winner ? "font-bold" : ""}`}>
                              {row.team?.name ?? "Por definir"}
                            </span>
                            {(match.status === "en_curso" || match.status === "finalizado") && (
                              <span className={`ml-auto text-sm text-text-primary ${row.winner ? "font-bold" : ""}`}>{row.score ?? "-"}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="ml-4 shrink-0 text-right">
                        <p className="text-xs text-text-secondary">
                          {match.time === ""
                            ? UNSCHEDULED_LABEL
                            : new Date(match.date).toLocaleDateString("es-PE", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" })}
                        </p>
                        {match.time !== "" && <p className="text-xs text-text-secondary">{match.time}</p>}
                      </div>
                    </div>
                    {match.status === "finalizado" && match.winnerTeamId !== null && match.homeScore === match.awayScore && (
                      <p className="mt-2 text-xs text-text-secondary">
                        Penales {match.penaltyHomeScore ?? 0}-{match.penaltyAwayScore ?? 0}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {shownTab === "Tabla" && (
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
                          <span className={`font-semibold ${row.position === 1 ? "text-field-green" : "text-text-primary"}`}>
                            {row.position}
                          </span>
                          <ClubCrest club={row} />
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
              <div className="h-2.5 w-2.5 rounded-sm bg-field-green" />
              <span className="text-xs text-text-secondary">Clasifica</span>
            </div>
          </div>
        )}

        {shownTab === "Goleadores" && (
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
                  <PlayerAvatar
                    avatarUrl={scorer.avatarUrl}
                    size={idx === 0 ? "h-12 w-12" : "h-8 w-8"}
                    iconSize={idx === 0 ? 24 : 16}
                    background="bg-brand-200"
                    iconClass="text-text-secondary"
                  />
                  <div>
                    <p className={`font-semibold text-text-primary ${idx === 0 ? "text-sm" : "text-sm"}`}>
                      {scorer.firstName} {scorer.lastName}
                      {idx === 0 && (
                        <span className="ml-1.5 inline-block">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="inline text-field-green">
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

        {shownTab === "Equipos" && (
          <div className="-mx-4">
            <TeamsList teams={tournamentDetail?.teams ?? []} standings={standings} />
          </div>
        )}
      </div>

    </div>
  );
}
