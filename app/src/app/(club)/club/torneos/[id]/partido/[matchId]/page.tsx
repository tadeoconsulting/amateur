"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MatchDetail } from "@/_components/match-detail";

// La ficha del partido es la misma para todos (ver MatchDetail); lo propio del club es definir sus titulares.
export default function ClubPartidoDetallePage() {
  const { id, matchId } = useParams<{ id: string; matchId: string }>();

  return (
    <MatchDetail
      matchId={matchId}
      tournamentId={id}
      backHref={`/club/torneos/${id}`}
      backLabel="Volver al torneo"
      extra={(match) =>
        (match.status === "en_curso" || match.status === "programado") && (
          <div className="mx-4 mt-3">
            <Link
              href={`/club/torneos/${id}/titulares/${matchId}`}
              className="flex items-center justify-between rounded-xl border border-border-primary p-3 transition-colors hover:bg-btn-regular"
            >
              <span className="font-heading text-sm font-bold text-text-primary">Definir titulares</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-text-secondary" aria-hidden="true">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        )
      }
    />
  );
}
