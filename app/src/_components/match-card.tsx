"use client";

import Link from "next/link";
import type { Match } from "@/_lib/types";
import { MatchStatusBadge } from "./status-badge";

function ClubName({ name, shortName }: { name: string; shortName: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-300 text-xs font-bold text-text-primary">
        {shortName.slice(0, 2)}
      </div>
      <span className="text-sm font-medium text-text-primary">{name}</span>
    </div>
  );
}

export function MatchCard({ match }: { match: Match }) {
  const showScore = match.status === "en_vivo" || match.status === "finalizado";

  return (
    <Link
      href={`/torneos/${match.tournamentId}/partidos/${match.id}`}
      className="group block rounded-xl border border-brand-200 bg-white p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">
          Fecha {match.matchday} &middot; {match.time}
        </span>
        <MatchStatusBadge status={match.status} />
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <ClubName name={match.homeTeam.name} shortName={match.homeTeam.shortName} />
          {showScore && (
            <span className="text-lg font-bold tabular-nums text-text-primary">
              {match.homeScore}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <ClubName name={match.awayTeam.name} shortName={match.awayTeam.shortName} />
          {showScore && (
            <span className="text-lg font-bold tabular-nums text-text-primary">
              {match.awayScore}
            </span>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs text-text-secondary">{match.location}</p>
    </Link>
  );
}
