"use client";

import Link from "next/link";
import { getTournaments, modalityLabel, type TournamentListItem } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { useAuth } from "@/lib/auth-context";
import { formatLabel } from "@/_lib/tournament-labels";

function TournamentCard({ tournament }: { tournament: TournamentListItem }) {
  return (
    <Link
      href={`/torneos/${tournament.id}`}
      className="block rounded-xl border border-border-primary p-4 transition-colors hover:bg-btn-regular"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-btn-regular flex items-center justify-center shrink-0 mt-0.5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 2h8v4a4 4 0 01-8 0V2zM3 3H1.5a.5.5 0 00-.5.5v1a2 2 0 002 2H3M13 3h1.5a.5.5 0 01.5.5v1a2 2 0 01-2 2h-.5M6 10v2M10 10v2M5 12h6a1 1 0 011 1v1H4v-1a1 1 0 011-1z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-sm font-bold text-text-primary truncate">
            {tournament.name}
          </p>
          <p className="font-body text-xs text-text-secondary mt-0.5">
            {tournament.category || "Libre"} | {new Date(tournament.startDate).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
          </p>

          <div className="flex flex-col gap-1 mt-2">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-text-secondary shrink-0">
                <path d="M7 1C4.24 1 2 3.24 2 6c0 3.5 5 7 5 7s5-3.5 5-7c0-2.76-2.24-5-5-5zm0 6.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="currentColor" />
              </svg>
              <span className="font-body text-xs text-text-secondary">{tournament.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-text-secondary shrink-0">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1" />
                <path d="M7 1.5L8.5 4.5H11L9 6.5L10 9.5L7 7.5L4 9.5L5 6.5L3 4.5H5.5L7 1.5Z" fill="currentColor" />
              </svg>
              <span className="font-body text-xs text-text-secondary">
                {[modalityLabel(tournament.modality), formatLabel(tournament.format)].filter(Boolean).join(" - ")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-text-secondary shrink-0">
                <path d="M2 4.5C2 3.67 2.67 3 3.5 3h7c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5h-7C2.67 11 2 10.33 2 9.5v-5z" stroke="currentColor" strokeWidth="1" />
                <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1" />
              </svg>
              <span className="font-body text-xs text-text-secondary">
                {tournament.teamsCount} equipos {tournament.teamsCount >= (tournament.maxTeams || 0) ? "completos" : `de ${tournament.maxTeams}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      {/* Illustration placeholder */}
      <div className="w-48 h-48 mb-6 flex items-center justify-center">
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none">
          <circle cx="80" cy="90" r="50" fill="var(--color-brand-200)" />
          <rect x="55" y="100" width="50" height="40" rx="4" fill="var(--color-brand-300)" />
          {/* Goal posts */}
          <rect x="40" y="80" width="4" height="50" fill="var(--color-text-secondary)" rx="2" />
          <rect x="116" y="80" width="4" height="50" fill="var(--color-text-secondary)" rx="2" />
          <rect x="40" y="78" width="80" height="4" fill="var(--color-text-secondary)" rx="2" />
          {/* Player body */}
          <rect x="72" y="50" width="16" height="36" rx="3" fill="var(--color-field-green)" />
          <text x="80" y="72" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white">10</text>
          {/* Head */}
          <circle cx="80" cy="44" r="8" fill="var(--color-brand-700)" />
          {/* Legs */}
          <rect x="74" y="86" width="4" height="20" fill="var(--color-text-secondary)" rx="2" />
          <rect x="82" y="86" width="4" height="20" fill="var(--color-text-secondary)" rx="2" />
          {/* Ball */}
          <circle cx="105" cy="55" r="8" fill="white" stroke="var(--color-text-secondary)" strokeWidth="1.5" />
        </svg>
      </div>

      <h2 className="font-heading text-xl font-bold text-text-primary mb-2">
        Crea tu primer torneo
      </h2>
      <p className="font-body text-sm text-text-secondary mb-8 max-w-[260px]">
        Sencillo y rápido, con el seguimiento adecuado y en tiempo real
      </p>

      <Link
        href="/crear-torneo"
        className="w-full max-w-[300px] rounded-lg border border-border-primary py-3.5 text-center font-heading text-sm font-bold text-text-primary hover:bg-btn-regular transition-colors"
      >
        Crear torneo
      </Link>
    </div>
  );
}

function LiveMatchBar() {
  return null;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );
}

// Se espera a saber quién es el usuario para pedir solo SUS torneos.
export default function TorneosPage() {
  const { user, loading } = useAuth();
  if (loading || !user) return <Spinner />;
  return <TorneosContent organizerId={user.id} />;
}

function TorneosContent({ organizerId }: { organizerId: string }) {
  const { data: tournaments, loading } = useApi(() => getTournaments({ organizerId }));

  if (loading || !tournaments) return <Spinner />;

  const hasTournaments = tournaments.length > 0;

  return (
    <div className="flex flex-col min-h-full">
      {hasTournaments ? (
        <div className="px-4 pt-4 flex-1">
          {/* Mis torneos */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-text-primary">
                <path
                  d="M4.5 2h9v4a4.5 4.5 0 01-9 0V2zM3.5 3H2a.5.5 0 00-.5.5v1A2.5 2.5 0 004 7h.5M14.5 3H16a.5.5 0 01.5.5v1A2.5 2.5 0 0114 7h-.5M7 11v2M11 11v2M6 13h6a1 1 0 011 1v1H5v-1a1 1 0 011-1z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h2 className="font-heading text-base font-bold text-text-primary">Mis torneos</h2>
            </div>
            <Link href="/torneos/todos" className="font-heading text-sm font-semibold text-text-primary underline cursor-pointer">
              Ver todos
            </Link>
          </div>

          <div className="flex flex-col gap-3 mb-6">
            {tournaments.map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>

          {/* Crear torneo button */}
          <Link
            href="/crear-torneo"
            className="block w-full rounded-lg bg-surface-secondary py-3.5 text-center font-heading text-sm font-bold text-text-invert hover:bg-brand-700 transition-colors mb-6"
          >
            Crear torneo
          </Link>

          {/* Sponsors */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-base font-bold text-text-primary">Sponsors</h2>
            </div>
            <button className="font-heading text-sm font-semibold text-text-primary underline cursor-pointer">
              Ver Datos
            </button>
          </div>
        </div>
      ) : (
        <EmptyState />
      )}

      {hasTournaments && <LiveMatchBar />}
    </div>
  );
}
