"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  getTournaments,
  getTournament,
  getMatches,
  getStandings,
  getScorers,
  type TournamentListItem,
  type MatchListItem,
  type StandingsRow,
  type ScorerRow,
} from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { formatLabel } from "@/_lib/tournament-labels";

type Tab = "partidos" | "llaves" | "tabla" | "goleadores";
type ConvocatoriaTab = "inscritos" | "solicitudes" | "invitados";

const competenciaTabs: { key: Tab; label: string }[] = [
  { key: "partidos", label: "Partidos" },
  { key: "llaves", label: "Llaves" },
  { key: "tabla", label: "Tabla" },
  { key: "goleadores", label: "Goleadores" },
];

const convocatoriaTabs: { key: ConvocatoriaTab; label: string }[] = [
  { key: "inscritos", label: "Inscritos" },
  { key: "solicitudes", label: "Solicitudes" },
  { key: "invitados", label: "Invitados" },
];

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${days[d.getUTCDay()]}. ${String(d.getUTCDate()).padStart(2, "0")} ${months[d.getUTCMonth()]}`;
}

function formatLongDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return `${days[d.getUTCDay()]} ${d.getUTCDate()} de ${months[d.getUTCMonth()]}`;
}

function statusLabel(status: string) {
  switch (status) {
    case "en_curso":
      return { text: "Activo", color: "bg-field-green text-white" };
    case "inscripcion":
      return { text: "Convocatoria", color: "bg-amber-500 text-white" };
    case "finalizado":
      return { text: "Finalizado", color: "bg-brand-500 text-white" };
    default:
      return { text: status, color: "bg-brand-500 text-white" };
  }
}

export default function TournamentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("partidos");
  const [activeConvTab, setActiveConvTab] = useState<ConvocatoriaTab>("inscritos");
  const [showSelector, setShowSelector] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState(params.id);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [teamError, setTeamError] = useState("");

  const { data: tournament, loading: loadingTournament, refetch } = useApi(() => getTournament(params.id));
  const { data: allTournaments } = useApi(() => getTournaments());
  const { data: tournamentMatches } = useApi(() => getMatches({ tournamentId: params.id }));
  const { data: standings } = useApi(() => getStandings(params.id));
  const { data: scorers } = useApi(() => getScorers(params.id));

  if (loadingTournament || !tournament) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  async function removeTeam(clubId: string) {
    setTeamError("");
    setRemovingId(clubId);
    try {
      const res = await fetch(`/api/tournaments/${params.id}/teams/${clubId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setTeamError(data.error ?? "No se pudo quitar el equipo");
        return;
      }
      refetch();
    } finally {
      setRemovingId(null);
    }
  }

  const isConvocatoria = tournament.status === "inscripcion";
  const badge = statusLabel(tournament.status);
  const matches = tournamentMatches || [];
  const tournaments = allTournaments || [];

  const groups = [...new Set(matches.map((m) => m.groupName).filter(Boolean))].sort() as string[];

  const matchesByGroup: Record<string, MatchListItem[]> = {};
  for (const m of matches) {
    const g = m.groupName || "Sin grupo";
    if (!matchesByGroup[g]) matchesByGroup[g] = [];
    matchesByGroup[g].push(m);
  }

  return (
    <div className="w-full pb-8">
      {/* Header */}
      <header className="px-4 py-3">
        <Link
          href="/torneos/todos"
          className="flex items-center gap-1 font-heading text-sm font-semibold text-text-primary"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180">
            <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver a Mis Torneos
        </Link>
      </header>

      {/* Tournament card — clickable */}
      <button
        onClick={() => { setSelectedTournamentId(params.id); setShowSelector(true); }}
        className="mx-4 mt-2 flex w-[calc(100%-2rem)] cursor-pointer items-center gap-3 rounded-xl bg-surface-secondary px-4 py-3 text-left transition-opacity hover:opacity-90"
      >
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
          <p className="truncate font-heading text-sm font-bold text-text-invert">
            {tournament.name}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-brand-500">
            {isConvocatoria
              ? `${tournament._count.teams}/${tournament.maxTeams || "?"} equipos`
              : `${tournament._count.teams} equipos`} | {formatLabel(tournament.format)} | {tournament.category || "Libre"}
            {!isConvocatoria && (
              <>
                {" | "}
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.color}`}>
                  {badge.text}
                </span>
              </>
            )}
          </p>
        </div>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={`shrink-0 text-brand-500 transition-transform ${showSelector ? "rotate-180" : ""}`}>
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Tabs */}
      <div className="mt-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
        {isConvocatoria
          ? convocatoriaTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveConvTab(tab.key)}
                className={`shrink-0 cursor-pointer rounded-lg px-5 py-2.5 font-heading text-sm font-medium transition-colors ${
                  activeConvTab === tab.key
                    ? "bg-surface-secondary text-text-invert"
                    : "border border-border-primary text-text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))
          : competenciaTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 cursor-pointer rounded-lg px-5 py-2.5 font-heading text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-surface-secondary text-text-invert"
                    : "border border-border-primary text-text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
      </div>

      {/* === Convocatoria: equipos inscritos === */}
      {isConvocatoria && activeConvTab === "inscritos" && tournament.teams.length > 0 && (
        <div className="mt-4 px-4">
          <div className="flex flex-col">
            {tournament.teams.map((team) => (
              <div key={team.id} className="flex items-center gap-3 border-b border-brand-200 py-3.5 last:border-0">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-heading text-xs font-bold text-white"
                  style={{ backgroundColor: team.club.color ?? "var(--color-brand-500)" }}
                >
                  {team.club.shortName.slice(0, 3).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-sm font-bold text-text-primary">{team.club.name}</p>
                  <p className="mt-0.5 truncate font-body text-xs text-text-secondary">
                    {team.club.isTemporary
                      ? "Equipo temporal"
                      : team.club.delegadoNombre
                        ? `Delegado ${team.club.delegadoNombre}`
                        : "Sin delegado"}
                  </p>
                </div>
                <button
                  onClick={() => removeTeam(team.club.id)}
                  disabled={removingId === team.club.id}
                  className="shrink-0 cursor-pointer font-heading text-sm font-bold text-text-secondary underline disabled:opacity-40"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>

          {teamError && <p className="mt-3 font-body text-sm text-red-600">{teamError}</p>}

          {tournament._count.teams < (tournament.maxTeams ?? Infinity) ? (
            <Link
              href={`/torneos/${params.id}/agregar-equipo`}
              className="mt-5 flex w-full items-center justify-center rounded-lg border border-border-primary py-3.5 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular"
            >
              Agregar equipo
            </Link>
          ) : (
            <p className="mt-5 text-center font-body text-sm text-text-secondary">El torneo ya tiene todos sus equipos.</p>
          )}
        </div>
      )}

      {isConvocatoria && activeConvTab !== "inscritos" && (
        <p className="px-4 py-10 text-center font-body text-sm text-text-secondary">
          {activeConvTab === "solicitudes" ? "Todavía no hay solicitudes de equipos." : "Todavía no hay equipos invitados."}
        </p>
      )}

      {/* === Convocatoria Content (sin equipos todavía) === */}
      {isConvocatoria && activeConvTab === "inscritos" && tournament.teams.length === 0 && (
        <div className="mt-4 flex flex-1 flex-col px-4">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-6 flex items-center justify-center">
              <svg width="220" height="160" viewBox="0 0 220 160" fill="none">
                <ellipse cx="110" cy="145" rx="90" ry="12" fill="var(--color-brand-300)" />
                <rect x="30" y="55" width="22" height="50" rx="3" fill="#1565C0" />
                <circle cx="41" cy="48" r="10" fill="#90CAF9" />
                <rect x="33" y="105" width="7" height="30" fill="#1B1B1B" rx="2" />
                <rect x="42" y="105" width="7" height="30" fill="#1B1B1B" rx="2" />
                <rect x="60" y="40" width="24" height="55" rx="3" fill="#1976D2" />
                <circle cx="72" cy="32" r="11" fill="#90CAF9" />
                <rect x="63" y="95" width="8" height="35" fill="#1B1B1B" rx="2" />
                <rect x="73" y="95" width="8" height="35" fill="#1B1B1B" rx="2" />
                <rect x="92" y="30" width="26" height="60" rx="3" fill="#1565C0" />
                <circle cx="105" cy="22" r="12" fill="#90CAF9" />
                <rect x="96" y="90" width="8" height="38" fill="#1B1B1B" rx="2" />
                <rect x="106" y="90" width="8" height="38" fill="#1B1B1B" rx="2" />
                <rect x="128" y="45" width="23" height="52" rx="3" fill="#1976D2" />
                <circle cx="139" cy="37" r="10" fill="#90CAF9" />
                <rect x="131" y="97" width="7" height="32" fill="#1B1B1B" rx="2" />
                <rect x="141" y="97" width="7" height="32" fill="#1B1B1B" rx="2" />
                <rect x="160" y="55" width="22" height="48" rx="3" fill="#1565C0" />
                <circle cx="171" cy="48" r="10" fill="#90CAF9" />
                <rect x="163" y="103" width="7" height="28" fill="#1B1B1B" rx="2" />
                <rect x="172" y="103" width="7" height="28" fill="#1B1B1B" rx="2" />
                <circle cx="155" cy="128" r="10" fill="white" stroke="#1B1B1B" strokeWidth="1.5" />
                <path d="M155 118l3 5h-6l3-5zm-7 6l5 3-2 5-5-3 2-5zm7 10l-3-5h6l-3 5zm7-6l-5-3 2-5 5 3-2 5z" fill="#1B1B1B" opacity="0.2" />
              </svg>
            </div>

            <h2 className="font-heading text-xl font-bold text-text-primary mb-2">
              Invita tu primer equipo
            </h2>
            <p className="font-body text-sm text-text-secondary mb-8 max-w-[280px]">
              La hinchada esta impaciente por empezar a ver los equipos.
            </p>

            <Link
              href={`/torneos/${params.id}/agregar-equipo`}
              className="flex w-full items-center justify-center rounded-lg border border-border-primary py-3.5 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular mb-6"
            >
              Agregar equipo
            </Link>

            <button className="cursor-pointer font-heading text-sm font-bold text-text-primary underline">
              Editar torneo
            </button>
          </div>
        </div>
      )}

      {/* === Competencia Content === */}
      {!isConvocatoria && activeTab === "partidos" && (
        <div className="mt-4 px-4">
          {matches.length > 0 && (
            <p className="mb-4 font-heading text-base font-semibold italic text-text-primary">
              {formatLongDate(matches[0].date)}
            </p>
          )}

          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <div key={group} className="rounded-xl border border-border-primary overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border-primary bg-surface-primary px-4 py-2.5">
                  <div className="h-5 w-1 rounded-full bg-surface-secondary" />
                  <span className="font-heading text-sm font-bold text-text-primary">{group}</span>
                </div>

                {(matchesByGroup[group] || []).map((m, i, arr) => (
                  <Link
                    key={m.id}
                    href={`/torneos/${params.id}/resultado/${m.id}`}
                    className={`flex items-center px-4 py-3 transition-colors hover:bg-btn-regular ${i < arr.length - 1 ? "border-b border-brand-200" : ""}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-300 text-[8px] font-bold text-text-primary">
                          {m.homeTeam.shortName.slice(0, 2)}
                        </div>
                        <span className="flex-1 truncate font-body text-sm text-text-primary">{m.homeTeam.name}</span>
                        <span className="w-6 text-center font-heading text-base font-bold text-text-primary">
                          {m.homeScore ?? "-"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-300 text-[8px] font-bold text-text-primary">
                          {m.awayTeam.shortName.slice(0, 2)}
                        </div>
                        <span className="flex-1 truncate font-body text-sm text-text-primary">{m.awayTeam.name}</span>
                        <span className="w-6 text-center font-heading text-base font-bold text-text-primary">
                          {m.awayScore ?? "-"}
                        </span>
                      </div>
                    </div>

                    <div className="mx-3 h-10 w-px bg-brand-200" />

                    <div className="w-[80px] shrink-0 text-right">
                      {m.status === "en_curso" ? (
                        <span className="font-heading text-sm font-bold text-field-green">En vivo</span>
                      ) : null}
                      <p className="font-body text-xs text-text-secondary">Fecha {m.matchday}</p>
                      <p className="font-body text-xs text-text-secondary">{formatShortDate(m.date)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isConvocatoria && activeTab === "llaves" && (
        <div className="mt-6 flex flex-col items-center justify-center py-16 text-center px-4">
          <p className="font-body text-sm text-text-secondary">
            Las llaves se generarán cuando termine la fase de grupos
          </p>
        </div>
      )}

      {!isConvocatoria && activeTab === "tabla" && standings && (
        <div className="mt-4 px-4">
          <div className="overflow-hidden rounded-xl border border-brand-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brand-200 bg-surface-alt">
                  <th className="py-2.5 pl-3 pr-1 font-medium text-text-secondary">#</th>
                  <th className="px-1 py-2.5 font-medium text-text-secondary">Equipo</th>
                  <th className="px-1 py-2.5 text-center font-medium text-text-secondary">PJ</th>
                  <th className="px-1 py-2.5 text-center font-medium text-text-secondary">G</th>
                  <th className="px-1 py-2.5 text-center font-medium text-text-secondary">E</th>
                  <th className="px-1 py-2.5 text-center font-medium text-text-secondary">P</th>
                  <th className="px-1 py-2.5 text-center font-medium text-text-secondary">DG</th>
                  <th className="px-1 py-2.5 pr-3 text-center font-medium text-text-secondary">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row: StandingsRow) => {
                  const isTop = row.position <= 2;
                  const isBottom = row.position >= 7;
                  return (
                    <tr key={row.clubId} className="border-b border-brand-200 last:border-0">
                      <td className="py-2.5 pl-3 pr-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isTop ? "bg-verification" : isBottom ? "bg-red-500" : "bg-transparent"
                            }`}
                          />
                          <span className="text-xs font-medium text-text-secondary">{row.position}</span>
                        </div>
                      </td>
                      <td className="px-1 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-300 text-[8px] font-bold">
                            {row.shortName.slice(0, 2)}
                          </div>
                          <span className="truncate text-xs font-medium text-text-primary">{row.clubName}</span>
                        </div>
                      </td>
                      <td className="px-1 py-2.5 text-center text-xs tabular-nums text-text-primary">{row.played}</td>
                      <td className="px-1 py-2.5 text-center text-xs tabular-nums text-text-primary">{row.won}</td>
                      <td className="px-1 py-2.5 text-center text-xs tabular-nums text-text-primary">{row.drawn}</td>
                      <td className="px-1 py-2.5 text-center text-xs tabular-nums text-text-primary">{row.lost}</td>
                      <td className="px-1 py-2.5 text-center text-xs tabular-nums text-text-primary">
                        {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                      </td>
                      <td className="px-1 py-2.5 pr-3 text-center text-xs font-bold tabular-nums text-text-primary">{row.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-4 px-1">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-verification" />
              <span className="text-xs text-text-secondary">Clasifica a liguilla</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-xs text-text-secondary">Desciende</span>
            </div>
          </div>
        </div>
      )}

      {!isConvocatoria && activeTab === "goleadores" && scorers && (
        <div className="mt-4 px-4">
          <div className="overflow-hidden rounded-xl border border-brand-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brand-200 bg-surface-alt">
                  <th className="py-2.5 pl-3 pr-1 font-medium text-text-secondary">#</th>
                  <th className="px-2 py-2.5 font-medium text-text-secondary">Jugador</th>
                  <th className="px-2 py-2.5 font-medium text-text-secondary">Equipo</th>
                  <th className="px-2 py-2.5 pr-3 text-center font-medium text-text-secondary">Goles</th>
                </tr>
              </thead>
              <tbody>
                {scorers.slice(0, 10).map((p: ScorerRow) => (
                  <tr key={p.playerId} className="border-b border-brand-200 last:border-0">
                    <td className="py-2.5 pl-3 pr-1 text-xs font-medium text-text-secondary">{p.position}</td>
                    <td className="px-2 py-2.5 text-xs font-medium text-text-primary">
                      {p.firstName} {p.lastName}
                    </td>
                    <td className="px-2 py-2.5 text-xs text-text-secondary">{p.clubName}</td>
                    <td className="px-2 py-2.5 pr-3 text-center text-xs font-bold text-text-primary">{p.goals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tournament Selector Modal */}
      {showSelector && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/40"
            onClick={() => setShowSelector(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-[110] animate-slide-up">
            <div className="mx-auto max-w-[430px] rounded-t-2xl bg-surface-primary px-4 pb-6 pt-5">
              <div className="mb-4 flex justify-center">
                <div className="h-1 w-10 rounded-full bg-brand-300" />
              </div>

              <h3 className="mb-4 text-center font-heading text-lg font-bold text-text-primary">
                Elige un torneo
              </h3>

              <div className="flex flex-col gap-2 mb-6">
                {tournaments.map((t: TournamentListItem) => {
                  const isSelected = t.id === selectedTournamentId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTournamentId(t.id)}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? "border-transparent bg-surface-secondary"
                          : "border-border-primary bg-surface-primary hover:bg-btn-regular"
                      }`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isSelected ? "bg-brand-700" : "bg-brand-300"}`}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M4 2h8v4a4 4 0 01-8 0V2zM3 3H1.5a.5.5 0 00-.5.5v1a2 2 0 002 2H3M13 3h1.5a.5.5 0 01.5.5v1a2 2 0 01-2 2h-.5M6 10v2M10 10v2M5 12h6a1 1 0 011 1v1H4v-1a1 1 0 011-1z"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={isSelected ? "text-brand-500" : "text-text-secondary"}
                          />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate font-heading text-sm font-bold ${isSelected ? "text-text-invert" : "text-text-primary"}`}>
                          {t.name}
                        </p>
                        <p className={`mt-0.5 text-xs ${isSelected ? "text-brand-500" : "text-text-secondary"}`}>
                          {t.teamsCount} equipos | {formatLabel(t.format)} | {t.category || "Libre"}
                        </p>
                      </div>
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        isSelected ? "border-brand-500 bg-brand-500" : "border-border-primary"
                      }`}>
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-surface-primary" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  setShowSelector(false);
                  if (selectedTournamentId !== params.id) {
                    router.push(`/torneos/${selectedTournamentId}`);
                  }
                }}
                className="w-full cursor-pointer rounded-lg bg-surface-secondary py-3.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700"
              >
                Cambiar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
