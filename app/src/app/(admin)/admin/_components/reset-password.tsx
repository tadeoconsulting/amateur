"use client";

import { useState } from "react";
import { copyText } from "@/_lib/share";

/**
 * "Restablecer contraseña" de las fichas de edición del admin. Genera una contraseña temporal
 * (POST /api/users/:id/reset-password) y la muestra una sola vez para que el admin se la entregue
 * a la persona: no hay correo ni "olvidé mi contraseña" que lo haga por su cuenta.
 */
export function ResetPassword({ userId, userLabel }: { userId: string; userLabel: string }) {
  const [step, setStep] = useState<"idle" | "confirm" | "working" | "done">("idle");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState<"yes" | "no" | null>(null);
  const [error, setError] = useState("");

  async function reset() {
    setStep("working");
    setError("");
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.password !== "string") {
        setError(data.error ?? "No se pudo restablecer la contraseña");
        setStep("confirm");
        return;
      }
      setPassword(data.password);
      setStep("done");
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
      setStep("confirm");
    }
  }

  async function copy() {
    setCopied((await copyText(password)) ? "yes" : "no");
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border-primary pt-4">
      <p className="font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Contraseña</p>

      {step === "idle" && (
        <button
          type="button"
          onClick={() => setStep("confirm")}
          className="w-fit cursor-pointer rounded-lg border border-border-primary px-4 py-2 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular"
        >
          Restablecer contraseña
        </button>
      )}

      {(step === "confirm" || step === "working") && (
        <div className="rounded-lg bg-btn-regular p-3">
          <p className="font-body text-sm text-text-primary">
            Se genera una contraseña temporal para <strong>{userLabel}</strong>. La actual deja de funcionar.
          </p>
          {error && <p className="mt-2 font-body text-sm text-error">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={step === "working"}
              className="cursor-pointer rounded-lg bg-surface-secondary px-4 py-2 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {step === "working" ? "Restableciendo..." : "Sí, restablecer"}
            </button>
            <button
              type="button"
              onClick={() => setStep("idle")}
              disabled={step === "working"}
              className="cursor-pointer rounded-lg border border-border-primary px-4 py-2 font-heading text-sm font-bold text-text-primary disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="rounded-lg border border-border-primary p-3" role="status">
          <p className="font-body text-xs text-text-secondary">
            Contraseña temporal de {userLabel}. Cópiala ahora: no se vuelve a mostrar. Entrégasela por un canal seguro.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 select-all break-all rounded-lg bg-btn-regular px-3 py-2 font-mono text-base tracking-wider text-text-primary">
              {password}
            </code>
            <button
              type="button"
              onClick={copy}
              className="shrink-0 cursor-pointer rounded-lg bg-surface-secondary px-4 py-2 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700"
            >
              Copiar
            </button>
          </div>
          {copied === "yes" && <p className="mt-2 font-body text-xs text-text-secondary">Copiada.</p>}
          {copied === "no" && <p className="mt-2 font-body text-xs text-error">No se pudo copiar. Selecciónala y cópiala a mano.</p>}
        </div>
      )}
    </div>
  );
}
