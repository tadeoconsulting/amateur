"use client";

import Link from "next/link";
import type { Match } from "@/_lib/types";

function TeamLogo({ shortName }: { shortName: string }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-300 text-[9px] font-bold text-text-primary">
      {shortName.slice(0, 2)}
    </div>
  );
}

export function TournamentMatchCard({
  match,
  showDefineLineup,
}: {
  match: Match;
  showDefineLineup?: boolean;
}) {
  const showScore = match.status === "en_vivo" || match.status === "finalizado";
  const dateStr = formatShortDate(match.date);

  const statusLabels: Record<string, string> = {
    programado: `Fecha ${match.matchday}`,
    en_vivo: "En vivo",
    finalizado: "Finalizado",
    suspendido: "Suspendido",
  };

  return (
    <div>
      <Link
        href={`/torneos/${match.tournamentId}/partidos/${match.id}`}
        className="block rounded-xl border border-brand-200 overflow-hidden"
      >
        {match.group && (
          <div className="border-l-4 border-l-brand-900 bg-surface-alt px-3 py-1.5">
            <span className="font-heading text-xs font-semibold text-text-primary">{match.group}</span>
          </div>
        )}
        <div className="flex">
          <div className="flex-1 space-y-1 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <TeamLogo shortName={match.homeTeam.shortName} />
              <span className="flex-1 text-sm text-text-primary">{match.homeTeam.name}</span>
              {showScore && (
                <span className="text-base font-bold tabular-nums text-text-primary">{match.homeScore}</span>
              )}
              {!showScore && <span className="text-sm text-text-secondary">-</span>}
            </div>
            <div className="flex items-center gap-2">
              <TeamLogo shortName={match.awayTeam.shortName} />
              <span className="flex-1 text-sm text-text-primary">{match.awayTeam.name}</span>
              {showScore && (
                <span className="text-base font-bold tabular-nums text-text-primary">{match.awayScore}</span>
              )}
              {!showScore && <span className="text-sm text-text-secondary">-</span>}
            </div>
          </div>
          <div className="flex w-24 flex-col items-center justify-center border-l border-brand-200 px-2 text-center">
            <span className={`text-xs font-medium ${match.status === "en_vivo" ? "text-verification" : "text-text-primary"}`}>
              {statusLabels[match.status]}
            </span>
            <span className="mt-0.5 text-[10px] text-text-secondary">{dateStr}</span>
          </div>
        </div>
      </Link>
      {showDefineLineup && (
        <button className="mt-3 w-full rounded-lg bg-btn-primary py-3 font-heading text-sm font-semibold text-text-invert transition-colors hover:bg-btn-secondary">
          Definir titulares
        </button>
      )}
    </div>
  );
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const days = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${days[date.getDay()]}. ${date.getDate()} ${months[date.getMonth()]}`;
}
