"use client";

import { useState } from "react";
import { shareLink } from "@/_lib/share";
import { shareUrl, type ShareView } from "@/_lib/share-view";
import { Toast } from "@/_components/toast";

/**
 * "Compartir" la vista actual de un torneo: el enlace público (`publicPath`, sin sesión) abre en la sección,
 * la fecha o la pestaña de resultados donde está quien lo comparte. En el celular abre el menú de compartir
 * del sistema; donde no hay, copia el enlace y avisa. La usan el fan y, con sesión, el jugador, el club y el
 * organizador — cada uno dice a qué vista pública corresponde su pantalla (ver `competitionView`).
 *
 * `search`: de dónde sale la fecha o la ronda del fixture; por omisión, la URL de la pantalla.
 *
 * - `ghost` (por omisión): discreto, junto a las pestañas; en el celular solo el ícono.
 * - `solid`: botón lleno con texto, para una cabecera (el fixture del organizador).
 */
export function ShareViewButton({
  title,
  publicPath,
  view,
  search,
  variant = "ghost",
}: {
  title: string;
  publicPath: string;
  view: ShareView;
  search?: string;
  variant?: "ghost" | "solid";
}) {
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  async function share() {
    const url = shareUrl(window.location.origin, publicPath, search ?? window.location.search, view);
    const result = await shareLink({ title, text: `Mira ${title} en Amateur`, url });
    if (result === "copied") setToast({ message: "Enlace copiado. Pégalo donde quieras compartirlo.", tone: "success" });
    if (result === "failed") setToast({ message: "No se pudo copiar el enlace. Cópialo de la barra de direcciones.", tone: "error" });
  }

  const icon = (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 12.5V3m0 0L6.5 6.5M10 3l3.5 3.5M4.5 10.5v5a1.5 1.5 0 001.5 1.5h8a1.5 1.5 0 001.5-1.5v-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <>
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
      <button
        type="button"
        onClick={share}
        aria-label="Compartir esta vista"
        className={
          variant === "solid"
            ? "inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-surface-secondary px-4 py-2 font-heading text-xs font-bold text-text-invert transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
            : "inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-2 font-heading text-[13px] font-medium text-text-secondary transition-colors hover:bg-btn-regular hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
        }
      >
        {icon}
        <span className={variant === "solid" ? "" : "hidden sm:inline"}>Compartir</span>
      </button>
    </>
  );
}
