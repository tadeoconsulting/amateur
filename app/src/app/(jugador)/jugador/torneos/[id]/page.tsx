"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getMatches, getStandings, getScorers, getTournament, getTournaments, type TournamentDetail } from "@/_lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatLabel } from "@/_lib/tournament-labels";
import { useApi } from "@/_lib/use-api";
import { UNSCHEDULED_LABEL } from "@/_lib/match-format";
import { roundLabel } from "@/_lib/fixture";
import { TournamentLogo } from "@/_components/tournament-logo";
import { ClubCrest } from "@/_components/club-crest";
import { FixtureWithStandings } from "@/_components/fixture-with-standings";
import { StandingsTable, ScorersList } from "@/_components/tournament-results";
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
            <TournamentLogo logoUrl={tournament?.logoUrl} />
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
                  <TournamentLogo logoUrl={t.logoUrl} />
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
  // Cuántos de la tabla pasan a llaves; solo una liga puede tenerlas.
  const llaves = tournamentDetail?.format === "liga" ? (tournamentDetail.playoffTeams ?? null) : null;

  // "Llaves" solo aparece si el torneo tiene cuadro de eliminación armado (antes mostraba un
  // cuadro de ejemplo fijo en cualquier torneo).
  const bracketMatches = allMatches.filter((m) => m.decisive);
  const hasBracket = bracketMatches.length > 0;
  const visibleTabs = tabs.filter((t) => t !== "Llaves" || hasBracket);
  const shownTab: Tab = activeTab === "Llaves" && !hasBracket ? "Partidos" : activeTab;
  const bracketRounds = [...new Set(bracketMatches.map((m) => m.matchday))].sort((a, b) => a - b);
  const totalRounds = bracketRounds.length > 0 ? Math.max(...bracketRounds) : 0;
  const currentRound = llavesRound !== null && bracketRounds.includes(llavesRound) ? llavesRound : (bracketRounds[bracketRounds.length - 1] ?? 0);

  return (
    // `@container`: lo de adentro se adapta al ancho de la pantalla (una columna en el celular; el fixture con la tabla al lado en escritorio).
    <div className="@container w-full pb-8">
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
          <FixtureWithStandings
            bleed
            matches={allMatches}
            standings={standings}
            qualifyCount={llaves}
            onViewFullTable={() => setActiveTab("Tabla")}
            stickyTop="@4xl:top-20"
          />
        )}

        {shownTab === "Llaves" && (
          <div className="@4xl:mx-auto @4xl:max-w-3xl">
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
          <div className="@4xl:mx-auto @4xl:max-w-4xl">
            <StandingsTable standings={standings} qualifyCount={llaves} />
          </div>
        )}

        {shownTab === "Goleadores" && (
          <div className="@4xl:mx-auto @4xl:max-w-3xl">
            <ScorersList scorers={topScorers} />
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
