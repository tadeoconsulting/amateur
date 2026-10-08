"use client";

import { useEffect, useId, useState } from "react";

/**
 * Confirmación de una eliminación que no se puede deshacer. Para confirmar hay que escribir
 * `confirmWord` (el nombre de lo que se elimina): así no se borra por un clic de más.
 * `onConfirm` devuelve el mensaje de error si falló, o null si salió bien (quien llama cierra y refresca).
 */
export function ConfirmDelete({
  title,
  confirmWord,
  confirmLabel = "Eliminar",
  onConfirm,
  onClose,
  children,
}: {
  title: string;
  confirmWord: string;
  confirmLabel?: string;
  onConfirm: () => Promise<string | null>;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [typed, setTyped] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const inputId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !working && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [working, onClose]);

  const matches = typed.trim().toLowerCase() === confirmWord.trim().toLowerCase();

  async function confirm() {
    if (!matches || working) return;
    setWorking(true);
    setError(null);
    const failure = await onConfirm().catch(() => "No se pudo conectar. Inténtalo de nuevo.");
    if (failure) {
      setError(failure);
      setWorking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4" onClick={() => !working && onClose()}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl bg-surface-primary p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="font-heading text-lg font-bold text-text-primary">
          {title}
        </h2>
        <div className="mt-3 flex flex-col gap-2 font-body text-sm text-text-secondary">{children}</div>

        <label htmlFor={inputId} className="mb-1 mt-5 block font-body text-xs font-medium text-text-secondary">
          Para confirmar, escribe <strong className="text-text-primary">{confirmWord}</strong>
        </label>
        <input
          id={inputId}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={working}
          autoComplete="off"
          autoFocus
          className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
        />

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 font-body text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={working}
            className="cursor-pointer rounded-lg border border-border-primary px-5 py-2.5 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!matches || working}
            className="cursor-pointer rounded-lg bg-red-600 px-5 py-2.5 font-heading text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {working ? "Eliminando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
