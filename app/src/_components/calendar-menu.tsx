"use client";

import { useState } from "react";
import { withTabParam } from "@/_lib/fixture";
import { shareLink } from "@/_lib/share";

/**
 * "Agregar al calendario" del fixture: descargar los partidos de la fecha que se está viendo, suscribirse
 * a todo el torneo (se actualiza solo cuando cambian los horarios) y copiar el link de esa fecha. Es un
 * `<details>`: se abre con teclado y lector de pantalla sin código extra.
 */
export function CalendarMenu({
  tournamentId,
  title,
  publicPath,
  tab,
  hasUpcoming,
}: {
  tournamentId: string;
  title: string;
  publicPath: string;
  /** La fecha o ronda que se está viendo. */
  tab: { key: string; label: string };
  /** ¿Esa fecha tiene partidos con horario por jugar? Si no, no hay nada que agregar. */
  hasUpcoming: boolean;
}) {
  const [status, setStatus] = useState("");
  const param = withTabParam("", tab.key); // "fecha=5" o "ronda=2"
  const api = `/api/tournaments/${tournamentId}/calendar`;
  const item =
    "flex min-h-11 w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left font-body text-sm text-text-primary transition-colors hover:bg-btn-regular focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-text-primary";

  async function copyLink() {
    const url = `${window.location.origin}${publicPath}?${param}`;
    const result = await shareLink({ title, text: `${title} · ${tab.label}`, url });
    setStatus(result === "copied" ? "Enlace copiado." : result === "failed" ? "No se pudo copiar el enlace." : "");
  }

  return (
    <details className="relative" onToggle={(e) => !e.currentTarget.open && setStatus("")}>
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg border border-border-primary px-3 font-heading text-xs font-semibold text-text-primary transition-colors hover:bg-btn-regular focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary [&::-webkit-details-marker]:hidden">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="3" y="4.5" width="14" height="12.5" rx="1.8" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3 8.5h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        Agregar al calendario
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-border-primary bg-surface-primary p-1.5 shadow-lg">
        {hasUpcoming ? (
          <a href={`${api}?${param}&descargar=1`} download className={item}>
            Descargar {tab.label} (.ics)
          </a>
        ) : (
          <p className="px-3 py-2 font-body text-xs text-text-secondary">{tab.label} no tiene partidos con horario por jugar.</p>
        )}
        <a href={`webcal://${typeof window !== "undefined" ? window.location.host : ""}${api}`} className={item}>
          Suscribirme a todo el torneo
        </a>
        <button type="button" onClick={copyLink} className={item}>
          Copiar el enlace de {tab.label}
        </button>
        {status && (
          <p role="status" className="px-3 pb-1.5 pt-1 font-body text-xs text-text-secondary">
            {status}
          </p>
        )}
      </div>
    </details>
  );
}
