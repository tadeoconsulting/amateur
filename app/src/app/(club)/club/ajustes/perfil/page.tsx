"use client";

import { useState } from "react";
import { BackHeader } from "@/_components/back-header";
import { Toast } from "@/_components/toast";

export default function ClubPerfilPage() {
  const [equipo, setEquipo] = useState("");
  const [nombreCorto, setNombreCorto] = useState("");
  const [color, setColor] = useState("#CCCCCC");
  const [delegadoNombre, setDelegadoNombre] = useState("");
  const [delegadoTel, setDelegadoTel] = useState("");
  const [delegadoEmail, setDelegadoEmail] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const handleSave = () => {
    setToast("Ajustes del club actualizados.");
  };

  return (
    <div className="w-full pb-8">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <BackHeader label="Editar ajustes" />

      {/* Avatar */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-brand-200 bg-white">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-brand-400">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="absolute -bottom-1 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-900">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="mt-6 space-y-5 px-4">
        <div>
          <label className="text-sm text-text-secondary">Equipo</label>
          <input
            type="text"
            value={equipo}
            onChange={(e) => setEquipo(e.target.value)}
            className="mt-1 w-full border-b border-brand-200 py-2 text-sm text-text-primary focus:border-brand-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm text-text-secondary">Nombre corto</label>
          <input
            type="text"
            value={nombreCorto}
            onChange={(e) => setNombreCorto(e.target.value)}
            className="mt-1 w-full border-b border-brand-200 py-2 text-sm text-text-primary focus:border-brand-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm text-text-secondary">Color representativo</label>
          <div className="mt-1 flex items-center gap-3 border-b border-brand-200 py-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            <span className="text-sm text-text-secondary">Elige un color</span>
          </div>
        </div>

        <div>
          <label className="text-sm text-text-secondary">Nombre del delegado</label>
          <input
            type="text"
            value={delegadoNombre}
            onChange={(e) => setDelegadoNombre(e.target.value)}
            className="mt-1 w-full border-b border-brand-200 py-2 text-sm text-text-primary focus:border-brand-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm text-text-secondary">Número del delegado</label>
          <input
            type="tel"
            value={delegadoTel}
            onChange={(e) => setDelegadoTel(e.target.value)}
            className="mt-1 w-full border-b border-brand-200 py-2 text-sm text-text-primary focus:border-brand-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm text-text-secondary">Correo del delegado</label>
          <input
            type="email"
            value={delegadoEmail}
            onChange={(e) => setDelegadoEmail(e.target.value)}
            className="mt-1 w-full border-b border-brand-200 py-2 text-sm text-text-primary focus:border-brand-900 focus:outline-none"
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full cursor-pointer rounded-xl bg-brand-900 py-3.5 font-heading text-sm font-semibold text-text-invert"
        >
          Completar ajustes del club
        </button>
      </div>
    </div>
  );
}
