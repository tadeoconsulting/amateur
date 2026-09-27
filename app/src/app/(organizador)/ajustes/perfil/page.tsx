"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getUser } from "@/_lib/api";
import { Toast } from "@/_components/toast";

export default function PerfilPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [organizacion, setOrganizacion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getUser(user.id)
      .then((u) => {
        if (cancelled) return;
        setNombre(`${u.firstName} ${u.lastName}`.trim());
        setOrganizacion(u.organization ?? "");
        setTelefono(u.phone ?? "");
        setCorreo(u.email);
      })
      .catch(() => setError("No se pudo cargar el perfil."))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  const handleSave = async () => {
    if (!user || saving) return;
    setError("");
    setSaving(true);
    try {
      const [firstName, ...rest] = nombre.trim().split(/\s+/);
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName: rest.join(" "),
          organization: organizacion.trim() || null,
          phone: telefono.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar el perfil.");
        return;
      }
      setToast("Perfil actualizado correctamente.");
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col pb-8">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

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

        {error && <p className="mb-4 font-body text-sm text-red-600">{error}</p>}

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
              readOnly
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-border-primary bg-btn-regular px-3 py-3 font-body text-sm text-text-secondary outline-none"
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
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 cursor-pointer rounded-lg bg-surface-secondary py-3 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
