"use client";

import Link from "next/link";
import { useState } from "react";
import { btnOutline, btnSolid } from "@/_components/button-styles";
import { Spinner } from "@/_components/spinner";

const MIN_LENGTH = 8;
const inputClass = "mt-1 w-full border-b border-brand-200 py-2 text-base text-text-primary focus:border-brand-900 focus:outline-none";

/** Elegir la contraseña nueva con el enlace del correo (POST /api/auth/reset-password). */
export function RestablecerForm({ token }: { token: string }) {
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  // El enlace vencido o ya usado vuelve a pedir uno nuevo, no deja la pantalla muerta.
  const [dead, setDead] = useState(!token);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError("");
    if (next.length < MIN_LENGTH) return setError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres`);
    if (next !== confirm) return setError("La confirmación no coincide con la contraseña");

    setSaving(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // 400 por enlace inválido o vencido: no hay nada que corregir en el formulario.
        if (typeof data.error === "string" && data.error.startsWith("El enlace")) setDead(true);
        else setError(data.error ?? "No se pudo cambiar la contraseña.");
        return;
      }
      setDone(true);
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-4 py-6">
      <Link href="/" className="font-heading text-lg font-bold text-text-primary">
        Amateur
      </Link>

      <div className="mt-10">
        {done ? (
          <>
            <h1 className="font-heading text-xl font-bold text-text-primary">Contraseña actualizada</h1>
            <p role="status" className="mt-2 font-body text-sm text-text-secondary">Ya puedes entrar con tu contraseña nueva.</p>
            <Link href="/?auth=login" className={`${btnSolid} mt-8 w-full`}>
              Iniciar sesión
            </Link>
          </>
        ) : dead ? (
          <>
            <h1 className="font-heading text-xl font-bold text-text-primary">Este enlace ya no sirve</h1>
            <p role="alert" className="mt-2 font-body text-sm text-text-secondary">
              El enlace no es válido o ya venció (vale una hora y se usa una sola vez). Pide uno nuevo desde &quot;Olvidé mi contraseña&quot;.
            </p>
            <Link href="/?auth=login" className={`${btnOutline} mt-8 w-full`}>
              Ir a iniciar sesión
            </Link>
          </>
        ) : (
          <form onSubmit={submit}>
            <h1 className="font-heading text-xl font-bold text-text-primary">Elige una contraseña nueva</h1>
            <p className="mt-1 font-body text-sm text-text-secondary">Al menos {MIN_LENGTH} caracteres.</p>

            <div className="mt-6 space-y-5">
              {error && (
                <p role="alert" className="font-body text-sm text-red-600">
                  {error}
                </p>
              )}
              <div>
                <label htmlFor="rp-new" className="text-sm text-text-secondary">Nueva contraseña</label>
                <input id="rp-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="rp-confirm" className="text-sm text-text-secondary">Repite la contraseña</label>
                <input id="rp-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
              </div>
            </div>

            <button type="submit" disabled={saving || !next || !confirm} className={`${btnSolid} mt-8 w-full`}>
              {saving && <Spinner size={16} label="Guardando" />}
              Cambiar contraseña
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
