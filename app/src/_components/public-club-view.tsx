"use client";

import Link from "next/link";
import { ClubPage } from "@/_components/club-page";

/** La página pública de un club dentro de la columna de la página pública del torneo (misma envoltura que la ficha de un partido). */
export function PublicClubView({ tournamentId, clubId, tournamentPath }: { tournamentId: string; clubId: string; tournamentPath: string }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-surface-primary md:max-w-4xl lg:max-w-6xl">
      <header className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="font-heading text-lg font-bold text-text-primary">
          Amateur
        </Link>
      </header>
      <main className="flex-1">
        <ClubPage tournamentId={tournamentId} clubId={clubId} tournamentPath={tournamentPath} />
      </main>
    </div>
  );
}
