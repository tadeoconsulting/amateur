"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { getTournament, getMatches, getStandings, getScorers } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { formatLabel } from "@/_lib/tournament-labels";

type DetailTab = "torneo" | "fixture" | "resultados";
type TorneoSubTab = "partidos" | "amonestados" | "inscritos";
type ResultadosSubTab = "tabla" | "goleadores" | "compartir";

export default function ClubTorneoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [detailTab, setDetailTab] = useState<DetailTab>("torneo");
  const [torneoSubTab, setTorneoSubTab] = useState<TorneoSubTab>("partidos");
  const [resultadosSubTab, setResultadosSubTab] = useState<ResultadosSubTab>("tabla");

  const { data: tournament, loading: loadingTournament } = useApi(() => getTournament(id));
  const { data: allMatches, loading: loadingMatches } = useApi(() => getMatches({ tournamentId: id }));
  const { data: standingsData, loading: loadingStandings } = useApi(() => getStandings(id));
  const { data: scorersData, loading: loadingScorers } = useApi(() => getScorers(id));

  if (loadingTournament || !tournament) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const tournamentMatches = allMatches ?? [];
  const standings = standingsData ?? [];
  const topScorers = scorersData ?? [];
  const finishedMatches = tournamentMatches.filter((m) => m.status === "finalizado");
  const upcomingMatches = tournamentMatches.filter((m) => m.status === "programado");

  const detailTabs: { key: DetailTab; label: string }[] = [
    { key: "torneo", label: "Torneo" },
    { key: "fixture", label: "Fixture" },
    { key: "resultados", label: "Resultados" },
  ];

  return (
    <div className="flex min-h-dvh flex-col pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link href="/club/torneos" className="shrink-0 p-1 text-text-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="font-heading text-lg font-bold text-text-primary">{tournament.name}</h1>
      </div>

      {/* Tournament card */}
      <div className="mx-4 mt-2 rounded-xl border border-border-primary p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-300">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 2h8v4a4 4 0 01-8 0V2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-sm font-bold text-text-primary">{tournament.name}</h3>
            <p className="mt-0.5 font-body text-xs text-text-secondary">
              {tournament.category || "Libre"} | {new Date(tournament.startDate).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
            </p>
            <div className="mt-2 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-text-secondary">
                  <path d="M7 1.75a4.375 4.375 0 00-4.375 4.375C2.625 9.5 7 12.25 7 12.25s4.375-2.75 4.375-6.125A4.375 4.375 0 007 1.75z" stroke="currentColor" strokeWidth="1" />
                </svg>
                <span className="font-body text-xs text-text-secondary">{tournament.location}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-text-secondary">
                  <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1" />
                </svg>
                <span className="font-body text-xs text-text-secondary">
                  {formatLabel(tournament.format)} | {tournament._count.teams} equipos
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail tabs */}
      <div className="mt-4 flex gap-2 px-4">
        {detailTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setDetailTab(tab.key)}
            className={`cursor-pointer rounded-lg px-5 py-2.5 font-heading text-sm font-medium transition-colors ${
              detailTab === tab.key
                ? "bg-surface-secondary text-text-invert"
                : "border border-border-primary text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Torneo tab content */}
      {detailTab === "torneo" && (
        <>
          {/* Sub-tabs */}
          <div className="mt-4 flex gap-4 border-b border-border-primary px-4">
            {(["partidos", "amonestados", "inscritos"] as TorneoSubTab[]).map((sub) => (
              <button
                key={sub}
                onClick={() => setTorneoSubTab(sub)}
                className={`cursor-pointer pb-2 font-body text-sm capitalize transition-colors ${
                  torneoSubTab === sub
                    ? "border-b-2 border-text-primary font-semibold text-text-primary"
                    : "text-text-secondary"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          {torneoSubTab === "partidos" && (
            <div className="mt-4 flex flex-col gap-3 px-4">
              {tournamentMatches.map((m) => (
                <Link
                  key={m.id}
                  href={`/club/torneos/${id}/partido/${m.id}`}
                  className="rounded-xl border border-border-primary p-3 transition-colors hover:bg-btn-regular"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-body text-[10px] text-text-secondary">
                      {m.groupName} · Fecha {m.matchday}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      m.status === "finalizado"
                        ? "bg-brand-200 text-text-secondary"
                        : "bg-verification/10 text-verification"
                    }`}>
                      {m.status === "finalizado" ? "FT" : m.date}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-200 text-[10px] font-bold">
                        {m.homeTeam.shortName}
                      </div>
                      <span className="font-body text-sm text-text-primary">{m.homeTeam.name}</span>
                    </div>
                    <span className="font-heading text-sm font-bold text-text-primary">
                      {m.homeScore ?? "-"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-200 text-[10px] font-bold">
                        {m.awayTeam.shortName}
                      </div>
                      <span className="font-body text-sm text-text-primary">{m.awayTeam.name}</span>
                    </div>
                    <span className="font-heading text-sm font-bold text-text-primary">
                      {m.awayScore ?? "-"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {torneoSubTab === "amonestados" && (
            <div className="mt-4 px-4">
              <p className="font-body text-sm text-text-secondary">
                No hay jugadores amonestados en este torneo.
              </p>
            </div>
          )}

          {torneoSubTab === "inscritos" && (
            <div className="mt-4 px-4">
              <p className="font-body text-sm text-text-secondary">
                {tournament._count.teams} equipos inscritos de {tournament.maxTeams} cupos.
              </p>
            </div>
          )}
        </>
      )}

      {/* Fixture tab content */}
      {detailTab === "fixture" && (
        <>
          {/* Próximos partidos carousel */}
          {upcomingMatches.length > 0 && (
            <div className="mt-4">
              <h3 className="px-4 font-heading text-sm font-bold text-text-primary">Próximos partidos</h3>
              <div className="mt-2 flex gap-3 overflow-x-auto px-4 pb-2">
                {upcomingMatches.slice(0, 3).map((m) => (
                  <Link
                    key={m.id}
                    href={`/club/torneos/${id}/partido/${m.id}`}
                    className="flex w-56 shrink-0 flex-col rounded-xl border border-border-primary p-3"
                  >
                    <span className="font-body text-[10px] text-text-secondary">{m.date} · {m.time}</span>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-body text-xs text-text-primary">{m.homeTeam.shortName}</span>
                      <span className="font-heading text-xs font-bold text-text-secondary">vs</span>
                      <span className="font-body text-xs text-text-primary">{m.awayTeam.shortName}</span>
                    </div>
                    <span className="mt-1 font-body text-[10px] text-text-secondary">{m.location}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* All fixture matches */}
          <div className="mt-4 flex flex-col gap-3 px-4">
            <h3 className="font-heading text-sm font-bold text-text-primary">Todos los partidos</h3>
            {tournamentMatches.map((m) => (
              <Link
                key={m.id}
                href={`/club/torneos/${id}/partido/${m.id}`}
                className="rounded-xl border border-border-primary p-3 transition-colors hover:bg-btn-regular"
              >
                <div className="flex items-center justify-between">
                  <span className="font-body text-[10px] text-text-secondary">
                    {m.groupName} · Fecha {m.matchday}
                  </span>
                  <span className="font-body text-[10px] text-text-secondary">{m.date} · {m.time}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-body text-sm text-text-primary">{m.homeTeam.name}</span>
                  <span className="font-heading text-sm font-bold">
                    {m.homeScore ?? "-"} - {m.awayScore ?? "-"}
                  </span>
                  <span className="font-body text-sm text-text-primary">{m.awayTeam.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Resultados tab content */}
      {detailTab === "resultados" && (
        <>
          {/* Sub-tabs */}
          <div className="mt-4 flex gap-4 border-b border-border-primary px-4">
            {(["tabla", "goleadores", "compartir"] as ResultadosSubTab[]).map((sub) => (
              <button
                key={sub}
                onClick={() => setResultadosSubTab(sub)}
                className={`cursor-pointer pb-2 font-body text-sm capitalize transition-colors ${
                  resultadosSubTab === sub
                    ? "border-b-2 border-text-primary font-semibold text-text-primary"
                    : "text-text-secondary"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          {resultadosSubTab === "tabla" && (
            <div className="mt-4 px-4">
              <div className="overflow-x-auto rounded-xl border border-border-primary">
                <table className="w-full text-left font-body text-xs">
                  <thead>
                    <tr className="border-b border-border-primary bg-brand-100">
                      <th className="px-2 py-2 font-heading text-[10px] font-semibold text-text-secondary">#</th>
                      <th className="px-2 py-2 font-heading text-[10px] font-semibold text-text-secondary">Equipo</th>
                      <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">PJ</th>
                      <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">G</th>
                      <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">E</th>
                      <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">P</th>
                      <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">DG</th>
                      <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row) => (
                      <tr key={row.position} className="border-b border-border-primary last:border-0">
                        <td className="px-2 py-2.5">
                          <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                            row.position <= 2 ? "bg-verification text-white" : row.position >= 7 ? "bg-error text-white" : "bg-brand-200 text-text-secondary"
                          }`}>
                            {row.position}
                          </div>
                        </td>
                        <td className="px-2 py-2.5 font-heading text-xs font-semibold text-text-primary">{row.shortName}</td>
                        <td className="px-2 py-2.5 text-center text-text-secondary">{row.played}</td>
                        <td className="px-2 py-2.5 text-center text-text-secondary">{row.won}</td>
                        <td className="px-2 py-2.5 text-center text-text-secondary">{row.drawn}</td>
                        <td className="px-2 py-2.5 text-center text-text-secondary">{row.lost}</td>
                        <td className="px-2 py-2.5 text-center text-text-secondary">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                        <td className="px-2 py-2.5 text-center font-heading font-bold text-text-primary">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {resultadosSubTab === "goleadores" && (
            <div className="mt-4 flex flex-col gap-2 px-4">
              {topScorers.map((p, i) => (
                <div
                  key={p.playerId}
                  className={`flex items-center gap-3 rounded-xl p-3 ${
                    i === 0
                      ? "border-2 border-yellow bg-yellow/5"
                      : "border border-border-primary"
                  }`}
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? "bg-yellow text-white" : "bg-brand-200 text-text-secondary"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-300">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-text-secondary">
                      <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1" />
                      <path d="M2.5 12.5c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" stroke="currentColor" strokeWidth="1" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-sm font-bold text-text-primary">
                      {p.firstName} {p.lastName}
                    </p>
                    <p className="font-body text-xs text-text-secondary">{p.clubName}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-text-secondary">
                      <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1" />
                      <path d="M7 1.75l1 2h-2l1-2zM3.5 5l2 1-1 2-2-1 1-2zM10.5 5l-2 1 1 2 2-1-1-2zM5 10.5l2-1 2 1-1 2H6l-1-2z" fill="currentColor" opacity="0.3" />
                    </svg>
                    <span className="font-heading text-sm font-bold text-text-primary">{p.goals}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {resultadosSubTab === "compartir" && (
            <div className="mt-8 flex flex-col items-center gap-4 px-4">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-text-secondary">
                <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <p className="text-center font-body text-sm text-text-secondary">
                Comparte los resultados del torneo con tu comunidad
              </p>
              <button className="cursor-pointer rounded-lg bg-surface-secondary px-6 py-2.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700">
                Compartir resultados
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
