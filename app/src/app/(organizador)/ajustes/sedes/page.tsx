"use client";

import Link from "next/link";

const sedes: { id: string; name: string; location: string }[] = [];

export default function SedesPage() {
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
          {sedes.length === 0 && (
            <p className="py-8 text-center font-body text-sm text-text-secondary">
              Aún no has agregado sedes. Agrega una para empezar.
            </p>
          )}
          {sedes.map((sede) => (
            <button
              key={sede.id}
              className="flex cursor-pointer items-center justify-between border-b border-border-primary py-4 text-left transition-colors hover:bg-btn-regular"
            >
              <div className="min-w-0 flex-1">
                <p className="font-body text-sm text-text-primary">{sede.location}</p>
                <p className="font-body text-sm text-text-secondary">{sede.name}</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 text-text-secondary">
                <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
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
