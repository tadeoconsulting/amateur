"use client";

import { useState } from "react";
import Link from "next/link";
import { getClubCategories, getClubPlayers } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import type { PlayerGender } from "@/_lib/types";
import { SubTabs } from "@/_components/sub-tabs";

const genderTabs: { key: PlayerGender; label: string }[] = [
  { key: "masculino", label: "Masculino" },
  { key: "femenino", label: "Femenino" },
  { key: "mixto", label: "Mixto" },
];

export function JugadoresView({ clubId }: { clubId: string }) {
  const [gender, setGender] = useState<PlayerGender>("masculino");
  const { data: playerCategories, loading } = useApi(() => getClubCategories(clubId));
  // Jugadores sin categoría (por ejemplo los provisionales, que carga un admin): se ven en su propia entrada.
  const { data: uncategorized } = useApi(() => getClubPlayers(clubId, { categoryId: "cat-sin" }));

  if (loading || !playerCategories) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const filtered = playerCategories.filter((c) => c.gender === gender);

  return (
    <div className="w-full pb-4">
      {/* Gender Tabs */}
      <SubTabs label="Género" value={gender} onChange={setGender} tabs={genderTabs} />

      {/* Category List */}
      <div className="mt-2 px-4">
        {filtered.map((cat) => (
          <Link
            key={cat.id}
            href={`/club/equipo/jugadores/${cat.id}`}
            className="flex items-center justify-between border-b border-brand-200 py-4 last:border-0"
          >
            <div>
              <p className="font-heading font-bold text-text-primary">{cat.name}</p>
              <p className="text-sm text-text-secondary">{cat.playerCount} jugadores</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-secondary">
              <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}
        {(uncategorized?.length ?? 0) > 0 && (
          <Link
            href="/club/equipo/jugadores/cat-sin"
            className="flex items-center justify-between border-b border-brand-200 py-4 last:border-0"
          >
            <div>
              <p className="font-heading font-bold text-text-primary">Sin categoría</p>
              <p className="text-sm text-text-secondary">{uncategorized?.length} jugadores</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-secondary" aria-hidden="true">
              <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )}
      </div>

      {/* Define categories link */}
      <div className="mt-6 text-center">
        <button className="cursor-pointer text-sm font-medium text-text-primary underline">
          Definir categorias
        </button>
      </div>
    </div>
  );
}
