"use client";

import { useState } from "react";
import Link from "next/link";
import { BackHeader } from "@/_components/back-header";
import { Toast } from "@/_components/toast";

export default function ClubInvitarPage() {
  const [toast, setToast] = useState<string | null>(null);

  const handleCopy = () => {
    setToast("Link copiado al portapapeles.");
  };

  return (
    <div className="w-full">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <BackHeader />

      <div className="space-y-4 px-4">
        {/* Search community card */}
        <div className="rounded-xl bg-[#b5ffd8] p-4">
          <h2 className="font-heading text-lg font-bold text-text-primary">
            Busca talento en la comunidad
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Encuentra el jugador que necesitas en tu equipo. Si aun no esta en Amateur, puedes invitarlo por WhatsApp.
          </p>
          <Link
            href="/club/jugadores/buscar"
            className="mt-4 block rounded-xl border border-brand-900 bg-white py-3 text-center font-heading text-sm font-semibold text-text-primary"
          >
            Buscar jugador
          </Link>
        </div>

        {/* WhatsApp invite card */}
        <div className="rounded-xl bg-[#d4e5ff] p-4">
          <h2 className="font-heading text-lg font-bold text-text-primary">
            Invitar por WhatsApp
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Comparte este link para que el jugador se una directamente a tu equipo.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-brand-200 bg-white px-3 py-2.5">
              <span className="text-sm text-text-secondary">academia.club.com</span>
            </div>
            <button
              onClick={handleCopy}
              className="cursor-pointer rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-semibold text-text-invert"
            >
              Compartir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
