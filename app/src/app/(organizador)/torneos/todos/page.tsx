"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getTournaments, type TournamentListItem } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";

type FilterTab = "competencia" | "convocatoria" | "finalizados";

const filterMap: Record<FilterTab, string[]> = {
  competencia: ["en_curso"],
  convocatoria: ["inscripcion"],
  finalizados: ["finalizado"],
};

const tabs: { key: FilterTab; label: string }[] = [
  { key: "competencia", label: "Competencia" },
  { key: "convocatoria", label: "Convocatoria" },
  { key: "finalizados", label: "Finalizados" },
];

const clubColors = ["#E53935", "#43A047", "#1E88E5", "#FB8C00", "#8E24AA", "#00ACC1"];

function TournamentCard({
  tournament,
  colorIndex,
}: {
  tournament: TournamentListItem;
  colorIndex: number;
}) {
  const color = clubColors[colorIndex % clubColors.length];

  return (
    <Link
      href={`/torneos/${tournament.id}`}
      className="block rounded-xl border border-border-primary p-4 transition-colors hover:bg-btn-regular"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full mt-0.5"
          style={{ backgroundColor: color + "20" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M4.5 2h9v4a4.5 4.5 0 01-9 0V2zM3.5 3H2a.5.5 0 00-.5.5v1A2.5 2.5 0 004 7h.5M14.5 3H16a.5.5 0 01.5.5v1A2.5 2.5 0 0114 7h-.5M7 11v2M11 11v2M6 13h6a1 1 0 011 1v1H5v-1a1 1 0 011-1z"
              stroke={color}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-sm font-bold text-text-primary">
            {tournament.name}
          </p>
          <p className="mt-0.5 font-body text-xs text-text-secondary">
            {tournament.category || "Libre"} |{" "}
            {new Date(tournament.startDate).toLocaleDateString("es-PE", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>

          <div className="mt-2 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="shrink-0 text-text-secondary"
              >
                <path
                  d="M7 1C4.24 1 2 3.24 2 6c0 3.5 5 7 5 7s5-3.5 5-7c0-2.76-2.24-5-5-5zm0 6.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"
                  fill="currentColor"
                />
              </svg>
              <span className="font-body text-xs text-text-secondary">
                {tournament.location}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="shrink-0 text-text-secondary"
              >
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1" />
                <path
                  d="M7 1.5L8.5 4.5H11L9 6.5L10 9.5L7 7.5L4 9.5L5 6.5L3 4.5H5.5L7 1.5Z"
                  fill="currentColor"
                />
              </svg>
              <span className="font-body text-xs text-text-secondary">
                Fútbol{" "}
                {tournament.format === "liga"
                  ? "7 - Liga"
                  : tournament.format === "grupos"
                    ? "7 - Grupos"
                    : "5 - Eliminación directa"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="shrink-0 text-text-secondary"
              >
                <path
                  d="M2 4.5C2 3.67 2.67 3 3.5 3h7c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5h-7C2.67 11 2 10.33 2 9.5v-5z"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1" />
              </svg>
              <span className="font-body text-xs text-text-secondary">
                {tournament.teamsCount} equipos
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function MisTorneosPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterTab>("competencia");
  const { data: tournaments, loading } = useApi(() => getTournaments());

  if (loading || !tournaments) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const filtered = tournaments.filter((t) =>
    filterMap[activeTab].includes(t.status)
  );

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="px-4 py-3">
        <button
          onClick={() => router.push("/torneos")}
          className="flex cursor-pointer items-center gap-1 font-heading text-sm font-semibold text-text-primary"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className="rotate-180"
          >
            <path
              d="M7.5 4L13.5 10L7.5 16"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Volver
        </button>
      </header>

      {/* Title row */}
      <div className="flex items-center justify-between px-4 mb-4">
        <div className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-text-primary">
            <path
              d="M5.5 2.5h11v5a5.5 5.5 0 01-11 0v-5zM4.5 3.5H2.5a.5.5 0 00-.5.5v1.5A3 3 0 005 8.5h.5M17.5 3.5h2a.5.5 0 01.5.5v1.5A3 3 0 0117 8.5h-.5M8.5 13.5v2.5M13.5 13.5v2.5M7.5 16h7a1 1 0 011 1v1.5h-9V17a1 1 0 011-1z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h1 className="font-heading text-xl font-bold text-text-primary">Mis torneos</h1>
        </div>
        <Link
          href="/crear-torneo"
          className="flex items-center gap-1.5 rounded-lg bg-surface-secondary px-4 py-2.5 font-heading text-xs font-bold text-text-invert transition-colors hover:bg-brand-700"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Crear torneo
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`cursor-pointer rounded-lg px-4 py-2 font-heading text-xs font-semibold transition-colors ${
              activeTab === tab.key
                ? "bg-surface-secondary text-text-invert"
                : "border border-border-primary text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tournament list */}
      <div className="flex flex-col gap-3 px-4 pb-6">
        {filtered.length > 0 ? (
          filtered.map((t, i) => {
            // Se puede iniciar con 2 equipos o más; si falta cupo, la pantalla de inicio lo avisa.
            const canStart = t.teamsCount >= 2;
            return activeTab === "convocatoria" ? (
              <div
                key={t.id}
                className="rounded-xl border border-border-primary p-4"
              >
                <Link href={`/torneos/${t.id}`} className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full mt-0.5"
                    style={{ backgroundColor: clubColors[i % clubColors.length] + "20" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path
                        d="M4.5 2h9v4a4.5 4.5 0 01-9 0V2zM3.5 3H2a.5.5 0 00-.5.5v1A2.5 2.5 0 004 7h.5M14.5 3H16a.5.5 0 01.5.5v1A2.5 2.5 0 0114 7h-.5M7 11v2M11 11v2M6 13h6a1 1 0 011 1v1H5v-1a1 1 0 011-1z"
                        stroke={clubColors[i % clubColors.length]}
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-heading text-sm font-bold text-text-primary">
                        {t.name}
                      </p>
                      {canStart && (
                        <span className="shrink-0 rounded-full bg-verification px-2 py-0.5 font-heading text-[10px] font-bold text-text-primary">
                          Activo
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-body text-xs text-text-secondary">
                      {t.teamsCount}/{t.maxTeams || "?"} equipos | {t.format === "liga" ? "Liga" : t.format === "grupos" ? "Grupos" : "Relámpago"} | {t.category || "Libre"}
                    </p>
                    <div className="mt-2 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-text-secondary">
                          <path d="M7 1C4.24 1 2 3.24 2 6c0 3.5 5 7 5 7s5-3.5 5-7c0-2.76-2.24-5-5-5zm0 6.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="currentColor" />
                        </svg>
                        <span className="font-body text-xs text-text-secondary">{t.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-text-secondary">
                          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1" />
                          <path d="M7 1.5L8.5 4.5H11L9 6.5L10 9.5L7 7.5L4 9.5L5 6.5L3 4.5H5.5L7 1.5Z" fill="currentColor" />
                        </svg>
                        <span className="font-body text-xs text-text-secondary">
                          Fútbol {t.format === "liga" ? "7 - Liga" : t.format === "grupos" ? "7 - Grupos" : "5 - Eliminación directa"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-text-secondary">
                          <path
                            d="M2.5 2h9a.5.5 0 01.5.5V5H2V2.5A.5.5 0 012.5 2zM2 5h10v5.5a.5.5 0 01-.5.5h-9a.5.5 0 01-.5-.5V5z"
                            stroke="currentColor"
                            strokeWidth="1"
                          />
                          <path d="M5 1v2M9 1v2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                        </svg>
                        <span className="font-body text-xs text-text-secondary">
                          {new Date(t.startDate).toLocaleDateString("es-PE", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="mt-4 flex flex-col gap-3">
                  <button
                    disabled={!canStart}
                    onClick={() => canStart && router.push(`/torneos/${t.id}/iniciar`)}
                    className={`w-full rounded-lg py-2.5 font-heading text-sm font-bold transition-colors ${
                      canStart
                        ? "cursor-pointer bg-surface-secondary text-text-invert hover:bg-brand-700"
                        : "bg-btn-disabled text-text-secondary cursor-not-allowed"
                    }`}
                  >
                    Iniciar torneo
                  </button>
                  <Link
                    href={`/torneos/${t.id}/agregar-equipo`}
                    className="flex w-full items-center justify-center rounded-lg border border-border-primary py-2.5 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular"
                  >
                    Invitar equipos
                  </Link>
                  <Link
                    href="/crear-torneo"
                    className="flex items-center justify-center font-heading text-sm font-semibold text-text-primary underline underline-offset-2"
                  >
                    Editar bases de torneo
                  </Link>
                </div>
              </div>
            ) : (
              <TournamentCard key={t.id} tournament={t} colorIndex={i} />
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="font-body text-sm text-text-secondary">
              No hay torneos en esta categoría
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
