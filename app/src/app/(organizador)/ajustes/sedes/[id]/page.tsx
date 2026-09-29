"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useApi } from "@/_lib/use-api";

interface SedeDetail {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  reference: string | null;
}

const departamentos = [
  "Amazonas", "Áncash", "Apurímac", "Arequipa", "Ayacucho", "Cajamarca",
  "Cusco", "Huancavelica", "Huánuco", "Ica", "Junín", "La Libertad",
  "Lambayeque", "Lima", "Loreto", "Madre de Dios", "Moquegua", "Pasco",
  "Piura", "Puno", "San Martín", "Tacna", "Tumbes", "Ucayali",
];

export default function EditarSedePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: sede, loading } = useApi<SedeDetail>(() => fetch(`/api/sedes/${id}`).then((r) => r.json()));

  if (loading || !sede) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return <EditarSedeForm key={sede.id} sede={sede} onDeleted={() => router.push("/ajustes/sedes")} />;
}

function EditarSedeForm({ sede, onDeleted }: { sede: SedeDetail; onDeleted: () => void }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(sede.name);
  const [ciudad, setCiudad] = useState(sede.city ?? "");
  const [ubicacion, setUbicacion] = useState(sede.address ?? "");
  const [referencia, setReferencia] = useState(sede.reference ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!nombre.trim() || saving) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/sedes/${sede.id}`, {
      method: "PATCH",
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
      setError(data.error ?? "No se pudo guardar");
      return;
    }
    router.push("/ajustes/sedes");
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/sedes/${sede.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo eliminar");
      return;
    }
    onDeleted();
  };

  return (
    <div className="flex min-h-dvh flex-col pb-8">
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
        <h1 className="mb-6 font-heading text-xl font-bold text-text-primary">Editar sede</h1>

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
              Elige tu departamento
            </label>
            <select
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              className="w-full appearance-none rounded-lg border border-border-primary bg-surface-primary px-3 py-3 font-body text-sm text-text-secondary outline-none focus:border-surface-secondary"
            >
              <option value="">Selecciona</option>
              {departamentos.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
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

        {error && <p className="mt-4 font-body text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSave}
          disabled={!nombre.trim() || saving}
          className="mt-8 w-full cursor-pointer rounded-lg bg-surface-secondary py-3 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>

        <button
          onClick={() => setConfirmDelete(true)}
          disabled={deleting}
          className="mt-4 w-full cursor-pointer py-2 text-center font-heading text-sm font-medium text-text-primary underline disabled:opacity-50"
        >
          Eliminar sede
        </button>
      </div>

      {confirmDelete && (
        <>
          <div className="fixed inset-0 z-[110] bg-black/40" onClick={() => !deleting && setConfirmDelete(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[110] mx-auto max-w-[430px] rounded-t-2xl bg-surface-primary px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6">
            <h3 className="text-center font-heading text-lg font-bold text-text-primary mb-3">¿Eliminar {sede.name}?</h3>
            <p className="mb-6 text-center font-body text-sm text-text-secondary">
              Ya no aparecerá como opción al crear un torneo. Los torneos que ya la usan no cambian.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 cursor-pointer rounded-lg border border-border-primary py-3 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 cursor-pointer rounded-lg bg-surface-secondary py-3 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:opacity-40"
              >
                {deleting ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
