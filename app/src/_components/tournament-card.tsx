import Link from "next/link";
import type { Tournament } from "@/_lib/types";
import { TournamentStatusBadge } from "./status-badge";

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  const progress =
    tournament.totalMatches > 0
      ? Math.round((tournament.matchesPlayed / tournament.totalMatches) * 100)
      : 0;

  return (
    <Link
      href={`/torneos/${tournament.id}`}
      className="group block rounded-xl border border-brand-200 bg-white p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-text-primary group-hover:underline">
            {tournament.name}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            {tournament.location}
          </p>
        </div>
        <TournamentStatusBadge status={tournament.status} />
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm text-text-secondary">
        <span>{tournament.teamsCount}/{tournament.maxTeams} equipos</span>
        <span className="text-brand-200">|</span>
        <span>{formatDate(tournament.startDate)}</span>
      </div>

      {tournament.status === "en_curso" && tournament.totalMatches > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>{tournament.matchesPlayed} de {tournament.totalMatches} partidos</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-brand-300">
            <div
              className="h-1.5 rounded-full bg-verification transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}
