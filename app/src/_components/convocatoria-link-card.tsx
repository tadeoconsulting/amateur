"use client";

import { useState, useSyncExternalStore } from "react";
import { Toast } from "@/_components/toast";
import { btnSolid } from "@/_components/button-styles";
import { copyText } from "@/_lib/share";

const subscribe = () => () => {};

/** Link público de la convocatoria de un torneo: lo abre un equipo que quiere pedir unirse. */
export function ConvocatoriaLinkCard({ tournamentId }: { tournamentId: string }) {
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  // El origen solo existe en el navegador: en el servidor se renderiza vacío.
  const origin = useSyncExternalStore(subscribe, () => window.location.origin, () => "");
  const url = origin ? `${origin}/convocatoria/${tournamentId}` : "";

  // Siempre copia (antes "Compartir" abría el menú del sistema en vez de copiar, y en una
  // computadora no había forma de llevarse el link para pegarlo donde se quisiera).
  async function copy() {
    const ok = await copyText(url);
    setToast(ok ? { message: "Link copiado. Pégalo en WhatsApp.", tone: "success" } : { message: "No se pudo copiar. Copia el link a mano.", tone: "error" });
  }

  return (
    <div className="rounded-2xl bg-[#BEE3F8] p-5">
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
      <h2 className="mb-2 font-heading text-lg font-bold text-text-primary">Invitar por WhatsApp</h2>
      <p className="mb-5 font-body text-sm leading-snug text-text-primary">
        Comparte este link para que un equipo pida unirse al torneo. Tú decides quién entra desde la pestaña Solicitudes.
      </p>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 rounded-lg border border-transparent bg-white px-3 py-3">
          <span className="block truncate font-body text-sm text-text-secondary" aria-label="Link de la convocatoria">
            {url || "Generando link..."}
          </span>
        </div>
        <button onClick={copy} disabled={!url} className={btnSolid}>
          Copiar
        </button>
      </div>
    </div>
  );
}
