"use client";

import Link from "next/link";
import { useState } from "react";

export default function AgregarSedePage() {
  const [nombre, setNombre] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [referencia, setReferencia] = useState("");

  return (
    <div className="flex min-h-dvh flex-col pb-8">
      {/* Header */}
      <header className="px-4 py-3">
        <Link
          href="/ajustes/sedes"
          className="flex items-center gap-1 font-heading text-sm font-semibold text-text-primary"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180">
            <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver
        </Link>
      </header>

      <div className="px-4">
        <h1 className="mb-6 font-heading text-xl font-bold text-text-primary">Agregar sede</h1>

        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block font-heading text-sm font-semibold text-text-primary">
              Nombre de la sede
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ingresar nombre"
              className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-3 font-body text-sm text-text-primary placeholder:text-text-secondary outline-none focus:border-surface-secondary"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-heading text-sm font-semibold text-text-primary">
              Elige tu ciudad
            </label>
            <select
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              className="w-full appearance-none rounded-lg border border-border-primary bg-surface-primary px-3 py-3 font-body text-sm text-text-secondary outline-none focus:border-surface-secondary"
            >
              <option value="">Selecciona</option>
              <option value="lima">Lima, Perú</option>
              <option value="lambayeque">Lambayeque, Perú</option>
              <option value="tumbes">Tumbes, Perú</option>
              <option value="arequipa">Arequipa, Perú</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block font-heading text-sm font-semibold text-text-primary">
              Ingresa la ubicación
            </label>
            <input
              type="text"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="Escribe la dirección"
              className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-3 font-body text-sm text-text-primary placeholder:text-text-secondary outline-none focus:border-surface-secondary"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-heading text-sm font-semibold text-text-primary">
              Referencia
            </label>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Ejemplo: frente al parque principal"
              className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-3 font-body text-sm text-text-primary placeholder:text-text-secondary outline-none focus:border-surface-secondary"
            />
          </div>
        </div>

        <button className="mt-8 w-full cursor-pointer rounded-lg bg-surface-secondary py-3 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700">
          Crear sede
        </button>
      </div>
    </div>
  );
}
