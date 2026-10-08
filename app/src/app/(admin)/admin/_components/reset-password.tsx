"use client";

import { useState } from "react";
import { copyText } from "@/_lib/share";

const MIN_LENGTH = 8;

/**
 * "Restablecer contraseña" de las fichas de edición del admin (POST /api/users/:id/reset-password).
 * El admin elige: que se genere una contraseña temporal (se muestra una sola vez, para que se la
 * entregue a la persona) o escribir él la nueva (no se vuelve a mostrar: ya la conoce).
 */
export function ResetPassword({ userId, userLabel }: { userId: string; userLabel: string }) {
  const [step, setStep] = useState<"idle" | "confirm" | "working" | "done">("idle");
  const [mode, setMode] = useState<"generate" | "custom">("generate");
  const [custom, setCustom] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [generated, setGenerated] = useState("");
  const [copied, setCopied] = useState<"yes" | "no" | null>(null);
  const [error, setError] = useState("");

  function start() {
    setMode("generate");
    setCustom("");
    setShowCustom(false);
    setError("");
    setStep("confirm");
  }

  async function reset() {
    if (mode === "custom" && custom.length < MIN_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres`);
      return;
    }
    setStep("working");
    setError("");
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "custom" ? { password: custom } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo restablecer la contraseña");
        setStep("confirm");
        return;
      }
      setGenerated(typeof data.password === "string" ? data.password : "");
      setCustom(""); // la elegida no se queda en pantalla ni en el estado
      setCopied(null);
      setStep("done");
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
      setStep("confirm");
    }
  }

  async function copy() {
    setCopied((await copyText(generated)) ? "yes" : "no");
  }

  const option = "flex cursor-pointer items-start gap-2 font-body text-sm text-text-primary";

  return (
    <div className="flex flex-col gap-3 border-t border-border-primary pt-4">
      <p className="font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Contraseña</p>

      {step === "idle" && (
        <button
          type="button"
          onClick={start}
          className="w-fit cursor-pointer rounded-lg border border-border-primary px-4 py-2 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular"
        >
          Restablecer contraseña
        </button>
      )}

      {(step === "confirm" || step === "working") && (
        <div className="rounded-lg bg-btn-regular p-3">
          <p className="font-body text-sm text-text-primary">
            Nueva contraseña para <strong>{userLabel}</strong>. La actual deja de funcionar.
          </p>

          <fieldset className="mt-3 flex flex-col gap-2" disabled={step === "working"}>
            <legend className="sr-only">Cómo elegir la contraseña</legend>
            <label className={option}>
              <input type="radio" name={`pw-mode-${userId}`} checked={mode === "generate"} onChange={() => setMode("generate")} className="mt-1" />
              <span>Generar una temporal <span className="text-text-secondary">(se muestra una sola vez)</span></span>
            </label>
            <label className={option}>
              <input type="radio" name={`pw-mode-${userId}`} checked={mode === "custom"} onChange={() => setMode("custom")} className="mt-1" />
              <span>Escribir una yo</span>
            </label>
          </fieldset>

          {mode === "custom" && (
            <div className="mt-3">
              <label htmlFor={`pw-custom-${userId}`} className="mb-1 block font-body text-xs font-medium text-text-secondary">
                Contraseña nueva (mínimo {MIN_LENGTH} caracteres)
              </label>
              <div className="flex gap-2">
                <input
                  id={`pw-custom-${userId}`}
                  type={showCustom ? "text" : "password"}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  autoComplete="new-password"
                  disabled={step === "working"}
                  className="min-w-0 flex-1 rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCustom((v) => !v)}
                  className="shrink-0 cursor-pointer rounded-lg border border-border-primary px-3 font-heading text-xs font-bold text-text-primary"
                >
                  {showCustom ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-2 font-body text-sm text-error">
              {error}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={step === "working" || (mode === "custom" && custom.length === 0)}
              className="cursor-pointer rounded-lg bg-surface-secondary px-4 py-2 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {step === "working" ? "Guardando..." : mode === "custom" ? "Guardar contraseña" : "Generar y restablecer"}
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

      {step === "done" && generated && (
        <div className="rounded-lg border border-border-primary p-3" role="status">
          <p className="font-body text-xs text-text-secondary">
            Contraseña temporal de {userLabel}. Cópiala ahora: no se vuelve a mostrar. Entrégasela por un canal seguro.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 select-all break-all rounded-lg bg-btn-regular px-3 py-2 font-mono text-base tracking-wider text-text-primary">
              {generated}
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

      {step === "done" && !generated && (
        <div className="rounded-lg border border-border-primary p-3" role="status">
          <p className="font-body text-sm text-text-primary">
            Listo: la contraseña de <strong>{userLabel}</strong> es la que escribiste. Entrégasela por un canal seguro; ya no se muestra aquí.
          </p>
        </div>
      )}
    </div>
  );
}
