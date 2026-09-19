"use client";

import { useState } from "react";

const MODALIDADES = ["5 vs 5", "6 vs 6", "7 vs 7", "8 vs 8", "9 vs 9", "11 vs 11"];

export function ModalidadModal({
  open,
  value,
  onClose,
  onSave,
}: {
  open: boolean;
  value: string;
  onClose: () => void;
  onSave: (modalidad: string) => void;
}) {
  const [selected, setSelected] = useState(value);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40">
      <div className="w-full max-w-[430px] bg-surface-primary rounded-t-2xl flex flex-col">
        <div className="flex justify-end px-5 pt-5">
          <button
            onClick={onClose}
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
          <h3 className="font-heading text-xl font-bold text-text-primary mb-2">
            Modalidad del torneo
          </h3>
          <p className="font-body text-sm text-text-secondary mb-6">
            Define el formato de jugadores permitidos por cada equipo dentro de la cancha.
          </p>

          <div className="grid grid-cols-3 gap-3">
            {MODALIDADES.map((m) => (
              <button
                key={m}
                onClick={() => setSelected(m)}
                className={`rounded py-2.5 font-heading text-sm font-semibold cursor-pointer transition-colors ${
                  selected === m
                    ? "bg-surface-secondary text-text-invert"
                    : "border border-border-primary text-text-primary hover:bg-btn-regular"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            onClick={() => { if (selected) onSave(selected); }}
            disabled={!selected}
            className="w-full rounded-lg bg-surface-secondary py-3.5 font-heading text-sm font-bold text-text-invert hover:bg-brand-700 transition-colors cursor-pointer mt-6 disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
