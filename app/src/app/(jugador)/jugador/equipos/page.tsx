"use client";

import Link from "next/link";
import { useApi } from "@/_lib/use-api";

interface ClubRow {
  id: string;
  name: string;
  shortName: string;
  color: string | null;
}

export default function JugadorEquiposPage() {
  const { data: clubs, loading } = useApi<ClubRow[]>(() =>
    fetch("/api/clubs").then((r) => r.json())
  );

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center pt-32">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!clubs || clubs.length === 0) {
    return (
      <div className="w-full">
        <div className="px-4 pt-4">
          <h1 className="font-heading text-xl font-bold text-text-primary">Mis Equipos</h1>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6 pt-32 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mb-4 text-brand-300">
            <path d="M6 3h12v5a6 6 0 01-12 0V3z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 4H3a1 1 0 00-1 1v1.5a3 3 0 003 3h.5M19 4h2a1 1 0 011 1v1.5a3 3 0 01-3 3h-.5M8 14v3M16 14v3M7 17h10a1 1 0 011 1v2H6v-2a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h2 className="font-heading text-lg font-bold text-text-primary">
            Aún no perteneces a ningún equipo
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Vincula tu equipo y empieza la experiencia.
          </p>
          <Link href="/jugador/ajustes/perfil" className="mt-6 text-sm font-medium text-text-primary underline">
            Editar perfil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="px-4 pt-4">
        <h1 className="font-heading text-xl font-bold text-text-primary">Mis Equipos</h1>
      </div>

      <div className="mt-4 space-y-2 px-4 pb-8">
        {clubs.map((club) => (
          <div
            key={club.id}
            className="flex items-center justify-between rounded-lg border border-brand-100 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: (club.color || "#E5E7EB") + "20" }}
              >
                <span className="font-heading text-xs font-bold" style={{ color: club.color || "#6B7280" }}>
                  {club.shortName}
                </span>
              </div>
              <p className="text-sm font-semibold text-text-primary">{club.name}</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-secondary">
              <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
