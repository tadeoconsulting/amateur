"use client";

import Link from "next/link";
import { ClubCrest } from "@/_components/club-crest";
import { displayShortName } from "@/_lib/short-name";
import type { MyClub } from "@/_lib/use-my-club";

/**
 * La identidad del club (su imagen, nombre y abreviatura) en el área del club. Lee los mismos datos
 * que edita el dueño en "Mi Ajustes" y que puede subir un administrador: una imagen que cualquiera de
 * los dos cambia se ve acá, y en todas las pantallas de la plataforma, al volver a cargar.
 */
export function MyClubCard({ club }: { club: MyClub }) {
  return (
    <Link
      href="/club/ajustes/perfil"
      className="flex items-center gap-3 rounded-xl border border-border-primary px-4 py-3 transition-colors hover:bg-btn-regular"
    >
      <ClubCrest club={club} size="h-14 w-14" textSize="text-base" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-heading text-base font-bold text-text-primary">{club.name}</p>
        <p className="truncate font-body text-xs text-text-secondary">{displayShortName(club.shortName)}</p>
      </div>
      <span className="shrink-0 font-heading text-xs font-bold text-text-primary underline">Editar</span>
    </Link>
  );
}
