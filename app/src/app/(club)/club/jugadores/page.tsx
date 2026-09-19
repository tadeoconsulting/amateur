"use client";

import { useState } from "react";
import Link from "next/link";
import { getClubCategories } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import type { PlayerGender } from "@/_lib/types";

const genderTabs: { key: PlayerGender; label: string }[] = [
  { key: "masculino", label: "Masculino" },
  { key: "femenino", label: "Femenino" },
  { key: "mixto", label: "Mixto" },
];

export default function ClubJugadoresPage() {
  const [gender, setGender] = useState<PlayerGender>("masculino");
  const { data: playerCategories, loading } = useApi(() => getClubCategories("club-1"));

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
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-text-primary">
            <path
              d="M6 4h12v5a6 6 0 01-12 0V4zM5 5H3a1 1 0 00-1 1v1a3 3 0 003 3h.5M19 5h2a1 1 0 011 1v1a3 3 0 01-3 3h-.5M9 14v2M15 14v2M7 16h10a1 1 0 011 1v1H6v-1a1 1 0 011-1z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h1 className="font-heading text-xl font-bold text-text-primary">Jugadores</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/club/jugadores/buscar" className="text-text-primary">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M15 15l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </Link>
          <Link href="/club/notificaciones" className="text-text-primary">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </div>

      {/* Gender Tabs */}
      <div className="mt-4 flex border-b border-brand-200 px-4">
        {genderTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setGender(tab.key)}
            className={`flex-1 cursor-pointer py-2.5 text-center text-sm font-medium transition-colors ${
              gender === tab.key
                ? "border-b-2 border-brand-900 text-text-primary"
                : "text-text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Category List */}
      <div className="mt-2 px-4">
        {filtered.map((cat) => (
          <Link
            key={cat.id}
            href={`/club/jugadores/${cat.id}`}
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
