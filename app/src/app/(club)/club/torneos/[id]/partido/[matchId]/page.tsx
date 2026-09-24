"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useApi } from "@/_lib/use-api";
import type { MatchListItem } from "@/_lib/api";
import { formatWhen, formatWhenSentence } from "@/_lib/match-format";

interface MatchEventItem {
  id: string;
  matchId: string;
  teamId: string;
  playerName: string;
  type: string;
  minute: number;
}

export default function ClubPartidoDetallePage() {
  const { id, matchId } = useParams<{ id: string; matchId: string }>();

  const { data: matchData, loading } = useApi(async () => {
    const res = await fetch(`/api/matches/${matchId}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json() as Promise<MatchListItem & { events?: MatchEventItem[] }>;
  });

  if (loading || !matchData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const match = matchData;
  const events: MatchEventItem[] = match.events ?? [];
  const isLive = match.status === "en_curso";
  const isFinished = match.status === "finalizado";
  const isScheduled = match.status === "programado";

  const homeEvents = events.filter((e) => e.teamId === match.homeTeam?.id);
  const awayEvents = events.filter((e) => e.teamId === match.awayTeam?.id);
  const allMinutes = [...new Set(events.map((e) => e.minute))].sort((a, b) => a - b);

  return (
    <div className="flex min-h-dvh flex-col pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link href={`/club/torneos/${id}`} className="shrink-0 p-1 text-text-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="font-heading text-lg font-bold text-text-primary">
          {isLive ? "En vivo" : isFinished ? "Resultado" : "Partido"}
        </h1>
      </div>

      {/* Match card */}
      <div className="mx-4 mt-2 rounded-xl border border-border-primary p-4">
        {/* Status badge */}
        <div className="flex justify-center">
          {isLive && (
            <span className="rounded-full bg-verification px-3 py-1 font-heading text-xs font-bold text-white">
              75&apos; En vivo
            </span>
          )}
          {isFinished && (
            <span className="rounded-full bg-brand-200 px-3 py-1 font-heading text-xs font-bold text-text-secondary">
              FT · Finalizado
            </span>
          )}
          {isScheduled && (
            <span className="rounded-full bg-brand-100 px-3 py-1 font-heading text-xs font-bold text-text-secondary">
              {formatWhen(match)}
            </span>
          )}
        </div>

        {/* Teams and score */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-200 font-heading text-xs font-bold">
              {match.homeTeam?.shortName ?? "?"}
            </div>
            <span className="max-w-[80px] text-center font-body text-xs text-text-primary">{match.homeTeam?.name ?? "Por definir"}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-heading text-3xl font-bold text-text-primary">
              {match.homeScore ?? 0}
            </span>
            <span className="font-heading text-lg text-text-secondary">-</span>
            <span className="font-heading text-3xl font-bold text-text-primary">
              {match.awayScore ?? 0}
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-200 font-heading text-xs font-bold">
              {match.awayTeam?.shortName ?? "?"}
            </div>
            <span className="max-w-[80px] text-center font-body text-xs text-text-primary">{match.awayTeam?.name ?? "Por definir"}</span>
          </div>
        </div>

        <p className="mt-3 text-center font-body text-xs text-text-secondary">
          {match.location} · {match.groupName}
        </p>
      </div>

      {/* Titulares link (for club) */}
      {(isLive || isScheduled) && (
        <div className="mx-4 mt-3">
          <Link
            href={`/club/torneos/${id}/titulares`}
            className="flex items-center justify-between rounded-xl border border-border-primary p-3 transition-colors hover:bg-btn-regular"
          >
            <span className="font-heading text-sm font-bold text-text-primary">Definir titulares</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-text-secondary">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      )}

      {/* Timeline */}
      {events.length > 0 && (
        <div className="mt-6 px-4">
          <h3 className="font-heading text-sm font-bold text-text-primary">Cronología</h3>
          <div className="mt-3 relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border-primary" />
            {allMinutes.map((minute) => {
              const eventsAtMinute = events.filter((e) => e.minute === minute);
              return (
                <div key={minute} className="relative mb-4 flex items-center">
                  {/* Home side events */}
                  <div className="flex w-[calc(50%-16px)] flex-col items-end gap-1 pr-3">
                    {eventsAtMinute
                      .filter((e) => e.teamId === match.homeTeam?.id)
                      .map((e) => (
                        <div key={e.id} className="flex items-center gap-1.5">
                          <span className="font-body text-xs text-text-primary">{e.playerName}</span>
                          {e.type === "gol" && (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1" className="text-text-primary" />
                              <path d="M7 1.75l1 2h-2l1-2zM3.5 5l2 1-1 2-2-1 1-2zM10.5 5l-2 1 1 2 2-1-1-2zM5 10.5l2-1 2 1-1 2H6l-1-2z" fill="currentColor" opacity="0.5" className="text-text-primary" />
                            </svg>
                          )}
                          {e.type === "tarjeta_amarilla" && (
                            <div className="h-3.5 w-2.5 rounded-sm bg-yellow" />
                          )}
                          {e.type === "tarjeta_roja" && (
                            <div className="h-3.5 w-2.5 rounded-sm bg-error" />
                          )}
                        </div>
                      ))}
                  </div>

                  {/* Center minute */}
                  <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border-primary bg-white">
                    <span className="font-heading text-[10px] font-bold text-text-primary">{minute}&apos;</span>
                  </div>

                  {/* Away side events */}
                  <div className="flex w-[calc(50%-16px)] flex-col items-start gap-1 pl-3">
                    {eventsAtMinute
                      .filter((e) => e.teamId === match.awayTeam?.id)
                      .map((e) => (
                        <div key={e.id} className="flex items-center gap-1.5">
                          {e.type === "gol" && (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1" className="text-text-primary" />
                              <path d="M7 1.75l1 2h-2l1-2z" fill="currentColor" opacity="0.5" className="text-text-primary" />
                            </svg>
                          )}
                          {e.type === "tarjeta_amarilla" && (
                            <div className="h-3.5 w-2.5 rounded-sm bg-yellow" />
                          )}
                          {e.type === "tarjeta_roja" && (
                            <div className="h-3.5 w-2.5 rounded-sm bg-error" />
                          )}
                          <span className="font-body text-xs text-text-primary">{e.playerName}</span>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state for scheduled matches */}
      {isScheduled && events.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 px-4">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-text-secondary">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-center font-body text-sm text-text-secondary">
            El partido aún no ha comenzado
          </p>
          <p className="text-center font-body text-xs text-text-secondary">
            {formatWhenSentence(match)}{match.location ? ` en ${match.location}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
