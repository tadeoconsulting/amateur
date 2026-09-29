"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { getTournament, getMatches } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { useTournamentRealtime } from "@/_lib/use-tournament-realtime";
import { formatLabel } from "@/_lib/tournament-labels";
import { shareLink } from "@/_lib/share";
import { Toast } from "@/_components/toast";
import { FixtureTabs } from "@/_components/fixture-tabs";

function PartidosFixtureContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { data: tournament } = useApi(() => getTournament(params.id));
  const { data: allMatches, loading, refetchSilently: refetchMatches } = useApi(() => getMatches({ tournamentId: params.id }));

  // Antes esta pantalla no tenía ninguna suscripción en vivo: un gol no se reflejaba salvo que
  // se recargara a mano. Cubre los partidos en vivo de CUALQUIER fecha, no solo la que se está
  // viendo, para no perderse un gol de otra fecha mientras se mira esta.
  const liveMatchIds = (allMatches ?? []).filter((m) => m.status === "en_curso").map((m) => m.id);
  useTournamentRealtime(liveMatchIds, refetchMatches);
  // Se lee una sola vez al montar (lazy init) en vez de en un efecto: evita el
  // set-state-in-effect de React 19 para algo que no depende de nada externo.
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(() =>
    searchParams.get("saved") === "true" ? { message: "Se definió los partidos con éxito.", tone: "success" } : null
  );

  async function handleShare() {
    if (!tournament) return;
    // El link público es la convocatoria (ver decisiones — es la única pantalla del torneo
    // que no exige haber iniciado sesión): cualquiera que lo abra ve el fixture y los equipos.
    const result = await shareLink({
      title: tournament.name,
      text: `Mira el fixture de ${tournament.name} en Amateur`,
      url: `${window.location.origin}/convocatoria/${params.id}`,
    });
    if (result === "copied") setToast({ message: "Link copiado. Pégalo en WhatsApp.", tone: "success" });
    if (result === "failed") setToast({ message: "No se pudo copiar. Copia el link a mano.", tone: "error" });
  }

  if (loading || !tournament || !allMatches) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col pb-20">
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3">
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
          <h1 className="font-heading text-xl font-bold text-text-primary">Fixture</h1>
        </div>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 rounded-lg bg-surface-secondary px-4 py-2 font-heading text-xs font-bold text-text-invert transition-colors hover:bg-brand-700 cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 5.5L7 2l5 3.5M7 2v10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 8l-2 1.5V12h4v-2.5a1 1 0 012 0V12h4V9.5L10 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Compartir
        </button>
      </header>

      {/* Tournament info pill */}
      <div className="mx-4 mb-4 rounded-xl border border-border-primary p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red/10">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 2h8v4a4 4 0 01-8 0V2zM3 3H1.5a.5.5 0 00-.5.5v1a2 2 0 002 2H3M13 3h1.5a.5.5 0 01.5.5v1a2 2 0 01-2 2h-.5M6 10v2M10 10v2M5 12h6a1 1 0 011 1v1H4v-1a1 1 0 011-1z"
                stroke="var(--color-red)"
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
            <p className="font-body text-xs text-text-secondary">
              {tournament._count.teams} equipos | {formatLabel(tournament.format)} | {tournament.category || "Libre"}
              {" "}
              <span className="inline-flex items-center rounded-full bg-verification px-1.5 py-0.5 text-[10px] font-bold text-text-primary">
                Activo
              </span>
            </p>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-text-secondary">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Tabs "Fecha N" + grupos, con badge "En vivo" — mismo componente que usan el
          organizador (torneos/[id], pestaña Partidos) y el club, para que las tres vistas
          organicen el fixture igual que se construyó el torneo. */}
      <FixtureTabs matches={allMatches} hrefFor={(match) => `/torneos/${params.id}/partido/${match.id}`} />
    </div>
  );
}

export default function PartidosFixturePage() {
  return (
    <Suspense fallback={null}>
      <PartidosFixtureContent />
    </Suspense>
  );
}
