"use client";

import Link from "next/link";
import { getMatches, type MatchListItem } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";

export default function JugadorTorneosPage() {
  const { data: matches, loading } = useApi(() => getMatches());

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center pt-32">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const allMatches = matches ?? [];

  if (allMatches.length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-2 px-4 pt-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-text-primary">
            <path
              d="M6 3h12v5a6 6 0 01-12 0V3zM5 4H3a1 1 0 00-1 1v1.5a3 3 0 003 3h.5M19 4h2a1 1 0 011 1v1.5a3 3 0 01-3 3h-.5M8 14v3M16 14v3M7 17h10a1 1 0 011 1v2H6v-2a1 1 0 011-1z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h1 className="font-heading text-xl font-bold text-text-primary">Actividad</h1>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6 pt-32 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mb-4 text-brand-300">
            <path d="M6 3h12v5a6 6 0 01-12 0V3z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 4H3a1 1 0 00-1 1v1.5a3 3 0 003 3h.5M19 4h2a1 1 0 011 1v1.5a3 3 0 01-3 3h-.5M8 14v3M16 14v3M7 17h10a1 1 0 011 1v2H6v-2a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h2 className="font-heading text-lg font-bold text-text-primary">Sin actividad</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Aún no tienes partidos programados. Únete a un equipo para empezar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 px-4 pt-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-text-primary">
          <path
            d="M6 3h12v5a6 6 0 01-12 0V3zM5 4H3a1 1 0 00-1 1v1.5a3 3 0 003 3h.5M19 4h2a1 1 0 011 1v1.5a3 3 0 01-3 3h-.5M8 14v3M16 14v3M7 17h10a1 1 0 011 1v2H6v-2a1 1 0 011-1z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h1 className="font-heading text-xl font-bold text-text-primary">Actividad</h1>
      </div>

      <div className="mt-4 space-y-2 px-4 pb-8">
        {allMatches.map((m: MatchListItem) => (
          <Link
            key={m.id}
            href={`/jugador/torneos/${m.tournamentId}`}
            className="flex items-center justify-between rounded-lg border border-brand-100 px-3 py-2.5"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-200">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-text-secondary">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <span className="text-sm text-text-primary">{m.homeTeam.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-text-primary">
                {m.homeScore ?? "-"} : {m.awayScore ?? "-"}
              </span>
              <span className="text-xs text-text-secondary">{m.awayTeam.name}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
