"use client";

import { useState } from "react";
import type { RosterPlayer, PlayerCategory } from "@/_lib/types";

export function AssignDialog({
  player,
  categories,
  onConfirm,
  onCancel,
}: {
  player: RosterPlayer;
  categories: PlayerCategory[];
  onConfirm: (categoryId: string) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-[430px] rounded-t-2xl bg-white px-4 pb-6 pt-6">
        <button
          onClick={onCancel}
          className="absolute right-4 top-6 flex h-6 w-6 items-center justify-center"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <h2 className="pr-8 font-heading text-lg font-bold text-text-primary">
          Elige la nueva categoria del jugador
        </h2>

        <div className="mt-5 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-300">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-brand-500">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-text-primary">{player.firstName} {player.lastName}</p>
              {player.verified && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="var(--color-verification)" />
                  <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <p className="text-sm text-text-secondary">{player.position} | {player.age} anos</p>
          </div>
        </div>

        <div className="mt-5 divide-y divide-brand-200">
          {categories
            .filter((c) => c.id !== player.categoryId)
            .map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelected(cat.id)}
                className="flex w-full items-center justify-between py-3.5"
              >
                <div>
                  <p className="text-left font-semibold text-text-primary">{cat.name}</p>
                  <p className="text-sm text-text-secondary">{cat.playerCount} jugadores</p>
                </div>
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded border-2 transition-colors ${
                    selected === cat.id
                      ? "border-brand-900 bg-brand-900"
                      : "border-brand-400"
                  }`}
                >
                  {selected === cat.id && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
        </div>

        <button
          onClick={() => selected && onConfirm(selected)}
          disabled={!selected}
          className="mt-4 w-full rounded-xl bg-brand-900 py-3.5 font-heading text-sm font-semibold text-text-invert disabled:opacity-40"
        >
          Guardar cambios
        </button>
      </div>
    </div>
  );
}
