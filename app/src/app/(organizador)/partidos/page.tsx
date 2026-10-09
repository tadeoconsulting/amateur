"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getTournaments, getMatches, type TournamentListItem, type MatchListItem } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { useAuth } from "@/lib/auth-context";
import { groupByDay } from "@/_lib/fixture";
import { DaySections, FixtureTabs } from "@/_components/fixture-tabs";

type Estado = "proximos" | "en_vivo" | "finalizados";

const ESTADOS: { key: Estado; label: string }[] = [
  { key: "proximos", label: "Próximos" },
  { key: "en_vivo", label: "En vivo" },
  { key: "finalizados", label: "Finalizados" },
];

const ALL = "todos";

const estadoDe = (m: MatchListItem): Estado => (m.status === "en_curso" ? "en_vivo" : m.status === "finalizado" ? "finalizados" : "proximos");

const hrefDe = (m: MatchListItem) => (m.status === "finalizado" ? `/torneos/${m.tournamentId}/resultado/${m.id}` : `/torneos/${m.tournamentId}/en-vivo/${m.id}`);
const sugerenciaDe = (m: MatchListItem) => (m.status === "programado" ? "Iniciar" : undefined);

/**
 * El hub de partidos del organizador: filtros arriba (torneo, equipo, estado, "Restablecer") y, abajo,
 * los partidos con la misma estructura que el fixture de todas las pantallas — por fecha y por día,
 * con la misma fila de partido. Con un solo torneo se ve su fixture; con "Todos", una agenda por día
 * que mezcla los torneos (cada fila dice de cuál es). Los filtros viven en la URL: se puede compartir
 * y sobrevive a recargar.
 */
function PartidosContent({ organizerId }: { organizerId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data: tournaments } = useApi(() => getTournaments({ organizerId }));
  const { data: allMatches, loading } = useApi(() => getMatches({ organizerId }));

  if (loading || !allMatches || !tournaments) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  // Solo los torneos que tienen partidos: un torneo sin fixture no tiene nada que mostrar acá.
  const conPartidos = tournaments.filter((t: TournamentListItem) => allMatches.some((m) => m.tournamentId === t.id));
  const enVivoDe = (id: string) => allMatches.filter((m) => m.tournamentId === id && m.status === "en_curso").length;

  // Por omisión: el torneo donde hay algo en vivo o, si no, el que juega primero; después, el primero.
  const proximoDe = (id: string) =>
    allMatches
      .filter((m) => m.tournamentId === id && m.status === "programado")
      .map((m) => `${m.date.slice(0, 10)} ${m.time || "99:99"}`)
      .sort()[0];
  const porDefecto =
    conPartidos.find((t) => enVivoDe(t.id) > 0)?.id ??
    [...conPartidos].sort((a, b) => (proximoDe(a.id) ?? "9").localeCompare(proximoDe(b.id) ?? "9"))[0]?.id ??
    ALL;

  const pedido = params.get("torneo");
  const torneo = pedido === ALL || conPartidos.some((t) => t.id === pedido) ? (pedido as string) : porDefecto;
  const delTorneo = torneo === ALL ? allMatches : allMatches.filter((m) => m.tournamentId === torneo);

  // Equipos que juegan en lo elegido (sin repetir).
  const equipos = new Map<string, string>();
  for (const m of delTorneo) {
    if (m.homeTeam) equipos.set(m.homeTeam.id, m.homeTeam.name);
    if (m.awayTeam) equipos.set(m.awayTeam.id, m.awayTeam.name);
  }
  const opcionesEquipo = [...equipos.entries()].sort(([, a], [, b]) => a.localeCompare(b, "es"));
  const pedidoEquipo = params.get("equipo");
  const equipo = pedidoEquipo && equipos.has(pedidoEquipo) ? pedidoEquipo : "";
  const delEquipo = equipo ? delTorneo.filter((m) => m.homeTeam?.id === equipo || m.awayTeam?.id === equipo) : delTorneo;

  const cuenta = (e: Estado) => delEquipo.filter((m) => estadoDe(m) === e).length;
  const pedidoEstado = params.get("estado") as Estado | null;
  const estado: Estado =
    pedidoEstado && ESTADOS.some((e) => e.key === pedidoEstado) ? pedidoEstado : cuenta("en_vivo") > 0 ? "en_vivo" : cuenta("proximos") > 0 ? "proximos" : "finalizados";
  const visibles = delEquipo.filter((m) => estadoDe(m) === estado);

  const hayFiltros = params.has("torneo") || params.has("estado") || params.has("equipo");

  function ir(cambios: { torneo?: string; estado?: Estado; equipo?: string }) {
    const next = new URLSearchParams(params.toString());
    if (cambios.torneo) next.set("torneo", cambios.torneo);
    if (cambios.estado) next.set("estado", cambios.estado);
    if (cambios.equipo !== undefined) {
      if (cambios.equipo) next.set("equipo", cambios.equipo);
      else next.delete("equipo");
    }
    // Al cambiar de torneo se vuelve a elegir el estado más útil de ese torneo, y el equipo ya no vale.
    if (cambios.torneo) {
      if (!cambios.estado) next.delete("estado");
      next.delete("equipo");
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const chip = (activo: boolean) =>
    `inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 font-heading text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary ${
      activo ? "bg-surface-secondary text-text-invert" : "border border-border-primary text-text-primary hover:bg-btn-regular"
    }`;

  const nombreDe = new Map(conPartidos.map((t) => [t.id, t.name]));

  return (
    <div className="flex min-h-dvh flex-col pb-4">
      <div className="px-4 pb-2 pt-4">
        <h1 className="font-heading text-xl font-bold text-text-primary">Partidos</h1>
        <p className="mt-1 font-body text-sm text-text-secondary">Gestiona los partidos de tus torneos</p>
      </div>

      {conPartidos.length === 0 ? (
        <p className="px-4 py-16 text-center font-body text-sm text-text-secondary">
          Cuando armes el fixture de un torneo, sus partidos aparecerán acá.
        </p>
      ) : (
        <>
          {/* Filtros: torneo, equipo y restablecer */}
          <div role="group" aria-label="Torneo" className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 pt-1">
            {conPartidos.length > 1 && (
              <button type="button" onClick={() => ir({ torneo: ALL })} aria-pressed={torneo === ALL} className={chip(torneo === ALL)}>
                Todos
              </button>
            )}
            {conPartidos.map((t) => (
              <button key={t.id} type="button" onClick={() => ir({ torneo: t.id })} aria-pressed={torneo === t.id} className={chip(torneo === t.id)}>
                {enVivoDe(t.id) > 0 && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-field-green motion-reduce:animate-none" aria-label="Con partidos en vivo" />}
                <span className="max-w-[180px] truncate">{t.name}</span>
              </button>
            ))}
          </div>

          {(opcionesEquipo.length > 1 || hayFiltros) && (
            <div className="flex items-end gap-2 px-4 pb-3">
              {opcionesEquipo.length > 1 && (
                <label className="min-w-0 flex-1">
                  <span className="mb-1 block font-body text-xs text-text-secondary">Equipo</span>
                  <select
                    value={equipo}
                    onChange={(e) => ir({ equipo: e.target.value })}
                    className="min-h-11 w-full cursor-pointer rounded-lg border border-border-primary bg-surface-primary px-3 font-body text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
                  >
                    <option value="">Todos los equipos</option>
                    {opcionesEquipo.map(([id, nombre]) => (
                      <option key={id} value={id}>
                        {nombre}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {hayFiltros && (
                <button
                  type="button"
                  onClick={() => router.replace(pathname, { scroll: false })}
                  className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border-primary px-3 font-heading text-xs font-semibold text-text-primary transition-colors hover:bg-btn-regular focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M3.5 10a6.5 6.5 0 1 1 1.9 4.6M3.5 15.5v-4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Restablecer
                </button>
              )}
            </div>
          )}

          {/* Estado */}
          <div role="tablist" aria-label="Estado de los partidos" className="mx-4 flex gap-1 rounded-xl bg-btn-regular p-1">
            {ESTADOS.map((e) => (
              <button
                key={e.key}
                role="tab"
                type="button"
                aria-selected={estado === e.key}
                onClick={() => ir({ estado: e.key })}
                className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-2 font-heading text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary ${
                  estado === e.key ? "bg-surface-primary text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {e.label}
                <span className="font-body tabular-nums text-text-secondary">{cuenta(e.key)}</span>
              </button>
            ))}
          </div>

          {/* Partidos: un torneo → su fixture por fechas; "Todos" → una agenda por día */}
          <div role="tabpanel" className="mt-4">
            {visibles.length === 0 ? (
              <p className="mx-4 rounded-xl border border-border-primary px-4 py-8 text-center font-body text-sm text-text-secondary">
                {estado === "proximos" ? "No hay partidos próximos." : estado === "en_vivo" ? "No hay partidos en vivo ahora." : "Todavía no hay partidos finalizados."}
              </p>
            ) : torneo === ALL ? (
              <DaySections
                sections={groupByDay(visibles, estado === "finalizados")}
                hrefFor={hrefDe}
                hintFor={sugerenciaDe}
                captionFor={(m) => nombreDe.get(m.tournamentId)}
              />
            ) : (
              <FixtureTabs key={`${torneo}-${estado}-${equipo}`} matches={visibles} hrefFor={hrefDe} hintFor={sugerenciaDe} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Se espera a saber quién es el usuario para pedir solo los partidos de SUS torneos.
export default function PartidosPage() {
  const { user, loading } = useAuth();
  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }
  return (
    <Suspense fallback={null}>
      <PartidosContent organizerId={user.id} />
    </Suspense>
  );
}
