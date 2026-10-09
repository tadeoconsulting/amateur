"use client";

import Link from "next/link";
import { getMatches, getStandings, getTournament, type MatchListItem } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { teamForm, roundLabel, type FormEntry } from "@/_lib/fixture";
import { formatTime12, formatWhen, UNSCHEDULED_LABEL } from "@/_lib/match-format";
import { useMediaQuery } from "@/_lib/use-media-query";
import { ClubCrest } from "@/_components/club-crest";
import { StandingsTable } from "@/_components/tournament-results";

/** Desde qué ancho de pantalla se usa la ficha de escritorio (coincide con la columna ancha de 896 px). */
export function useWideSheet() {
  return useMediaQuery("(min-width: 900px)");
}

const FALLBACK_HOME = "#1B1B1B";
const FALLBACK_AWAY = "#4D4D4D";

/**
 * La ficha de un partido en pantallas anchas, con la referencia de la Premier League: una cabecera con
 * los colores de los dos clubes (local a la izquierda, visitante a la derecha) y el marcador o la hora
 * en el centro; abajo, el contenido propio de cada pantalla (`children`: la cronología, las acciones)
 * y, al lado, lo que sirve para leer el partido — cómo vienen los dos equipos, la tabla y los datos.
 *
 * Solo se monta en escritorio (ver `useWideSheet`): en el celular cada pantalla sigue como siempre y no
 * hace ninguna de las consultas de acá.
 */
export function MatchSheet({
  match,
  tournamentId,
  backHref,
  backLabel,
  children,
}: {
  match: MatchListItem;
  tournamentId: string;
  backHref: string;
  backLabel: string;
  children: React.ReactNode;
}) {
  const { data: matches } = useApi(() => getMatches({ tournamentId }));
  const { data: standings } = useApi(() => getStandings(tournamentId));
  const { data: tournament } = useApi(() => getTournament(tournamentId));

  const home = match.homeTeam;
  const away = match.awayTeam;
  const played = match.status !== "programado";
  const live = match.status === "en_curso";
  const byPenalties = match.decisive && match.status === "finalizado" && match.winnerTeamId !== null && match.homeScore === match.awayScore;
  const rounds = (matches ?? []).filter((m) => m.decisive).map((m) => m.matchday);
  const phase = match.decisive ? roundLabel(match.matchday, rounds.length ? Math.max(...rounds) : match.matchday) : `Fecha ${match.matchday}`;
  const qualifyCount = tournament?.format === "liga" ? (tournament.playoffTeams ?? null) : null;
  const showTable = tournament?.format === "liga" && (standings?.length ?? 0) > 0;

  return (
    <div className="px-4 pb-10 pt-4">
      <Link
        href={backHref}
        className="inline-flex min-h-11 items-center gap-1 font-heading text-sm font-semibold text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M12.5 15L7.5 10l5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {backLabel}
      </Link>

      {/* Cabecera: los colores de cada club, con una capa oscura para que el texto blanco se lea sobre cualquier color */}
      <section aria-label={`${home?.name ?? "Por definir"} contra ${away?.name ?? "por definir"}`} className="relative mt-2 overflow-hidden rounded-2xl text-white">
        <div aria-hidden="true" className="absolute inset-0 flex">
          <div className="flex-1" style={{ backgroundColor: home?.color ?? FALLBACK_HOME }} />
          <div className="flex-1" style={{ backgroundColor: away?.color ?? FALLBACK_AWAY }} />
        </div>
        <div aria-hidden="true" className="absolute inset-0 bg-black/55" />
        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-6 px-10 py-10">
          <TeamBlock team={home} />
          <div className="flex min-w-40 flex-col items-center gap-2">
            <p className="font-body text-xs text-white/80">{phase}</p>
            <div className="rounded-2xl bg-surface-secondary px-7 py-3 text-center font-heading font-bold tabular-nums text-text-invert">
              {played ? (
                <span className="text-5xl">
                  {match.homeScore ?? 0} - {match.awayScore ?? 0}
                </span>
              ) : match.time === "" ? (
                <span className="text-2xl">vs</span>
              ) : (
                <span className="text-3xl">{formatTime12(match.time)}</span>
              )}
            </div>
            <p className="font-heading text-xs font-bold">
              {live ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-verification motion-reduce:animate-none" aria-hidden="true" />
                  En vivo
                </span>
              ) : match.status === "finalizado" ? (
                "Final"
              ) : (
                match.time === "" ? UNSCHEDULED_LABEL : "Por jugar"
              )}
            </p>
            {byPenalties && (
              <p className="font-body text-xs text-white/80">
                Penales {match.penaltyHomeScore ?? 0}-{match.penaltyAwayScore ?? 0}
              </p>
            )}
          </div>
          <TeamBlock team={away} />
        </div>
      </section>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)_22rem] items-start gap-8">
        <div className="min-w-0">{children}</div>

        <aside aria-label="Contexto del partido" className="sticky top-20 flex flex-col gap-6">
          <section aria-labelledby="forma-titulo" className="rounded-xl border border-border-primary p-4">
            <h2 id="forma-titulo" className="font-heading text-sm font-bold text-text-primary">
              Forma de los equipos
            </h2>
            <p className="mt-0.5 font-body text-xs text-text-secondary">Últimos 5 partidos del torneo, de izquierda a derecha.</p>
            <div className="mt-4 flex flex-col gap-5">
              <FormRow team={home} entries={home ? teamForm(matches ?? [], home.id, match) : []} loading={!matches} />
              <FormRow team={away} entries={away ? teamForm(matches ?? [], away.id, match) : []} loading={!matches} />
            </div>
          </section>

          {showTable && (
            <section aria-labelledby="tabla-titulo">
              <h2 id="tabla-titulo" className="mb-3 font-heading text-sm font-bold text-text-primary">
                Posiciones
              </h2>
              <StandingsTable standings={standings ?? []} qualifyCount={qualifyCount} compact highlightClubIds={[home?.id, away?.id].filter((x): x is string => !!x)} />
            </section>
          )}

          <section aria-labelledby="info-titulo" className="rounded-xl border border-border-primary p-4">
            <h2 id="info-titulo" className="font-heading text-sm font-bold text-text-primary">
              Información del partido
            </h2>
            <dl className="mt-3 flex flex-col gap-3">
              <Info label="Día y hora">{formatWhen(match)}</Info>
              <Info label="Sede">{match.location || UNSCHEDULED_LABEL}</Info>
              <Info label={match.decisive ? "Ronda" : "Fecha"}>{phase}</Info>
              {match.groupName && <Info label="Grupo">{match.groupName}</Info>}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

function TeamBlock({ team }: { team: MatchListItem["homeTeam"] }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-3 text-center">
      <span className="rounded-full bg-white p-1">
        <ClubCrest club={team} size="h-20 w-20" textSize="text-lg" />
      </span>
      <p className="max-w-full font-heading text-xl font-bold leading-tight">{team?.name ?? UNSCHEDULED_LABEL}</p>
    </div>
  );
}

const RESULT_STYLE: Record<FormEntry["result"], { chip: string; label: string }> = {
  G: { chip: "bg-verification text-text-primary", label: "Ganó" },
  E: { chip: "bg-brand-200 text-text-secondary", label: "Empató" },
  P: { chip: "bg-error text-white", label: "Perdió" },
};

function FormRow({ team, entries, loading }: { team: MatchListItem["homeTeam"]; entries: FormEntry[]; loading: boolean }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <ClubCrest club={team} size="h-6 w-6" textSize="text-[9px]" />
        <span className="truncate font-heading text-xs font-bold text-text-primary">{team?.name ?? UNSCHEDULED_LABEL}</span>
      </div>
      {entries.length === 0 ? (
        <p className="font-body text-xs text-text-secondary">{loading ? "Cargando..." : "Todavía no jugó."}</p>
      ) : (
        <ol className="flex gap-2">
          {entries.map((e) => (
            <li
              key={e.matchId}
              aria-label={`${RESULT_STYLE[e.result].label} ${e.goalsFor} a ${e.goalsAgainst} ${e.home ? "contra" : "visitando a"} ${e.opponent?.name ?? "un rival"}`}
              className="flex w-11 flex-col items-center gap-1"
            >
              <span className="font-body text-[10px] uppercase text-text-secondary">{e.opponent?.shortName.slice(0, 3) ?? "?"}</span>
              <span className={`flex h-7 w-full items-center justify-center rounded-md font-heading text-xs font-bold ${RESULT_STYLE[e.result].chip}`}>{e.result}</span>
              <span className="font-body text-[11px] tabular-nums text-text-secondary">
                {e.goalsFor}-{e.goalsAgainst}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-body text-xs text-text-secondary">{label}</dt>
      <dd className="font-heading text-sm font-semibold text-text-primary">{children}</dd>
    </div>
  );
}
