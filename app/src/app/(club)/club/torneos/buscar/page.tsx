"use client";

import Link from "next/link";
import { useState } from "react";

const searchResults = [
  {
    id: "sr1",
    name: "Copa Comunidad Futbol..",
    category: "Libre",
    date: "10 de Agosto 2023",
    location: "Plaza depor - Costa Verde",
    format: "Fútbol 7 - Grupos",
    cupos: "12 cupos - 2 cupos libres",
  },
  {
    id: "sr2",
    name: "Copa Chiclayo Regional",
    category: "Sub 18",
    date: "10 de Setiembre 2023",
    location: "Estadio Elías Aguirre",
    format: "Fútbol 11 - Liga",
    cupos: "16 cupos - 4 cupos libres",
  },
  {
    id: "sr3",
    name: "Copa Estatal Lambayeque",
    category: "Libre",
    date: "10 de Diciembre 2023",
    location: "Complejo Deportivo Regional",
    format: "Fútbol 7 - Eliminación",
    cupos: "8 cupos - 1 cupo libre",
  },
];

export default function ClubBuscarTorneosPage() {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? searchResults.filter((r) =>
        r.name.toLowerCase().includes(query.toLowerCase())
      )
    : searchResults;

  return (
    <div className="flex min-h-dvh flex-col pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link href="/club/torneos" className="shrink-0 p-1 text-text-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="font-heading text-lg font-bold text-text-primary">Buscar torneo</h1>
      </div>

      {/* Search input */}
      <div className="px-4 mt-2">
        <div className="relative">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          >
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar torneo"
            className="w-full rounded-lg border border-border-primary bg-white py-3 pl-10 pr-4 font-body text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Results */}
      <div className="mt-4 flex flex-col gap-3 px-4">
        {filtered.map((result) => (
          <div
            key={result.id}
            className="rounded-xl border border-border-primary p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-300">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M4 2h8v4a4 4 0 01-8 0V2z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-heading text-sm font-bold text-text-primary">{result.name}</h3>
                <p className="mt-0.5 font-body text-xs text-text-secondary">
                  {result.category} | {result.date}
                </p>
                <div className="mt-2 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-text-secondary">
                      <path d="M7 1.75a4.375 4.375 0 00-4.375 4.375C2.625 9.5 7 12.25 7 12.25s4.375-2.75 4.375-6.125A4.375 4.375 0 007 1.75z" stroke="currentColor" strokeWidth="1" />
                    </svg>
                    <span className="font-body text-xs text-text-secondary">{result.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-text-secondary">
                      <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1" />
                    </svg>
                    <span className="font-body text-xs text-text-secondary">{result.format}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-text-secondary">
                      <path d="M2 4h10v7a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM4 2v2M10 2v2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                    </svg>
                    <span className="font-body text-xs text-text-secondary">{result.cupos}</span>
                  </div>
                </div>
              </div>
            </div>

            <button className="mt-4 w-full cursor-pointer rounded-lg bg-surface-secondary py-2.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700">
              Inscribirme
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
