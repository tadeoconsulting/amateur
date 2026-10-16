"use client";

import Link from "next/link";
import { getSeasons } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { FINAL_FORMAT_LABEL } from "@/_lib/season";
import { btnSolid } from "@/_components/button-styles";
import { SeasonStages, SeasonStatusChip } from "./season-ui";

/** La pestaña "Temporadas" de Mis torneos (especificación 012). */
export function SeasonsList({ organizerId }: { organizerId: string }) {
  const { data: seasons, loading, error } = useApi(() => getSeasons({ organizerId }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }
  if (error || !seasons) {
    return <p className="px-4 py-16 text-center font-body text-sm text-text-secondary">No se pudieron cargar las temporadas.</p>;
  }

  if (seasons.length === 0) {
    return (
      <div className="flex flex-col items-center px-4 py-12 text-center">
        <h2 className="mb-2 font-heading text-lg font-bold text-text-primary">Todavía no tienes temporadas</h2>
        <p className="mb-6 max-w-[300px] font-body text-sm text-text-secondary">
          Una temporada junta una Apertura y un Clausura con los mismos equipos, suma una tabla General y define al campeón con una
          fase final.
        </p>
        <Link href="/torneos/temporadas/nueva" className={`${btnSolid} w-full max-w-[300px]`}>
          Crear temporada
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3 px-4 pb-6">
      {seasons.map((s) => (
        <li key={s.id} className="rounded-xl border border-border-primary">
          <Link href={`/torneos/temporadas/${s.id}`} className="block rounded-t-xl px-4 pt-4 pb-1 transition-colors hover:bg-btn-regular">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 truncate font-heading text-sm font-bold text-text-primary">{s.name}</p>
              <SeasonStatusChip status={s.status} />
            </div>
            <p className="mt-0.5 font-body text-xs text-text-secondary">
              {s.teamsCount} equipos · {FINAL_FORMAT_LABEL[s.finalFormat]}
              {s.finalTeams !== null && ` (clasifican ${s.finalTeams})`}
              {s.champion && ` · Campeón: ${s.champion.name}`}
            </p>
          </Link>
          <div className="px-4 pb-2">
            <SeasonStages season={s} />
          </div>
        </li>
      ))}
    </ul>
  );
}
