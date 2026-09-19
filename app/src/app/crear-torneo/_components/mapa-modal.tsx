"use client";

import { useState } from "react";

export function MapaModal({
  open,
  address,
  onClose,
  onConfirm,
}: {
  open: boolean;
  address: string;
  onClose: () => void;
  onConfirm: (address: string) => void;
}) {
  const [editedAddress, setEditedAddress] = useState(address);
  const [editing, setEditing] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/40">
      <div className="w-full max-w-[430px] bg-surface-primary rounded-t-2xl max-h-[75vh] flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5">
          <button
            onClick={onClose}
            className="flex items-center gap-1 font-heading text-base font-semibold text-text-primary cursor-pointer mb-2"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180">
              <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Volver
          </button>
        </div>

        {/* Map placeholder */}
        <div className="mx-5 h-64 rounded-xl bg-brand-200 relative flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,var(--color-brand-300)_25%,transparent_25%,transparent_75%,var(--color-brand-300)_75%)] bg-[length:20px_20px] opacity-30" />
          <div className="relative flex flex-col items-center gap-2">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" fill="var(--color-surface-secondary)" />
            </svg>
            <span className="font-heading text-xs text-text-secondary bg-surface-primary/80 px-3 py-1 rounded-full">
              Vista de mapa
            </span>
          </div>
        </div>

        {/* Address confirmation */}
        <div className="px-5 pt-5 pb-6">
          <p className="font-heading text-sm font-bold text-text-primary mb-2">
            Verificar la ubicación:
          </p>

          <div className="flex items-start gap-3">
            {editing ? (
              <input
                type="text"
                value={editedAddress}
                onChange={(e) => setEditedAddress(e.target.value)}
                autoFocus
                onBlur={() => setEditing(false)}
                onKeyDown={(e) => { if (e.key === "Enter") setEditing(false); }}
                className="flex-1 rounded border border-transparent bg-btn-regular px-3 py-3 font-body text-sm text-text-primary transition-colors hover:border-border-primary hover:bg-surface-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none"
              />
            ) : (
              <p className="flex-1 font-body text-sm text-text-secondary leading-snug">
                {editedAddress || address}
              </p>
            )}
            <button
              onClick={() => { setEditedAddress(editedAddress || address); setEditing(true); }}
              className="p-1 text-text-secondary hover:text-text-primary cursor-pointer shrink-0"
              aria-label="Editar dirección"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M13.5 2.5a1.5 1.5 0 012.12 2.12L6 14.25 2 16l1.75-4L13.5 2.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <button
            onClick={() => onConfirm(editedAddress || address)}
            className="w-full rounded-lg bg-surface-secondary py-3 font-heading text-sm font-bold text-text-invert hover:bg-brand-700 transition-colors cursor-pointer mt-5"
          >
            Confirmar dirección
          </button>
        </div>
      </div>
    </div>
  );
}
