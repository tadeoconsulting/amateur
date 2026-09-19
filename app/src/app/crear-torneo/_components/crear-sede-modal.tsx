"use client";

import { useState } from "react";
import { DireccionModal } from "./direccion-modal";

export type Sede = {
  nombre: string;
  direccion: string;
  referencia: string;
};

export function CrearSedeModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (sede: Sede) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [referencia, setReferencia] = useState("");
  const [showDireccion, setShowDireccion] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleCrear() {
    if (!nombre.trim() || !direccion.trim()) return;
    setSuccess(true);
  }

  function handleDone() {
    onCreated({ nombre, direccion, referencia });
    setNombre("");
    setDireccion("");
    setReferencia("");
    setSuccess(false);
    onClose();
  }

  function handleClose() {
    setNombre("");
    setDireccion("");
    setReferencia("");
    setSuccess(false);
    onClose();
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40">
        <div className="w-full max-w-[430px] bg-surface-primary rounded-t-2xl max-h-[60vh] flex flex-col">
          {/* Header */}
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

          <div className="px-5 pb-6 flex-1 overflow-y-auto">
            {success ? (
              <div className="flex flex-col items-center text-center py-8 gap-4">
                <div className="w-16 h-16 rounded-full bg-field-light flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-field-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="font-heading text-lg font-bold text-text-primary">Sede creada</h3>
                <p className="font-body text-sm text-text-secondary">
                  {nombre} se ha agregado correctamente.
                </p>
                <button
                  onClick={handleDone}
                  className="w-full rounded-lg bg-surface-secondary py-3 font-heading text-sm font-bold text-text-invert hover:bg-brand-700 transition-colors cursor-pointer mt-4"
                >
                  Continuar
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-heading text-xl font-bold text-text-primary mb-6">Crear sede</h3>

                <div className="flex flex-col gap-5">
                  {/* Nombre */}
                  <div>
                    <label className="block font-heading text-sm font-semibold text-text-primary mb-2">
                      Nombre de la sede
                    </label>
                    <input
                      type="text"
                      placeholder="Ingresar nombre"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full rounded border border-transparent bg-btn-regular px-3 py-3 font-body text-sm text-text-primary placeholder:text-text-primary/60 transition-colors hover:border-border-primary hover:bg-surface-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none"
                    />
                  </div>

                  {/* Ubicación */}
                  <div>
                    <label className="block font-heading text-sm font-semibold text-text-primary mb-2">
                      Ingresa la ubicación
                    </label>
                    <button
                      onClick={() => setShowDireccion(true)}
                      className="flex w-full items-center rounded border border-transparent bg-btn-regular px-3 py-3 text-left cursor-pointer transition-colors hover:border-border-primary hover:bg-surface-primary"
                    >
                      <span className={`flex-1 font-body text-sm ${direccion ? "text-text-primary" : "text-text-primary/60"}`}>
                        {direccion || "Escribe la dirección"}
                      </span>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-secondary ml-2">
                        <path d="M10 2C6.69 2 4 4.69 4 8c0 4.5 6 10 6 10s6-5.5 6-10c0-3.31-2.69-6-6-6zm0 8a2 2 0 110-4 2 2 0 010 4z" fill="currentColor" />
                      </svg>
                    </button>
                  </div>

                  {/* Referencia */}
                  <div>
                    <label className="block font-heading text-sm font-semibold text-text-primary mb-2">
                      Referencia
                    </label>
                    <input
                      type="text"
                      placeholder="Ejemplo: frente al parque principal"
                      value={referencia}
                      onChange={(e) => setReferencia(e.target.value)}
                      className="w-full rounded border border-transparent bg-btn-regular px-3 py-3 font-body text-sm text-text-primary placeholder:text-text-primary/60 transition-colors hover:border-border-primary hover:bg-surface-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCrear}
                  disabled={!nombre.trim() || !direccion.trim()}
                  className="w-full rounded-lg bg-surface-secondary py-3 font-heading text-sm font-bold text-text-invert hover:bg-brand-700 transition-colors cursor-pointer mt-6 disabled:opacity-40"
                >
                  Crear sede
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <DireccionModal
        open={showDireccion}
        onClose={() => setShowDireccion(false)}
        onSelect={(addr) => {
          setDireccion(addr);
          setShowDireccion(false);
        }}
      />
    </>
  );
}
