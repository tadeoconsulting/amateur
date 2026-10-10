"use client";

import { useParams } from "next/navigation";
import { tabKeyOfMatch, withTabParam } from "@/_lib/fixture";
import { MatchDetail } from "@/_components/match-detail";

// Ficha de un partido del torneo del jugador: la misma que ve el fan por el link público.
export default function JugadorPartidoPage() {
  const { id, matchId } = useParams<{ id: string; matchId: string }>();
  return (
    <MatchDetail
      matchId={matchId}
      tournamentId={id}
      backLabel="Volver al torneo"
      backHref={(match) => `/jugador/torneos/${id}?${withTabParam("", tabKeyOfMatch(match))}`}
    />
  );
}
