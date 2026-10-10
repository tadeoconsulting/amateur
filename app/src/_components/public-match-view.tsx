"use client";

import Link from "next/link";
import { tabKeyOfMatch, withTabParam } from "@/_lib/fixture";
import { MatchDetail } from "@/_components/match-detail";

/**
 * La ficha pública de un partido (la que abre quien recibe el link, sin cuenta): la misma ficha de
 * lectura que ven el jugador y el club, dentro de la columna de la página pública del torneo.
 * `publicPath` es la ruta del torneo (/{organizador}/{torneo}); "Volver" cae en el fixture, en la
 * fecha donde está el partido.
 */
export function PublicMatchView({ tournamentId, matchId, publicPath }: { tournamentId: string; matchId: string; publicPath: string }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-surface-primary md:max-w-4xl lg:max-w-6xl">
      <header className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="font-heading text-lg font-bold text-text-primary">
          Amateur
        </Link>
      </header>
      <main className="flex-1">
        <MatchDetail
          matchId={matchId}
          tournamentId={tournamentId}
          backLabel="Volver al torneo"
          backHref={(match) => `${publicPath}?${withTabParam("vista=fixture", tabKeyOfMatch(match))}`}
        />
      </main>
    </div>
  );
}
