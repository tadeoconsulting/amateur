"use client";

import Link from "next/link";

export default function JugadoresPage() {
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
          <Link href="/jugadores/buscar" className="text-text-primary">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M15 15l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </Link>
          <button className="text-text-primary">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M4 7h14M4 7a2 2 0 012-2h10a2 2 0 012 2M4 7v10a2 2 0 002 2h10a2 2 0 002-2V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M11 3v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-text-secondary">
            <path
              d="M6 4h12v5a6 6 0 01-12 0V4zM5 5H3a1 1 0 00-1 1v1a3 3 0 003 3h.5M19 5h2a1 1 0 011 1v1a3 3 0 01-3 3h-.5M9 14v2M15 14v2M7 16h10a1 1 0 011 1v1H6v-1a1 1 0 011-1z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="mt-4 max-w-[280px] font-body text-sm text-text-secondary">
          No hay categorías de jugadores. Crea un torneo y agrega equipos para empezar.
        </p>
      </div>

      {/* Define categories link */}
      <div className="mt-2 text-center">
        <button className="text-sm font-medium text-text-primary underline">
          Definir categorias
        </button>
      </div>
    </div>
  );
}
