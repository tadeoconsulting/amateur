"use client";

import Link from "next/link";
import { useState } from "react";
import type { MatchListItem, StandingsRow, TournamentDetail } from "@/_lib/api";
import { roundLabel } from "@/_lib/fixture";
import { UNSCHEDULED_LABEL } from "@/_lib/match-format";
import { btnSolid } from "@/_components/button-styles";
import { Spinner } from "@/_components/spinner";
import { ClubCrest } from "@/_components/club-crest";
import { LigaBracketBuilder } from "./liga-bracket-builder";

/** ¿Un partido decisivo se cerró por penales? (marcador igualado pero con ganador). */
function decidedByPenalties(m: MatchListItem) {
  return m.status === "finalizado" && m.winnerTeamId !== null && m.homeScore === m.awayScore;
}

function TeamRow({ team, score, isWinner, showScore }: { team: MatchListItem["homeTeam"]; score: number | null; isWinner: boolean; showScore: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <ClubCrest club={team} size="h-7 w-7" textSize="text-[10px]" />
      <span className={`flex-1 truncate font-body text-sm ${team ? "text-text-primary" : "text-text-secondary italic"} ${isWinner ? "font-bold" : ""}`}>
        {team?.name ?? UNSCHEDULED_LABEL}
      </span>
      {showScore && <span className={`font-heading text-sm tabular-nums text-text-primary ${isWinner ? "font-bold" : ""}`}>{score ?? "-"}</span>}
    </div>
  );
}

function BracketMatchCard({ tournamentId, match }: { tournamentId: string; match: MatchListItem }) {
  const tbd = !match.homeTeamId || !match.awayTeamId;
  const showScore = match.status === "en_curso" || match.status === "finalizado";
  const href = tbd
    ? null
    : match.status === "finalizado"
      ? `/torneos/${tournamentId}/resultado/${match.id}`
      : `/torneos/${tournamentId}/en-vivo/${match.id}`;

  const content = (
    <div className={`rounded-xl border border-border-primary p-3 ${href ? "transition-colors hover:bg-btn-regular" : ""}`}>
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 font-body text-xs ${match.status === "en_curso" ? "font-semibold text-verification" : "text-text-secondary"}`}
        >
          {match.status === "en_curso" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-verification" aria-hidden="true" />}
          {match.status === "en_curso" ? "En vivo" : match.status === "finalizado" ? "Finalizado" : "Por jugar"}
        </span>
        {decidedByPenalties(match) && (
          <span className="font-body text-xs text-text-secondary">
            Penales {match.penaltyHomeScore ?? 0}-{match.penaltyAwayScore ?? 0}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <TeamRow team={match.homeTeam} score={match.homeScore} showScore={showScore} isWinner={match.winnerTeamId === match.homeTeamId} />
        <TeamRow team={match.awayTeam} score={match.awayScore} showScore={showScore} isWinner={match.winnerTeamId === match.awayTeamId} />
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

/** El cuadro de eliminación de un torneo `eliminacion`, `relampago` o la fase de cuadro de
 * `copa` (especificación 007): las llaves, ronda por ronda, con "Por definir" en los
 * cruces sin rival todavía. Para Copa, ofrece armar el cuadro cuando la fase de grupos ya
 * terminó (y explica qué falta mientras no se pueda). */
export function BracketView({
  tournamentId,
  tournament,
  matches,
  standings,
  onChanged,
}: {
  tournamentId: string;
  tournament: TournamentDetail;
  matches: MatchListItem[];
  standings: StandingsRow[];
  onChanged: () => void;
}) {
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState("");

  const bracketMatches = matches.filter((m) => m.decisive);

  if (bracketMatches.length === 0) {
    // Una liga con llaves: cuando la tabla termina, se arma el cuadro con los mejores.
    if (tournament.format === "liga" && tournament.playoffTeams !== null) {
      const leagueMatches = matches.filter((m) => !m.decisive);
      const leaguePending = leagueMatches.filter((m) => m.status !== "finalizado").length;
      if (leagueMatches.length > 0 && leaguePending === 0) {
        return <LigaBracketBuilder tournamentId={tournamentId} size={tournament.playoffTeams} standings={standings} onBuilt={onChanged} />;
      }
      return (
        <p className="px-4 py-10 text-center font-body text-sm text-text-secondary">
          {leagueMatches.length === 0
            ? "Primero arma el fixture de la liga, en la pestaña Partidos."
            : `Faltan ${leaguePending} ${leaguePending === 1 ? "partido" : "partidos"} de la liga para armar las llaves.`}
        </p>
      );
    }
    if (tournament.format !== "copa") {
      // No debería pasar (el cuadro se arma junto con el fixture), pero por si acaso.
      return <p className="px-4 py-10 text-center font-body text-sm text-text-secondary">El cuadro todavía no se armó.</p>;
    }

    const groupMatches = matches.filter((m) => m.groupName !== null);
    const pending = groupMatches.filter((m) => m.status !== "finalizado").length;
    const canBuild = groupMatches.length > 0 && pending === 0;

    async function buildBracket() {
      setError("");
      setBuilding(true);
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}/fixture`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "bracket" }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "No se pudo armar el cuadro");
          return;
        }
        onChanged();
      } catch {
        setError("No se pudo conectar. Inténtalo de nuevo.");
      } finally {
        setBuilding(false);
      }
    }

    return (
      <div className="flex flex-col items-center px-4 py-12 text-center">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="mb-4 text-brand-500" aria-hidden="true">
          <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        {groupMatches.length === 0 ? (
          <p className="font-body text-sm text-text-secondary">Primero arma la fase de grupos, en la pestaña Partidos.</p>
        ) : canBuild ? (
          <>
            <h2 className="font-heading text-base font-bold text-text-primary">La fase de grupos terminó</h2>
            <p className="mt-2 max-w-[280px] font-body text-sm text-text-secondary">
              Arma el cuadro de eliminación con los mejores {tournament.groupsAdvancePerGroup ?? 2} de cada grupo.
            </p>
            {error && (
              <p role="alert" className="mt-3 font-body text-sm text-brand-900">
                {error}
              </p>
            )}
            <button onClick={buildBracket} disabled={building} className={`${btnSolid} mt-5 w-full max-w-[280px]`}>
              {building && <Spinner size={16} label="Armando el cuadro" />}
              {building ? "Armando..." : "Armar el cuadro"}
            </button>
          </>
        ) : (
          <p className="font-body text-sm text-text-secondary">
            Faltan {pending} {pending === 1 ? "partido" : "partidos"} de la fase de grupos para poder armar el cuadro.
          </p>
        )}
      </div>
    );
  }

  const totalRounds = Math.max(...bracketMatches.map((m) => m.matchday));
  const rounds = [...new Set(bracketMatches.map((m) => m.matchday))].sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-6 px-4">
      {rounds.map((round) => (
        <div key={round}>
          <h2 className="mb-3 font-heading text-sm font-bold text-text-primary">{roundLabel(round, totalRounds)}</h2>
          <div className="flex flex-col gap-3">
            {bracketMatches
              .filter((m) => m.matchday === round)
              .map((m) => (
                <BracketMatchCard key={m.id} tournamentId={tournamentId} match={m} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
