"use client";

import { useParams, useRouter } from "next/navigation";
import { ConvocatoriaLinkCard } from "@/_components/convocatoria-link-card";
import { getTournament } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";

export default function AgregarEquipoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: tournament } = useApi(() => getTournament(params.id));

  return (
    <div className="relative w-full pb-8">
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

        {/* Card 3 — Invitar por WhatsApp: link real de la convocatoria */}
        {tournament && <ConvocatoriaLinkCard tournamentId={params.id} tournamentName={tournament.name} />}

      </div>
    </div>
  );
}
