"use client";

import { MATCH_TONE, matchTone } from "@/_lib/match-tone";
import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getTournaments, getMatches, type TournamentListItem, type MatchListItem } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { useAuth } from "@/lib/auth-context";
import { formatMatchDate, formatTime12, UNSCHEDULED_LABEL } from "@/_lib/match-format";
import { ClubCrest } from "@/_components/club-crest";

type Estado = "proximos" | "en_vivo" | "finalizados";

const ESTADOS: { key: Estado; label: string }[] = [
  { key: "proximos", label: "Próximos" },
  { key: "en_vivo", label: "En vivo" },
  { key: "finalizados", label: "Finalizados" },
];

const ALL = "todos";

const estadoDe = (m: MatchListItem): Estado => (m.status === "en_curso" ? "en_vivo" : m.status === "finalizado" ? "finalizados" : "proximos");

/** Cuándo se juega una fecha: un día, un rango, o "por definir" si todavía no tiene día y hora. */
function rangoDeFecha(matches: MatchListItem[]): string {
  const dias = [...new Set(matches.filter((m) => m.time !== "").map((m) => m.date.slice(0, 10)))].sort();
  if (dias.length === 0) return UNSCHEDULED_LABEL;
  if (dias.length === 1) return formatMatchDate(`${dias[0]}T00:00:00.000Z`);
  return `${formatMatchDate(`${dias[0]}T00:00:00.000Z`)} – ${formatMatchDate(`${dias[dias.length - 1]}T00:00:00.000Z`)}`;
}

function PartidoRow({ m }: { m: MatchListItem }) {
  const href = m.status === "finalizado" ? `/torneos/${m.tournamentId}/resultado/${m.id}` : `/torneos/${m.tournamentId}/en-vivo/${m.id}`;
  const conMarcador = m.status !== "programado";
  return (
    <Link
      href={href}
      className="flex min-h-16 items-center gap-3 border-t border-border-primary px-3 py-3 transition-colors first:border-t-0 hover:bg-btn-regular"
    >
      <div className="min-w-0 flex-1">
        {[
          { team: m.homeTeam, score: m.homeScore },
          { team: m.awayTeam, score: m.awayScore },
        ].map((side, i) => (
          <div key={i} className={`flex items-center gap-2 ${i === 0 ? "mb-1.5" : ""}`}>
            <ClubCrest club={side.team} size="h-6 w-6" textSize="text-[8px]" />
            <span className="min-w-0 flex-1 truncate font-body text-sm text-text-primary">{side.team?.name ?? "Por definir"}</span>
            {conMarcador && <span className="shrink-0 font-heading text-base font-bold tabular-nums text-text-primary">{side.score ?? 0}</span>}
          </div>
        ))}
      </div>
      <span aria-hidden="true" className="h-10 w-px shrink-0 bg-border-primary" />
      <div className="w-[92px] shrink-0 text-right">
        {m.status === "en_curso" ? (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-heading text-xs font-bold ${MATCH_TONE[matchTone(m.status, m.period)].soft}`}>
            <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${MATCH_TONE[matchTone(m.status, m.period)].dot}`} aria-hidden="true" />
            {m.period === "descanso" ? "Descanso" : "En vivo"}
          </span>
        ) : m.status === "finalizado" ? (
          <span className={`font-heading text-xs font-semibold ${MATCH_TONE.finished.text}`}>Final</span>
        ) : (
          <span className="font-heading text-xs font-bold text-text-primary">{m.time === "" ? UNSCHEDULED_LABEL : formatTime12(m.time)}</span>
        )}
        {m.time !== "" && <p className="mt-0.5 font-body text-[11px] text-text-secondary">{formatMatchDate(m.date)}</p>}
        {m.status === "programado" && <p className="mt-0.5 font-heading text-[11px] font-bold text-brand-500">Iniciar</p>}
      </div>
    </Link>
  );
}

/** Una fecha del torneo, plegable: la primera viene abierta y el resto cerradas, para no mostrar una lista interminable. */
function FechaGrupo({ titulo, rango, matches, abierta }: { titulo: string; rango: string; matches: MatchListItem[]; abierta: boolean }) {
  return (
    <details open={abierta} className="group overflow-hidden rounded-xl border border-border-primary">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 bg-btn-regular px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="font-heading text-sm font-bold text-text-primary">{titulo}</span>
          <span className="ml-2 font-body text-xs text-text-secondary">{rango}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="font-body text-xs tabular-nums text-text-secondary">
            {matches.length} {matches.length === 1 ? "partido" : "partidos"}
          </span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-text-secondary transition-transform group-open:rotate-180">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <div>
        {matches.map((m) => (
          <PartidoRow key={m.id} m={m} />
        ))}
      </div>
    </details>
  );
}

/** Agrupa por fecha: ascendente (lo que viene primero), o descendente en los finalizados (lo último que se jugó). */
function porFecha(matches: MatchListItem[], estado: Estado) {
  const grupos = new Map<number, MatchListItem[]>();
  for (const m of matches) grupos.set(m.matchday, [...(grupos.get(m.matchday) ?? []), m]);
  return [...grupos.entries()].sort(([a], [b]) => (estado === "finalizados" ? b - a : a - b));
}

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
  const cuenta = (e: Estado) => delTorneo.filter((m) => estadoDe(m) === e).length;

  const pedidoEstado = params.get("estado") as Estado | null;
  const estado: Estado =
    pedidoEstado && ESTADOS.some((e) => e.key === pedidoEstado) ? pedidoEstado : cuenta("en_vivo") > 0 ? "en_vivo" : cuenta("proximos") > 0 ? "proximos" : "finalizados";
  const visibles = delTorneo.filter((m) => estadoDe(m) === estado);

  function ir(cambios: { torneo?: string; estado?: Estado }) {
    const next = new URLSearchParams(params.toString());
    if (cambios.torneo) next.set("torneo", cambios.torneo);
    if (cambios.estado) next.set("estado", cambios.estado);
    // Al cambiar de torneo se vuelve a elegir el estado más útil de ese torneo.
    if (cambios.torneo && !cambios.estado) next.delete("estado");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const chip = (activo: boolean) =>
    `inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 font-heading text-xs font-semibold transition-colors ${
      activo ? "bg-surface-secondary text-text-invert" : "border border-border-primary text-text-primary hover:bg-btn-regular"
    }`;

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
          {/* 1. Torneo */}
          <div role="group" aria-label="Torneo" className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 pt-1">
            {conPartidos.length > 1 && (
              <button type="button" onClick={() => ir({ torneo: ALL })} aria-pressed={torneo === ALL} className={chip(torneo === ALL)}>
                Todos
              </button>
            )}
            {conPartidos.map((t) => (
              <button key={t.id} type="button" onClick={() => ir({ torneo: t.id })} aria-pressed={torneo === t.id} className={chip(torneo === t.id)}>
                {enVivoDe(t.id) > 0 && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red" aria-label="Con partidos en vivo" />}
                <span className="max-w-[180px] truncate">{t.name}</span>
              </button>
            ))}
          </div>

          {/* 2. Estado */}
          <div role="tablist" aria-label="Estado de los partidos" className="mx-4 flex gap-1 rounded-xl bg-btn-regular p-1">
            {ESTADOS.map((e) => (
              <button
                key={e.key}
                role="tab"
                type="button"
                aria-selected={estado === e.key}
                onClick={() => ir({ estado: e.key })}
                className={`flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-2 font-heading text-xs font-semibold transition-colors ${
                  estado === e.key ? "bg-surface-primary text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {e.label}
                <span className="font-body tabular-nums text-text-secondary">{cuenta(e.key)}</span>
              </button>
            ))}
          </div>

          {/* 3. Partidos: por torneo (si son todos) y por fecha */}
          <div role="tabpanel" className="mt-4 flex flex-col gap-5 px-4">
            {visibles.length === 0 ? (
              <p className="rounded-xl border border-border-primary px-4 py-8 text-center font-body text-sm text-text-secondary">
                {estado === "proximos" ? "No hay partidos próximos." : estado === "en_vivo" ? "No hay partidos en vivo ahora." : "Todavía no hay partidos finalizados."}
              </p>
            ) : torneo === ALL ? (
              conPartidos
                .filter((t) => visibles.some((m) => m.tournamentId === t.id))
                .map((t) => (
                  <section key={t.id} aria-label={t.name} className="flex flex-col gap-2">
                    <h2 className="font-heading text-sm font-bold text-text-primary">{t.name}</h2>
                    {porFecha(visibles.filter((m) => m.tournamentId === t.id), estado).map(([fecha, matches], i) => (
                      <FechaGrupo key={`${t.id}-${fecha}`} titulo={`Fecha ${fecha}`} rango={rangoDeFecha(matches)} matches={matches} abierta={i === 0} />
                    ))}
                  </section>
                ))
            ) : (
              porFecha(visibles, estado).map(([fecha, matches], i) => (
                <FechaGrupo key={fecha} titulo={`Fecha ${fecha}`} rango={rangoDeFecha(matches)} matches={matches} abierta={i === 0} />
              ))
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
