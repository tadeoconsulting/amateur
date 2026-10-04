"use client";

import Link from "next/link";
import { getMatches } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { useAuth } from "@/lib/auth-context";

function Spinner() {
  return (
    <div className="flex w-full items-center justify-center pt-32">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );
}

function JugadorMisTorneosContent({ userId }: { userId: string }) {
  // Los torneos del jugador son los de los partidos de su club (mismo dato que "Actividad").
  const { data: matches, loading } = useApi(() => getMatches({ playerId: userId }));

  if (loading) return <Spinner />;

  const tournaments = [...new Map((matches ?? []).flatMap((m) => (m.tournament ? [[m.tournament.id, m.tournament] as const] : []))).values()].sort(
    (a, b) => a.name.localeCompare(b.name)
  );

  return (
    <div className="w-full pb-8">
      <h1 className="px-4 pt-4 font-heading text-lg font-bold tracking-wide text-text-primary">Torneos</h1>

      {tournaments.length === 0 ? (
        <div className="flex flex-col items-center px-6 pt-32 text-center">
          <h2 className="font-heading text-lg font-bold text-text-primary">Sin torneos</h2>
          <p className="mt-2 text-sm text-text-secondary">Tu equipo todavía no juega ningún torneo.</p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2 px-4">
          {tournaments.map((t) => (
            <li key={t.id}>
              <Link
                href={`/jugador/torneos/${t.id}`}
                className="flex items-center gap-2 rounded border border-border-primary bg-surface-primary px-3 py-3"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-surface-secondary text-text-invert">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M6 3h12v5a6 6 0 01-12 0V3zM5 4H3a1 1 0 00-1 1v1.5a3 3 0 003 3h.5M19 4h2a1 1 0 011 1v1.5a3 3 0 01-3 3h-.5M8 14v3M16 14v3M7 17h10a1 1 0 011 1v2H6v-2a1 1 0 011-1z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="min-w-0 flex-1 truncate font-heading text-sm font-bold text-text-primary">{t.name}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-text-primary">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function JugadorMisTorneosPage() {
  const { user, loading: loadingAuth } = useAuth();
  if (loadingAuth || !user) return <Spinner />;
  // `key`: ver el comentario en jugador/torneos/page.tsx.
  return <JugadorMisTorneosContent key={user.id} userId={user.id} />;
}
