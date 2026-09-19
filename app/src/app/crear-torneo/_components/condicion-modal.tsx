"use client";

import { useState } from "react";

export function CondicionModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (condicion: string) => void;
}) {
  const [texto, setTexto] = useState("");

  function handleSave() {
    if (!texto.trim()) return;
    onSave(texto.trim());
    setTexto("");
  }

  function handleClose() {
    setTexto("");
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40">
      <div className="w-full max-w-[430px] bg-surface-primary rounded-t-2xl flex flex-col">
        <div className="flex justify-end px-5 pt-5">
          <button
            onClick={handleClose}
            className="p-2 -mr-2 text-text-primary cursor-pointer"
            aria-label="Cerrar"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="4" x2="16" y2="16" />
              <line x1="4" y1="16" x2="16" y2="4" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-6">
          <h3 className="font-heading text-xl font-bold text-text-primary mb-4">
            Agregar una condición
          </h3>

          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            autoFocus
            rows={5}
            className="w-full rounded border border-transparent bg-btn-regular px-3 py-3 font-body text-sm text-text-primary placeholder:text-text-primary/60 transition-colors hover:border-border-primary hover:bg-surface-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none resize-none"
          />

          <button
            onClick={handleSave}
            disabled={!texto.trim()}
            className="w-full rounded-lg bg-surface-secondary py-3.5 font-heading text-sm font-bold text-text-invert hover:bg-brand-700 transition-colors cursor-pointer mt-4 disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
