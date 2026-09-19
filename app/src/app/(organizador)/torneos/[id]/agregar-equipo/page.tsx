"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function AgregarEquipoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const inviteLink = "amateur.IA40Za.com";

  function handleShare() {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  }

  return (
    <div className="relative w-full pb-8">
      {/* Toast */}
      {copied && (
        <div className="fixed left-1/2 top-4 z-[120] w-[calc(100%-2rem)] max-w-[398px] -translate-x-1/2 animate-slide-down">
          <div className="flex items-center justify-between rounded-xl bg-verification px-4 py-4">
            <span className="font-body text-sm font-medium text-text-primary">
              Se ha copiado el link con éxito.
            </span>
            <button
              onClick={() => setCopied(false)}
              className="shrink-0 cursor-pointer p-1 text-text-primary"
              aria-label="Cerrar"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="3" x2="13" y2="13" />
                <line x1="3" y1="13" x2="13" y2="3" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-4 py-3">
        <button
          onClick={() => router.back()}
          className="flex cursor-pointer items-center gap-1 font-heading text-sm font-semibold text-text-primary"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180">
            <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver
        </button>
      </header>

      <div className="flex flex-col gap-4 px-4 mt-2">
        {/* Card 1 — Buscar en la comunidad */}
        <div className="rounded-2xl bg-[#C6F6D5] p-5">
          <h2 className="font-heading text-lg font-bold text-text-primary mb-2">
            Busca tu equipo en la comunidad
          </h2>
          <p className="font-body text-sm text-text-primary leading-snug mb-5">
            Encuéntralo entre los equipos ya registrados. Si aún no está en Amateur, puedes crearlo de forma temporal o invitarlo por WhatsApp.
          </p>
          <button
            onClick={() => router.push(`/torneos/${params.id}/agregar-equipo/buscar`)}
            className="w-full cursor-pointer rounded-lg border border-text-primary bg-transparent py-3 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-black/5"
          >
            Buscar equipo
          </button>
        </div>

        {/* Card 2 — Crear equipo temporal */}
        <div className="rounded-2xl bg-[#FEFCBF] p-5">
          <h2 className="font-heading text-lg font-bold text-text-primary mb-2">
            Crea un equipo temporal
          </h2>
          <p className="font-body text-sm text-text-primary leading-snug mb-5">
            Si el equipo no cuenta con un delegado y no quiere registrar métricas crear un equipo temporal
          </p>
          <button
            onClick={() => router.push(`/torneos/${params.id}/agregar-equipo/crear`)}
            className="w-full cursor-pointer rounded-lg border border-text-primary bg-transparent py-3 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-black/5"
          >
            Crear equipo
          </button>
        </div>

        {/* Card 3 — Invitar por WhatsApp */}
        <div className="rounded-2xl bg-[#BEE3F8] p-5">
          <h2 className="font-heading text-lg font-bold text-text-primary mb-2">
            Invitar por WhatsApp
          </h2>
          <p className="font-body text-sm text-text-primary leading-snug mb-5">
            Comparte este link para que el equipo se una directamente a la comunidad.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-transparent bg-white px-3 py-2.5 font-body text-sm text-text-secondary">
              {inviteLink}
            </div>
            <button
              onClick={handleShare}
              className="shrink-0 cursor-pointer rounded-lg bg-surface-secondary px-5 py-2.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700"
            >
              Compartir
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
