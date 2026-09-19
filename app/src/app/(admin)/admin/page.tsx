"use client";

import Link from "next/link";
import { useApi } from "@/_lib/use-api";

interface AdminStats {
  users: number;
  clubs: number;
  players: number;
  tournaments: number;
  matches: number;
  roleBreakdown: Record<string, number>;
  tournamentsByStatus: Record<string, number>;
  matchesByStatus: Record<string, number>;
}

const statCards = [
  { key: "users", label: "Usuarios", href: "/admin/usuarios", color: "#3B82F6" },
  { key: "clubs", label: "Clubes", href: "/admin/clubes", color: "#10B981" },
  { key: "players", label: "Jugadores", href: "/admin/jugadores", color: "#F59E0B" },
  { key: "tournaments", label: "Torneos", href: "/admin/torneos", color: "#8B5CF6" },
  { key: "matches", label: "Partidos", href: null, color: "#EF4444" },
] as const;

const roleLabels: Record<string, string> = {
  ORGANIZADOR: "Organizadores",
  CLUB_OWNER: "Dueños de club",
  JUGADOR: "Jugadores",
  SPONSOR: "Sponsors",
  FAN: "Fans",
};

export default function AdminDashboardPage() {
  const { data: stats, loading } = useApi<AdminStats>(() =>
    fetch("/api/admin/stats").then((r) => r.json())
  );

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="mt-1 font-body text-sm text-text-secondary">
          Vista general de la plataforma
        </p>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-5 gap-4">
        {statCards.map((card) => {
          const value = stats[card.key as keyof AdminStats] as number;
          const inner = (
            <div className="rounded-xl border border-border-primary bg-surface-primary p-5 transition-colors hover:border-brand-300">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: card.color + "15" }}
                >
                  <span className="font-heading text-lg font-bold" style={{ color: card.color }}>
                    {value}
                  </span>
                </div>
                <div>
                  <p className="font-heading text-2xl font-bold text-text-primary">{value}</p>
                  <p className="font-body text-xs text-text-secondary">{card.label}</p>
                </div>
              </div>
            </div>
          );

          return card.href ? (
            <Link key={card.key} href={card.href}>{inner}</Link>
          ) : (
            <div key={card.key}>{inner}</div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Roles breakdown */}
        <div className="rounded-xl border border-border-primary bg-surface-primary p-5">
          <h2 className="mb-4 font-heading text-base font-bold text-text-primary">
            Usuarios por rol
          </h2>
          <div className="flex flex-col gap-3">
            {Object.entries(stats.roleBreakdown).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <span className="font-body text-sm text-text-secondary">
                  {roleLabels[role] || role}
                </span>
                <span className="font-heading text-sm font-bold text-text-primary">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tournaments by status */}
        <div className="rounded-xl border border-border-primary bg-surface-primary p-5">
          <h2 className="mb-4 font-heading text-base font-bold text-text-primary">
            Torneos por estado
          </h2>
          <div className="flex flex-col gap-3">
            {Object.entries(stats.tournamentsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor:
                        status === "en_curso" ? "#10B981" : status === "inscripcion" ? "#F59E0B" : "#6B7280",
                    }}
                  />
                  <span className="font-body text-sm text-text-secondary capitalize">
                    {status.replace("_", " ")}
                  </span>
                </div>
                <span className="font-heading text-sm font-bold text-text-primary">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Matches by status */}
        <div className="rounded-xl border border-border-primary bg-surface-primary p-5">
          <h2 className="mb-4 font-heading text-base font-bold text-text-primary">
            Partidos por estado
          </h2>
          <div className="flex flex-col gap-3">
            {Object.entries(stats.matchesByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor:
                        status === "en_curso" ? "#10B981" : status === "programado" ? "#3B82F6" : "#6B7280",
                    }}
                  />
                  <span className="font-body text-sm text-text-secondary capitalize">
                    {status.replace("_", " ")}
                  </span>
                </div>
                <span className="font-heading text-sm font-bold text-text-primary">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-8 rounded-xl border border-border-primary bg-surface-primary p-5">
        <h2 className="mb-4 font-heading text-base font-bold text-text-primary">
          Acciones rápidas
        </h2>
        <div className="flex gap-3">
          <Link
            href="/admin/usuarios?crear=true"
            className="flex items-center gap-2 rounded-lg bg-surface-secondary px-4 py-2.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Crear usuario
          </Link>
          <Link
            href="/admin/clubes?crear=true"
            className="flex items-center gap-2 rounded-lg border border-border-primary px-4 py-2.5 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Crear club
          </Link>
        </div>
      </div>
    </div>
  );
}
