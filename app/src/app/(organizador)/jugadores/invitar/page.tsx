"use client";

import Link from "next/link";
import { BackHeader } from "@/_components/back-header";
import { InviteLinkCard } from "@/_components/invite-link-card";

export default function InvitarPage() {
  return (
    <div className="w-full">
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
            href="/jugadores/buscar"
            className="mt-4 block rounded-xl border border-brand-900 bg-white py-3 text-center font-heading text-sm font-semibold text-text-primary"
          >
            Buscar jugador
          </Link>
        </div>

        {/* WhatsApp invite card: el link real del club */}
        <InviteLinkCard />
      </div>
    </div>
  );
}
