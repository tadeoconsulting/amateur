"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { getClubs } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";

const delegados: Record<string, string> = {
  c1: "@abetancourt",
  c2: "@dsitima",
  c3: "@hoha7",
  c4: "@lafoca1029",
  c5: "@lafoca1029",
  c6: "@mendez_r",
  c7: "@delago_fc",
  c8: "@central_sp",
};

export default function BuscarEquipoPage() {
  const router = useRouter();
  const { data: clubs, loading } = useApi(() => getClubs());
  const [query, setQuery] = useState("");
  const [invited, setInvited] = useState<Set<string>>(new Set(["c2"]));

  const filtered = useMemo(() => {
    const list = clubs ?? [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        (delegados[c.id] ?? "").toLowerCase().includes(q)
    );
  }, [query, clubs]);

  function toggleInvite(clubId: string) {
    setInvited((prev) => {
      const next = new Set(prev);
      if (next.has(clubId)) next.delete(clubId);
      else next.add(clubId);
      return next;
    });
  }

  if (loading || !clubs) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="w-full pb-8">
      {/* Header */}
      <header className="px-4 py-3">
        <button
          onClick={() => router.back()}
          className="flex cursor-pointer items-center gap-1 font-heading text-sm font-semibold text-text-primary"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180">
            <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver
        </button>
      </header>

      {/* Search */}
      <div className="px-4 mt-2">
        <p className="font-heading text-base font-semibold text-text-primary mb-2">
          Buscar equipo
        </p>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ingresa el nombre o apellido"
            className="w-full rounded-lg border border-transparent bg-btn-regular px-3 py-3 pr-10 font-body text-sm text-text-primary placeholder:text-text-primary/60 transition-colors hover:border-border-primary hover:bg-surface-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none"
          />
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
          >
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Results */}
      <div className="mt-6 px-4">
        <h2 className="font-heading text-lg font-bold text-text-primary mb-4">
          {query.trim() ? "Resultados" : "Búsqueda reciente"}
        </h2>

        {filtered.length === 0 ? (
          <p className="py-8 text-center font-body text-sm text-text-secondary">
            No se encontraron equipos
          </p>
        ) : (
          <div className="flex flex-col">
            {filtered.map((club) => {
              const isInvited = invited.has(club.id);
              return (
                <div
                  key={club.id}
                  className="flex items-center gap-3 border-b border-brand-200 py-3.5 last:border-0"
                >
                  {/* Club avatar */}
                  <div className="relative shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-300">
                      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M4 2h8v4a4 4 0 01-8 0V2zM3 3H1.5a.5.5 0 00-.5.5v1a2 2 0 002 2H3M13 3h1.5a.5.5 0 01.5.5v1a2 2 0 01-2 2h-.5M6 10v2M10 10v2M5 12h6a1 1 0 011 1v1H4v-1a1 1 0 011-1z"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-text-secondary"
                        />
                      </svg>
                    </div>
                    {isInvited && (
                      <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-verification">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2.5 5L4.5 7L7.5 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Club info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-sm font-bold text-text-primary">
                      {club.name}
                    </p>
                    <p className="mt-0.5 truncate font-body text-xs text-text-secondary">
                      Delegado <span className="font-semibold">{delegados[club.id] ?? "@usuario"}</span>
                    </p>
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => toggleInvite(club.id)}
                    className="shrink-0 cursor-pointer font-heading text-sm font-bold underline transition-colors"
                    style={{ color: isInvited ? "var(--color-text-secondary)" : "var(--color-text-primary)" }}
                  >
                    {isInvited ? "Remover" : "Invitar"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
