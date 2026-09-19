"use client";

import { useState } from "react";
import { MapaModal } from "./mapa-modal";

const searchResults: { address: string; district: string }[] = [];

export function DireccionModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (address: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [showMapa, setShowMapa] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState("");

  const filtered = query.trim().length > 0
    ? searchResults.filter((r) =>
        r.address.toLowerCase().includes(query.toLowerCase()) ||
        r.district.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  function handleSelectResult(address: string) {
    setSelectedAddress(address);
    setShowMapa(true);
  }

  function handleConfirmAddress(address: string) {
    setShowMapa(false);
    setQuery("");
    onSelect(address);
  }

  function handleClose() {
    setQuery("");
    onClose();
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40">
        <div className="w-full max-w-[430px] bg-surface-primary rounded-t-2xl max-h-[75vh] flex flex-col">
          {/* Header */}
          <div className="px-5 pt-5 pb-4">
            <button
              onClick={handleClose}
              className="flex items-center gap-1 font-heading text-base font-semibold text-text-primary cursor-pointer mb-4"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180">
                <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Volver
            </button>

            <label className="block font-heading text-sm font-semibold text-text-primary mb-2">
              Ingresa la ubicación
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar dirección..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                className="w-full rounded border border-transparent bg-btn-regular px-3 py-3 pr-10 font-body text-sm text-text-primary placeholder:text-text-primary/60 transition-colors hover:border-border-primary hover:bg-surface-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="4" y1="4" x2="12" y2="12" />
                    <line x1="4" y1="12" x2="12" y2="4" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            {filtered.length > 0 ? (
              <ul className="flex flex-col">
                {filtered.map((result, i) => (
                  <li key={i}>
                    <button
                      onClick={() => handleSelectResult(result.address)}
                      className="w-full text-left py-4 border-b border-brand-200 last:border-0 cursor-pointer hover:bg-brand-300 -mx-2 px-2 rounded"
                    >
                      <p className="font-body text-sm text-text-primary leading-snug">{result.address}</p>
                      <p className="font-body text-xs text-text-secondary mt-1">{result.district}</p>
                    </button>
                  </li>
                ))}
              </ul>
            ) : query.trim().length > 0 ? (
              <p className="font-body text-sm text-text-secondary py-4 text-center">
                No se encontraron resultados
              </p>
            ) : null}
          </div>

          {/* Use current location */}
          <div className="px-5 pb-6 pt-2 border-t border-brand-200">
            <button
              onClick={() => handleSelectResult("Ubicación actual detectada")}
              className="flex items-center gap-2 text-text-primary font-heading text-sm font-semibold cursor-pointer mx-auto"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M17 3L3 10l5.5 1.5L10 17l7-14z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Usar mi ubicación actual
            </button>
          </div>
        </div>
      </div>

      <MapaModal
        open={showMapa}
        address={selectedAddress}
        onClose={() => setShowMapa(false)}
        onConfirm={handleConfirmAddress}
      />
    </>
  );
}
