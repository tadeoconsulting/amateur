import type { Tournament } from "@/_lib/types";
import { TournamentStatusBadge } from "./status-badge";

const formatLabels: Record<string, string> = {
  liga: "Liga",
  eliminacion: "Eliminacion directa",
  grupos: "Grupos",
};

export function TournamentHeader({ tournament }: { tournament: Tournament }) {
  return (
    <div className="mx-4 flex items-center gap-3 rounded-xl bg-surface-secondary px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700">
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
          <path
            d="M4 2h8v4a4 4 0 01-8 0V2zM3 3H1.5a.5.5 0 00-.5.5v1a2 2 0 002 2H3M13 3h1.5a.5.5 0 01.5.5v1a2 2 0 01-2 2h-.5M6 10v2M10 10v2M5 12h6a1 1 0 011 1v1H4v-1a1 1 0 011-1z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-brand-500"
          />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-sm font-bold text-text-invert">{tournament.name}</p>
        <p className="mt-0.5 text-xs text-brand-500">
          {tournament.teamsCount} equipos | {formatLabels[tournament.format] ?? tournament.format}
          {tournament.category ? ` | ${tournament.category}` : ""} | <TournamentStatusBadge status={tournament.status} />
        </p>
      </div>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 text-brand-500">
        <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
