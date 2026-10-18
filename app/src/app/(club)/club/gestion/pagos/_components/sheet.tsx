"use client";

import { useEffect, useRef } from "react";

/**
 * Hoja que sube desde abajo en el celular (y se centra en escritorio). Se cierra con la X, tocando afuera o con Escape,
 * y devuelve el foco al abrirse. Su contenido hace scroll si no cabe.
 */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[90dvh] w-full max-w-[430px] flex-col rounded-t-2xl bg-surface-primary md:max-w-lg md:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-5">
          <h2 className="font-heading text-lg font-bold text-text-primary">{title}</h2>
          <button ref={closeRef} onClick={onClose} aria-label="Cerrar" className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center text-text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}
