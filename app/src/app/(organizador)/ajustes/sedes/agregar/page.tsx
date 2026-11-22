"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Label } from "@/_components/label";
import { TextField } from "@/_components/text-field";
import { Picklist } from "@/_components/picklist";

export default function AgregarSedePage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [referencia, setReferencia] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!nombre.trim() || saving) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/sedes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nombre.trim(),
        city: ciudad || null,
        address: ubicacion || null,
        reference: referencia || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo crear la sede");
      return;
    }
    router.push("/ajustes/sedes");
  };

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
            <Label className="mb-1.5 block">
              Nombre de la sede
            </Label>
            <TextField type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ingresar nombre" />
          </div>

          <div>
            <Label className="mb-1.5 block">
              Elige tu ciudad
            </Label>
            <Picklist value={ciudad} onChange={(v) => setCiudad(v)}>
              <option value="">Selecciona</option>
              <option value="lima">Lima, Perú</option>
              <option value="lambayeque">Lambayeque, Perú</option>
              <option value="tumbes">Tumbes, Perú</option>
              <option value="arequipa">Arequipa, Perú</option>
            </Picklist>
          </div>

          <div>
            <Label className="mb-1.5 block">
              Ingresa la ubicación
            </Label>
            <TextField type="text" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} placeholder="Escribe la dirección" />
          </div>

          <div>
            <Label className="mb-1.5 block">
              Referencia
            </Label>
            <TextField type="text" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Ejemplo: frente al parque principal" />
          </div>
        </div>

        {error && <p className="mt-4 font-body text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!nombre.trim() || saving}
          className="mt-8 w-full cursor-pointer rounded-lg bg-surface-secondary py-3 font-heading text-sm md:text-base font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Creando..." : "Crear sede"}
        </button>
      </div>
    </div>
  );
}
