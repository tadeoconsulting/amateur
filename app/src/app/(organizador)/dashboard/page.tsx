"use client";

import { getTournaments } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { useAuth } from "@/lib/auth-context";

function IndicadorCard({ value, label, sub }: { value: number; label: string; sub: string }) {
  return (
    <div className="flex-1 rounded-lg bg-surface-secondary px-3 py-3">
      <p className="font-heading text-xl font-bold text-text-invert">{value}</p>
      <p className="font-heading text-xs font-semibold text-text-invert">{label}</p>
      <p className="font-body text-[10px] text-brand-500">{sub}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );
}

// Se espera a saber quién es el usuario para contar solo SUS torneos.
export default function DashboardPage() {
  const { user, loading } = useAuth();
  if (loading || !user) return <Spinner />;
  return <DashboardContent organizerId={user.id} />;
}

function DashboardContent({ organizerId }: { organizerId: string }) {
  const { data: tournaments, loading } = useApi(() => getTournaments({ organizerId }));

  if (loading || !tournaments) return <Spinner />;

  const activeTournaments = tournaments.filter((t) => t.status === "en_curso" || t.status === "inscripcion");
  const totalEquipos = tournaments.reduce((sum, t) => sum + t.teamsCount, 0);

  return (
    <div className="flex min-h-full flex-col px-4 pt-4">
      <h1 className="mb-4 font-heading text-2xl font-bold text-text-primary">Dashboard</h1>

      {/* Indicadores */}
      <div className="mb-3 flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-primary">
          <path d="M3 15l4-8 4 4 6-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h2 className="font-heading text-lg font-bold text-text-primary">Indicadores</h2>
      </div>

      <div className="mb-6 flex gap-2">
        <IndicadorCard value={activeTournaments.length} label="Torneos" sub="Activos" />
        <IndicadorCard value={totalEquipos} label="Equipos" sub="Inscritos" />
        <IndicadorCard value={tournaments.length} label="Torneos" sub="Total" />
      </div>
    </div>
  );
}
