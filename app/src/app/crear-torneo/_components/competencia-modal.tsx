"use client";

import { useState } from "react";

const TIPOS = ["Eliminación directa", "Relámpago", "Formato Copa", "Formato de Liga"];

export function CompetenciaModal({
  open,
  value,
  onClose,
  onSave,
}: {
  open: boolean;
  value: string;
  onClose: () => void;
  onSave: (tipo: string) => void;
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
            Tipo de competencia
          </h3>
          <p className="font-body text-sm text-text-secondary mb-6">
            Define la modalidad del torneo.{" "}
            <span className="underline font-semibold text-text-primary cursor-pointer">
              Conoce más de los formatos aquí
            </span>
          </p>

          <div className="grid grid-cols-2 gap-3">
            {TIPOS.map((t) => (
              <button
                key={t}
                onClick={() => setSelected(t)}
                className={`rounded py-2.5 px-3 font-heading text-sm font-semibold cursor-pointer transition-colors ${
                  selected === t
                    ? "bg-surface-secondary text-text-invert"
                    : "border border-border-primary text-text-primary hover:bg-btn-regular"
                }`}
              >
                {t}
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
