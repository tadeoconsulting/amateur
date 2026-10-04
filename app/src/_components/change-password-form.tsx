"use client";

import { useState } from "react";
import { BackHeader } from "@/_components/back-header";
import { Toast } from "@/_components/toast";
import { Spinner } from "@/_components/spinner";
import { btnSolid } from "@/_components/button-styles";

const MIN_LENGTH = 8;

const inputClass =
  "mt-1 w-full border-b border-brand-200 py-2 text-base text-text-primary focus:border-brand-900 focus:outline-none";

/** "Cambiar mi contraseña" — la misma pantalla para organizador, club y jugador (POST /api/auth/password). */
export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError("");
    if (next.length < MIN_LENGTH) return setError(`La nueva contraseña debe tener al menos ${MIN_LENGTH} caracteres`);
    if (next !== confirm) return setError("La confirmación no coincide con la nueva contraseña");

    setSaving(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo cambiar la contraseña.");
        return;
      }
      setCurrent("");
      setNext("");
      setConfirm("");
      setToast("Contraseña actualizada.");
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full pb-8">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      <BackHeader />

      <form onSubmit={submit} className="px-4">
        <h2 className="font-heading text-lg font-bold text-text-primary">Cambiar contraseña</h2>
        <p className="mt-1 font-body text-sm text-text-secondary">
          Si te dieron una contraseña temporal, cámbiala acá por una que solo tú conozcas.
        </p>

        <div className="mt-6 space-y-5">
          {error && (
            <p role="alert" className="font-body text-sm text-red-600">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="pw-current" className="text-sm text-text-secondary">Contraseña actual</label>
            <input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="pw-new" className="text-sm text-text-secondary">Nueva contraseña</label>
            <input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} />
            <p className="mt-1 font-body text-xs text-text-secondary">Al menos {MIN_LENGTH} caracteres.</p>
          </div>
          <div>
            <label htmlFor="pw-confirm" className="text-sm text-text-secondary">Repite la nueva contraseña</label>
            <input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
          </div>
        </div>

        <button type="submit" disabled={saving || !current || !next || !confirm} className={`${btnSolid} mt-8 w-full`}>
          {saving && <Spinner size={16} label="Guardando" />}
          Cambiar contraseña
        </button>
      </form>
    </div>
  );
}
