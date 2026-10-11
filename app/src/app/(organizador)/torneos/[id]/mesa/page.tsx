"use client";

import { useParams } from "next/navigation";
import { BackHeader } from "@/_components/back-header";
import { MesaManager } from "@/_components/mesa-manager";

// Las mesas de un torneo (especificación 011): quienes gestionan el partido en vivo los días de juego. Se crean y se
// asignan acá; solo ven este torneo y solo desde 1 hora antes del primer partido del día hasta 1 hora después del último.
export default function MesaDelTorneoPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="pb-10">
      <BackHeader />
      <div className="flex flex-col gap-6 px-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Mesa del torneo</h1>
          <p className="mt-1 font-body text-sm text-text-secondary">
            La mesa lleva el partido en vivo: goles, tarjetas, cambios y los tiempos. Solo ve este torneo y solo puede entrar el día de juego, desde 1 hora antes del primer partido hasta 1 hora después del último.
          </p>
        </div>
        <MesaManager tournamentId={id} />
      </div>
    </div>
  );
}
