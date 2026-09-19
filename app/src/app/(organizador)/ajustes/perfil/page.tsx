"use client";

import Link from "next/link";
import { useState } from "react";

export default function PerfilPage() {
  const [nombre, setNombre] = useState("");
  const [organizacion, setOrganizacion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");

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
        <h1 className="mb-6 font-heading text-xl font-bold text-text-primary">Perfil</h1>

        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block font-heading text-sm font-semibold text-text-primary">
              Nombre del organizador
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ingresar nombre completo"
              className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-3 font-body text-sm text-text-primary placeholder:text-text-secondary outline-none focus:border-surface-secondary"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-heading text-sm font-semibold text-text-primary">
              Nombre de la organización
            </label>
            <input
              type="text"
              value={organizacion}
              onChange={(e) => setOrganizacion(e.target.value)}
              placeholder="Ingresar nombre"
              className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-3 font-body text-sm text-text-primary placeholder:text-text-secondary outline-none focus:border-surface-secondary"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-heading text-sm font-semibold text-text-primary">
              Teléfono del organizador
            </label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ingresar teléfono"
              className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-3 font-body text-sm text-text-primary placeholder:text-text-secondary outline-none focus:border-surface-secondary"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-heading text-sm font-semibold text-text-primary">
              Correo del organizador
            </label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="Ingresar correo"
              className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-3 font-body text-sm text-text-primary placeholder:text-text-secondary outline-none focus:border-surface-secondary"
            />
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <Link
            href="/ajustes"
            className="flex-1 rounded-lg border border-border-primary py-3 text-center font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular"
          >
            Cancelar
          </Link>
          <button className="flex-1 cursor-pointer rounded-lg bg-surface-secondary py-3 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
