"use client";

import Link from "next/link";
import {
  getTournaments,
  getTournamentRequests,
  getScorers,
  type TournamentListItem,
  type TournamentRequestItem,
  type ScorerRow,
} from "@/_lib/api";
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

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {icon}
      <h2 className="font-heading text-lg font-bold text-text-primary">{title}</h2>
      {count !== undefined && <span className="font-body text-sm text-text-secondary">({count})</span>}
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-border-primary px-4 py-5 text-center font-body text-sm text-text-secondary">
      {children}
    </p>
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
    <div className="flex min-h-full flex-col px-4 pt-4 pb-6">
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

      {tournaments.length > 0 && (
        <>
          <SolicitudesPendientes tournaments={tournaments} />
          <Goleadores tournaments={tournaments} />
        </>
      )}
    </div>
  );
}

/** Solicitudes de un club pidiendo unirse a alguno de mis torneos — lo mismo que llena
 * /notificaciones, pero solo una vista previa acá. */
function SolicitudesPendientes({ tournaments }: { tournaments: TournamentListItem[] }) {
  const { data: solicitudes, loading } = useApi<(TournamentRequestItem & { tournamentName: string })[]>(async () => {
    const perTournament = await Promise.all(
      tournaments.map((t) =>
        getTournamentRequests(t.id, { kind: "request", status: "pending" }).then((reqs) =>
          reqs.map((r) => ({ ...r, tournamentName: t.name }))
        )
      )
    );
    return perTournament.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  const items = solicitudes ?? [];
  const preview = items.slice(0, 3);

  return (
    <div className="mb-6">
      <SectionHeader
        icon={
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-primary">
            <path
              d="M15.5 8a5.5 5.5 0 10-11 0c0 6.5-2.5 8-2.5 8h16s-2.5-1.5-2.5-8zM11.44 18a1.5 1.5 0 01-2.88 0"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
        title="Solicitudes pendientes"
        count={loading ? undefined : items.length}
      />

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyRow>Sin solicitudes pendientes.</EmptyRow>
      ) : (
        <div className="flex flex-col gap-2">
          {preview.map((s) => (
            <Link
              key={s.id}
              href="/notificaciones"
              className="flex items-center justify-between rounded-xl border border-border-primary p-3 transition-colors hover:bg-btn-regular"
            >
              <div className="min-w-0">
                <p className="truncate font-heading text-sm font-bold text-text-primary">
                  {s.club.name} quiere unirse a {s.tournamentName}
                </p>
                <p className="mt-0.5 truncate font-body text-xs text-text-secondary">
                  Pedido por {s.createdBy.firstName} {s.createdBy.lastName}
                </p>
              </div>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 text-text-secondary">
                <path d="M6.75 3.75L12.75 9L6.75 14.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ))}
          {items.length > preview.length && (
            <Link href="/notificaciones" className="text-center font-heading text-xs font-bold text-text-primary underline">
              Ver las {items.length} solicitudes
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/** Top 5 goleadores combinando los torneos en curso (los únicos con partidos jugados). */
function Goleadores({ tournaments }: { tournaments: TournamentListItem[] }) {
  const activeIds = tournaments.filter((t) => t.status === "en_curso").map((t) => t.id);
  const { data: scorers, loading } = useApi<(ScorerRow & { tournamentName: string })[]>(async () => {
    if (activeIds.length === 0) return [];
    const perTournament = await Promise.all(
      activeIds.map((id) => {
        const tournament = tournaments.find((t) => t.id === id);
        return getScorers(id).then((rows) => rows.map((r) => ({ ...r, tournamentName: tournament?.name ?? "" })));
      })
    );
    return perTournament.flat().sort((a, b) => b.goals - a.goals).slice(0, 5);
  });

  const items = scorers ?? [];

  return (
    <div>
      <SectionHeader
        icon={
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-primary">
            <path
              d="M6 2.5h8v3a4 4 0 01-8 0v-3zM4.5 3.5H2a.4.4 0 00-.4.4v1.2a2.4 2.4 0 002.4 2.4h.4M15.5 3.5H18a.4.4 0 01.4.4v1.2a2.4 2.4 0 01-2.4 2.4h-.4M9 9.5v2.5M11 9.5v2.5M7.5 15h5a1 1 0 011 1v1h-7v-1a1 1 0 011-1z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
        title="Goleadores"
        count={loading ? undefined : items.length}
      />

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyRow>Todavía no hay goles registrados en tus torneos en curso.</EmptyRow>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((s, i) => (
            <div key={`${s.playerId}-${s.tournamentName}`} className="flex items-center gap-3 rounded-xl border border-border-primary p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-300 font-heading text-xs font-bold text-text-primary">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-sm font-semibold text-text-primary">
                  {s.firstName} {s.lastName}
                </p>
                <p className="truncate font-body text-xs text-text-secondary">
                  {s.clubName} · {s.tournamentName}
                </p>
              </div>
              <p className="shrink-0 font-heading text-base font-bold text-text-primary">{s.goals}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
