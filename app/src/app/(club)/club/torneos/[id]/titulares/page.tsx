"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { getClubPlayers } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";

export default function ClubTitularesPage() {
  const { id } = useParams<{ id: string }>();
  const maxTitulares = 15;

  const { data: playersData, loading } = useApi(() => getClubPlayers("club-1"));
  const availablePlayers = (playersData ?? []).filter((p) => p.status === "activo");

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const togglePlayer = (playerId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else if (next.size < maxTitulares) {
        next.add(playerId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link href={`/club/torneos/${id}`} className="shrink-0 p-1 text-text-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="font-heading text-lg font-bold text-text-primary">Definir titulares</h1>
      </div>

      {/* Counter */}
      <div className="mx-4 mt-2 rounded-xl border border-border-primary p-3 text-center">
        <p className="font-heading text-sm font-bold text-text-primary">
          Titulares | <span className="text-verification">{selected.size}</span>/{maxTitulares} jugadores
        </p>
      </div>

      {/* Players list */}
      <div className="mt-4 flex flex-col px-4">
        {availablePlayers.map((player) => {
          const isSelected = selected.has(player.id);
          return (
            <button
              key={player.id}
              onClick={() => togglePlayer(player.id)}
              className="flex cursor-pointer items-center gap-3 border-b border-border-primary py-3 text-left transition-colors hover:bg-btn-regular"
            >
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                isSelected
                  ? "border-verification bg-verification"
                  : "border-border-primary bg-white"
              }`}>
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6l2.5 2.5 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-300">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-text-secondary">
                  <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1" />
                  <path d="M2.5 12.5c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" stroke="currentColor" strokeWidth="1" />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-heading text-sm font-semibold text-text-primary">
                  {player.user.firstName} {player.user.lastName}
                </p>
                <p className="font-body text-xs text-text-secondary">{player.position ?? "Sin posicion"}</p>
              </div>
            </button>
          );
        })}
        {availablePlayers.length === 0 && (
          <p className="py-12 text-center text-sm text-text-secondary">
            No hay jugadores disponibles para definir titulares
          </p>
        )}
      </div>

      {/* Save button */}
      <div className="mt-6 px-4">
        <button
          disabled={selected.size === 0}
          className="w-full cursor-pointer rounded-lg bg-surface-secondary py-3 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Guardar cambios
        </button>
      </div>
    </div>
  );
}
