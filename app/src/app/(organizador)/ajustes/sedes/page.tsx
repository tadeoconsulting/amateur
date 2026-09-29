"use client";

import Link from "next/link";
import { useApi } from "@/_lib/use-api";

interface SedeRow {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  reference: string | null;
}

export default function SedesPage() {
  const { data: sedes, loading } = useApi<SedeRow[]>(() => fetch("/api/sedes").then((r) => r.json()));

  return (
    <div className="flex min-h-dvh flex-col pb-8">
      {/* Header */}
      <header className="px-4 py-3">
        <Link
          href="/ajustes"
          className="flex items-center gap-1 font-heading text-sm font-semibold text-text-primary"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180">
            <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver
        </Link>
      </header>

      <div className="px-4">
        <h1 className="mb-4 font-heading text-xl font-bold text-text-primary">Mis sedes</h1>

        <div className="flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          ) : (sedes ?? []).length === 0 ? (
            <p className="py-8 text-center font-body text-sm text-text-secondary">
              Aún no has agregado sedes. Agrega una para empezar.
            </p>
          ) : (
            sedes!.map((sede) => (
              <Link
                key={sede.id}
                href={`/ajustes/sedes/${sede.id}`}
                className="flex items-center justify-between border-b border-border-primary py-4 text-left transition-colors hover:bg-btn-regular"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-body text-sm text-text-primary">{sede.name}</p>
                  <p className="truncate font-body text-sm text-text-secondary">
                    {[sede.address, sede.city].filter(Boolean).join(", ") || "Sin dirección"}
                  </p>
                </div>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 text-text-secondary">
                  <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Agregar sede */}
      <div className="px-4 pb-4 pt-8 text-center">
        <Link
          href="/ajustes/sedes/agregar"
          className="font-heading text-base font-bold text-text-primary underline underline-offset-2"
        >
          Agregar sede
        </Link>
      </div>
    </div>
  );
}
