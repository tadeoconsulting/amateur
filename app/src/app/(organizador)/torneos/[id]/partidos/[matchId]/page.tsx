"use client";

import { useParams } from "next/navigation";
import { BackHeader } from "@/_components/back-header";
import { MatchTimeline } from "@/_components/match-timeline";
import { useApi } from "@/_lib/use-api";
import type { MatchListItem } from "@/_lib/api";
import { UNSCHEDULED_LABEL } from "@/_lib/match-format";
import { liveMinute } from "@/_lib/match-live";
import { useState } from "react";

function TeamLogo({ shortName }: { shortName: string }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-300 text-[9px] font-bold text-text-primary">
      {shortName.slice(0, 2)}
    </div>
  );
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${days[date.getUTCDay()]}. ${date.getUTCDate().toString().padStart(2, "0")} ${months[date.getUTCMonth()]}`;
}

type MatchEventRow = {
  id: string;
  type: "gol" | "tarjeta_amarilla" | "tarjeta_roja" | "sustitucion";
  minute: number;
  playerName: string | null;
  teamId: string;
};

export default function MatchDetailPage() {
  const params = useParams<{ id: string; matchId: string }>();
  const { data: match, loading: loadingMatch } = useApi<MatchListItem>(() =>
    fetch(`/api/matches/${params.matchId}`).then((r) => r.json())
  );
  const { data: events, loading: loadingEvents } = useApi<MatchEventRow[]>(() =>
    fetch(`/api/matches/${params.matchId}/events`).then((r) => r.json())
  );
  const [now] = useState(() => Date.now());

  if (loadingMatch || !match) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  // Un intento de la tanda de penales (especificación 007) no es una jugada de un jugador
  // puntual: no tiene lugar en esta línea de tiempo, que solo entiende gol/tarjeta/cambio.
  // Se resume aparte, más abajo, junto al resultado.
  const eventList = (events ?? [])
    .filter((e) => (e.type as string) !== "penal_definicion")
    .map((e) => ({
      ...e,
      matchId: params.matchId,
      playerId: "",
      playerName: e.playerName ?? "",
    }));
  const showScore = match.status === "en_curso" || match.status === "finalizado";
  const byPenalties = Boolean(match.decisive && match.winnerTeamId && match.homeScore === match.awayScore);

  return (
    <div className="w-full">
      <BackHeader />

      {/* Match Info Card */}
      <div className="mx-4 mt-2 overflow-hidden rounded-xl border border-brand-200">
        <div className="border-l-4 border-l-brand-900 bg-surface-alt px-3 py-1.5">
          <span className="font-heading text-xs font-semibold text-text-primary">
            {match.groupName ?? "Partido"} | {match.time === "" ? UNSCHEDULED_LABEL : formatShortDate(match.date)}
          </span>
        </div>
        <div className="flex">
          <div className="flex-1 space-y-1 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <TeamLogo shortName={match.homeTeam?.shortName ?? "?"} />
              <span className="flex-1 text-sm text-text-primary">{match.homeTeam?.name ?? "Por definir"}</span>
              {showScore && (
                <span className="text-lg font-bold tabular-nums text-text-primary">{match.homeScore}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <TeamLogo shortName={match.awayTeam?.shortName ?? "?"} />
              <span className="flex-1 text-sm text-text-primary">{match.awayTeam?.name ?? "Por definir"}</span>
              {showScore && (
                <span className="text-lg font-bold tabular-nums text-text-primary">{match.awayScore}</span>
              )}
            </div>
          </div>
          <div className="flex w-20 flex-col items-center justify-center border-l border-brand-200 px-2 text-center">
            {match.status === "en_curso" && (
              <span className="text-base font-bold text-verification">{liveMinute(match.startedAt, now)}&quot;</span>
            )}
            {match.status === "finalizado" && (
              <span className="text-base font-bold text-text-primary">FT</span>
            )}
            {match.status === "programado" && (
              <span className="text-xs text-text-secondary">{match.time === "" ? UNSCHEDULED_LABEL : match.time}</span>
            )}
            <span className="mt-0.5 text-[10px] text-text-secondary">Fecha {match.matchday}</span>
          </div>
        </div>
      </div>

      {byPenalties && (
        <div className="mx-4 mt-3 rounded-xl bg-btn-regular px-4 py-3 text-center">
          <p className="font-body text-sm text-text-secondary">
            Se definió por penales: {match.penaltyHomeScore ?? 0}-{match.penaltyAwayScore ?? 0}
          </p>
        </div>
      )}

      {/* Content based on status */}
      {match.status === "programado" && (
        <div className="mt-8 flex flex-col items-center px-4 pb-8">
          <div className="flex h-64 w-64 items-center justify-center rounded-full bg-brand-100">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="text-brand-300">
              <circle cx="60" cy="60" r="50" stroke="currentColor" strokeWidth="2" />
              <circle cx="60" cy="60" r="20" stroke="currentColor" strokeWidth="1.5" />
              <path d="M60 10v20M60 90v20M10 60h20M90 60h20" stroke="currentColor" strokeWidth="1.5" />
              <path d="M25 25l14 14M81 81l14 14M25 95l14-14M81 39l14-14" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>
          <p className="mt-6 font-body text-base text-text-secondary">Aun no inicia el partido</p>
        </div>
      )}

      {(match.status === "en_curso" || match.status === "finalizado") && eventList.length > 0 && (
        <MatchTimeline
          events={eventList}
          // en_curso/finalizado exige los dos equipos definidos (la API no deja arrancar un
          // partido "por definir"), así que acá homeTeam siempre existe.
          homeTeamId={match.homeTeam!.id}
          status={match.status === "en_curso" ? "en_vivo" : "finalizado"}
        />
      )}

      {(match.status === "en_curso" || match.status === "finalizado") && eventList.length === 0 && !byPenalties && (
        <div className="px-4 py-12 text-center">
          <p className="text-sm text-text-secondary">No hay eventos registrados</p>
        </div>
      )}
    </div>
  );
}
