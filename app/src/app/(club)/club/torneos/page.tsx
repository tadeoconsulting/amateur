"use client";

import Link from "next/link";
import { useState } from "react";
import { getTournaments } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { formatLabel } from "@/_lib/tournament-labels";

type MainTab = "mis_torneos" | "solicitudes";
type CategoryTab = "libre" | "sub18";

type Solicitud = {
  id: string;
  name: string;
  category: string;
  date: string;
  location: string;
  format: string;
  cupos: string;
  organizer: string;
  status: "pending" | "requested";
};

const solicitudes: Solicitud[] = [];

export default function ClubTorneosPage() {
  const [mainTab, setMainTab] = useState<MainTab>("mis_torneos");
  const [categoryTab, setCategoryTab] = useState<CategoryTab>("libre");
  const { data: tournaments, loading } = useApi(() => getTournaments());

  if (loading || !tournaments) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const clubTournaments = tournaments.filter(
    (t) => t.status === "en_curso" || t.status === "finalizado"
  );

  return (
    <div className="flex min-h-dvh flex-col pb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-text-primary">
            <path
              d="M6 3h12v5a6 6 0 01-12 0V3zM5 4H3a1 1 0 00-1 1v1.5a3 3 0 003 3h.5M19 4h2a1 1 0 011 1v1.5a3 3 0 01-3 3h-.5M8 14v3M16 14v3M7 17h10a1 1 0 011 1v2H6v-2a1 1 0 011-1z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h1 className="font-heading text-xl font-bold text-text-primary">Torneos</h1>
        </div>
        <Link href="/club/torneos/buscar" className="p-1 text-text-primary">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </Link>
      </div>

      {/* Main tabs */}
      <div className="flex gap-2 px-4 mt-2">
        <button
          onClick={() => setMainTab("mis_torneos")}
          className={`cursor-pointer rounded-lg px-5 py-2.5 font-heading text-sm font-medium transition-colors ${
            mainTab === "mis_torneos"
              ? "bg-surface-secondary text-text-invert"
              : "border border-border-primary text-text-primary"
          }`}
        >
          Mis torneos
        </button>
        <button
          onClick={() => setMainTab("solicitudes")}
          className={`cursor-pointer rounded-lg px-5 py-2.5 font-heading text-sm font-medium transition-colors ${
            mainTab === "solicitudes"
              ? "bg-surface-secondary text-text-invert"
              : "border border-border-primary text-text-primary"
          }`}
        >
          Solicitudes
        </button>
      </div>

      {/* Category sub-tabs */}
      <div className="mt-4 flex gap-4 border-b border-border-primary px-4">
        <button
          onClick={() => setCategoryTab("libre")}
          className={`cursor-pointer pb-2 font-body text-sm transition-colors ${
            categoryTab === "libre"
              ? "border-b-2 border-text-primary font-semibold text-text-primary"
              : "text-text-secondary"
          }`}
        >
          Libre
        </button>
        <button
          onClick={() => setCategoryTab("sub18")}
          className={`cursor-pointer pb-2 font-body text-sm transition-colors ${
            categoryTab === "sub18"
              ? "border-b-2 border-text-primary font-semibold text-text-primary"
              : "text-text-secondary"
          }`}
        >
          Sub 18
        </button>
      </div>

      {/* Mis torneos content */}
      {mainTab === "mis_torneos" && (
        <div className="mt-4 flex flex-col gap-3 px-4">
          {clubTournaments.map((t) => (
            <Link
              key={t.id}
              href={`/club/torneos/${t.id}`}
              className="rounded-xl border border-border-primary p-4 transition-colors hover:bg-btn-regular"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-300">
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
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-sm font-bold text-text-primary">{t.name}</h3>
                  <p className="mt-0.5 font-body text-xs text-text-secondary">
                    {t.category || "Libre"} | {new Date(t.startDate).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
                  </p>
                  <div className="mt-2 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-text-secondary">
                        <path d="M7 1.75a4.375 4.375 0 00-4.375 4.375C2.625 9.5 7 12.25 7 12.25s4.375-2.75 4.375-6.125A4.375 4.375 0 007 1.75z" stroke="currentColor" strokeWidth="1" />
                        <circle cx="7" cy="6.125" r="1.5" stroke="currentColor" strokeWidth="1" />
                      </svg>
                      <span className="font-body text-xs text-text-secondary">{t.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-text-secondary">
                        <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1" />
                        <path d="M7 1.75l1 2h-2l1-2zM3.5 5l2 1-1 2-2-1 1-2zM10.5 5l-2 1 1 2 2-1-1-2zM5 10.5l2-1 2 1-1 2H6l-1-2z" fill="currentColor" opacity="0.3" />
                      </svg>
                      <span className="font-body text-xs text-text-secondary">
                        {formatLabel(t.format)} | {t.teamsCount} equipos
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Solicitudes content */}
      {mainTab === "solicitudes" && (
        <div className="mt-4 flex flex-col gap-3 px-4">
          {solicitudes.length === 0 && (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mb-4 text-brand-300">
                <path d="M6 3h12v5a6 6 0 01-12 0V3z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 14v3M16 14v3M7 17h10a1 1 0 011 1v2H6v-2a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h2 className="font-heading text-lg font-bold text-text-primary">Sin solicitudes</h2>
              <p className="mt-2 text-sm text-text-secondary">Aún no has recibido solicitudes de torneos.</p>
            </div>
          )}
          {solicitudes.map((sol) => (
            <div
              key={sol.id}
              className="rounded-xl border border-border-primary p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-300">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M4 2h8v4a4 4 0 01-8 0V2z"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-sm font-bold text-text-primary">{sol.name}</h3>
                  <p className="mt-0.5 font-body text-xs text-text-secondary">
                    {sol.category} | {sol.date}
                  </p>
                  <div className="mt-2 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-text-secondary">
                        <path d="M7 1.75a4.375 4.375 0 00-4.375 4.375C2.625 9.5 7 12.25 7 12.25s4.375-2.75 4.375-6.125A4.375 4.375 0 007 1.75z" stroke="currentColor" strokeWidth="1" />
                      </svg>
                      <span className="font-body text-xs text-text-secondary">{sol.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-text-secondary">
                        <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1" />
                      </svg>
                      <span className="font-body text-xs text-text-secondary">{sol.format}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-text-secondary">
                        <path d="M2 4h10v7a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM4 2v2M10 2v2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                      </svg>
                      <span className="font-body text-xs text-text-secondary">{sol.cupos}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-text-secondary">
                        <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1" />
                        <path d="M2.5 12.5c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" stroke="currentColor" strokeWidth="1" />
                      </svg>
                      <span className="font-body text-xs text-text-secondary">Organizador: {sol.organizer}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                {sol.status === "pending" ? (
                  <>
                    <button className="flex-1 cursor-pointer rounded-lg border border-border-primary py-2.5 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular">
                      Rechazar
                    </button>
                    <button className="flex-1 cursor-pointer rounded-lg bg-surface-secondary py-2.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700">
                      Aceptar
                    </button>
                  </>
                ) : (
                  <button className="w-full cursor-pointer rounded-lg border border-border-primary py-2.5 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular">
                    Cancelar solicitud
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
