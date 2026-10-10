"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMatches, type MatchEventItem, type MatchListItem } from "@/_lib/api";
import { roundLabel } from "@/_lib/fixture";
import { formatWhen, formatWhenSentence } from "@/_lib/match-format";
import { isStale, liveMinute } from "@/_lib/match-live";
import { useApi } from "@/_lib/use-api";
import { useMatchRealtime } from "@/_lib/use-match-realtime";
import { ClubCrest } from "@/_components/club-crest";
import { MatchSheet, useWideSheet } from "@/_components/match-sheet";

/** Lo que trae `GET /api/matches/:id`: el partido y, de su torneo, lo justo para mostrarlo. */
type MatchDetailData = MatchListItem & { tournament?: MatchListItem["tournament"] & { format?: string } };

/**
 * La ficha de un partido para quien lo mira: el marcador y el estado, la cronología con los nombres de
 * quienes anotaron o vieron tarjeta y, en escritorio, la forma de los equipos, la tabla y los datos
 * (ver `MatchSheet`). Se actualiza sola mientras el partido se juega.
 *
 * Es la única ficha de lectura: el fan (ruta pública del torneo), el jugador y el club la usan, para
 * que un partido se vea igual en todas las pantallas. Lo propio de cada rol entra por `extra`
 * (el club, por ejemplo, define sus titulares desde acá).
 */
export function MatchDetail({
  matchId,
  tournamentId,
  backHref,
  backLabel = "Volver al torneo",
  extra,
}: {
  matchId: string;
  tournamentId: string;
  /** A dónde vuelve la flecha. Con una función, se arma con el partido (por ejemplo, para caer en su fecha). */
  backHref: string | ((match: MatchListItem) => string);
  backLabel?: string;
  /** Lo propio del rol: va arriba de la cronología. */
  extra?: (match: MatchListItem) => React.ReactNode;
}) {
  const wide = useWideSheet();
  const { data: match, loading, error, refetchSilently: refetchMatch } = useApi<MatchDetailData>(async () => {
    const res = await fetch(`/api/matches/${matchId}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  });
  const { data: events, refetchSilently: refetchEvents } = useApi<MatchEventItem[]>(async () => {
    const res = await fetch(`/api/matches/${matchId}/events`);
    return res.ok ? res.json() : [];
  });
  // Cada vez que llega una novedad, la tabla y la forma de los equipos de la ficha de escritorio también se vuelven a pedir.
  const [liveVersion, setLiveVersion] = useState(0);
  useMatchRealtime(matchId, () => {
    refetchMatch();
    refetchEvents();
    setLiveVersion((v) => v + 1);
  });

  // El cronómetro corre solo mientras se juega (un partido terminado no necesita el reloj).
  const live = match?.status === "en_curso";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [live]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" role="status" aria-label="Cargando el partido" />
      </div>
    );
  }
  // Un partido de otro torneo se trata igual que uno que no existe: la ficha siempre cuelga de su torneo.
  if (error || !match || match.tournamentId !== tournamentId) {
    const href = typeof backHref === "string" ? backHref : null;
    return (
      <div className="flex flex-col items-center px-6 py-20 text-center">
        <h1 className="font-heading text-lg font-bold text-text-primary">Este partido no existe</h1>
        <p className="mt-2 font-body text-sm text-text-secondary">El link puede estar incompleto o el partido ya no está en el torneo.</p>
        {href && (
          <Link href={href} className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-border-primary px-4 font-heading text-sm font-semibold text-text-primary">
            {backLabel}
          </Link>
        )}
      </div>
    );
  }

  const back = typeof backHref === "string" ? backHref : backHref(match);
  const finished = match.status === "finalizado";
  const scheduled = match.status === "programado";
  const stale = live && isStale(match.startedAt, now, match.tournament?.minutesPerHalf);
  // La tanda de penales no es una jugada de un jugador: se resume aparte, junto al marcador.
  const plays = (events ?? []).filter((e) => e.type === "gol" || e.type === "tarjeta_amarilla" || e.type === "tarjeta_roja");
  const byPenalties = match.decisive && finished && match.winnerTeamId !== null && match.homeScore === match.awayScore;

  // Lo de adentro es lo mismo en celular y en escritorio; solo cambia el marco (ver abajo).
  const body = (
    <>
      {extra?.(match)}

      {plays.length > 0 && <Timeline plays={plays} match={match} />}

      {!scheduled && plays.length === 0 && (
        <p className="mt-8 px-4 text-center font-body text-sm text-text-secondary">{live ? "Todavía no hay jugadas." : "No se registraron jugadas en este partido."}</p>
      )}

      {scheduled && (
        <div className="mt-8 flex flex-col items-center gap-3 px-4">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-text-secondary" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-center font-body text-sm text-text-secondary">El partido aún no ha comenzado</p>
          <p className="text-center font-body text-xs text-text-secondary">
            {formatWhenSentence(match)}
            {match.location ? ` en ${match.location}` : ""}
          </p>
        </div>
      )}
    </>
  );

  // Pantalla ancha: la ficha con la cabecera por colores de los clubes y el contexto al lado.
  if (wide) {
    return (
      <MatchSheet match={match} tournamentId={tournamentId} backHref={back} backLabel={backLabel} liveVersion={liveVersion}>
        <div className="-mx-4">{body}</div>
      </MatchSheet>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col pb-4">
      <div className="flex items-center gap-3 px-4 pb-2 pt-4">
        <Link href={back} aria-label={backLabel} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="font-heading text-lg font-bold text-text-primary">{live ? "En vivo" : finished ? "Resultado" : "Partido"}</h1>
      </div>

      <div className="mx-4 mt-2 rounded-xl border border-border-primary p-4">
        <div className="flex justify-center">
          {live && (
            <span className="rounded-full bg-verification px-3 py-1 font-heading text-xs font-bold text-white">
              {stale ? "En juego" : `${liveMinute(match.startedAt, now)}' En vivo`}
            </span>
          )}
          {finished && <span className="rounded-full bg-brand-200 px-3 py-1 font-heading text-xs font-bold text-text-secondary">FT · Finalizado</span>}
          {scheduled && <span className="rounded-full bg-brand-100 px-3 py-1 font-heading text-xs font-bold text-text-secondary">{formatWhen(match)}</span>}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex flex-col items-center gap-2">
            <ClubCrest club={match.homeTeam} size="h-12 w-12" textSize="text-xs" />
            <span className="max-w-[80px] text-center font-body text-xs text-text-primary">{match.homeTeam?.name ?? "Por definir"}</span>
          </div>

          <div className="flex items-center gap-3 font-heading tabular-nums">
            {scheduled ? (
              <span className="text-lg text-text-secondary">vs</span>
            ) : (
              <>
                <span className="text-3xl font-bold text-text-primary">{match.homeScore ?? 0}</span>
                <span className="text-lg text-text-secondary">-</span>
                <span className="text-3xl font-bold text-text-primary">{match.awayScore ?? 0}</span>
              </>
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            <ClubCrest club={match.awayTeam} size="h-12 w-12" textSize="text-xs" />
            <span className="max-w-[80px] text-center font-body text-xs text-text-primary">{match.awayTeam?.name ?? "Por definir"}</span>
          </div>
        </div>

        {byPenalties && (
          <p className="mt-3 text-center font-body text-xs text-text-secondary">
            Se definió por penales: {match.penaltyHomeScore ?? 0}-{match.penaltyAwayScore ?? 0}
          </p>
        )}
        <p className="mt-3 text-center font-body text-xs text-text-secondary">
          <PhaseName match={match} />
          {[match.groupName, match.location].filter(Boolean).map((part) => ` · ${part}`)}
        </p>
      </div>

      {body}
    </div>
  );
}

type Play = MatchEventItem & { type: "gol" | "tarjeta_amarilla" | "tarjeta_roja" };

const PLAY_LABEL: Record<Play["type"], string> = { gol: "Gol", tarjeta_amarilla: "Tarjeta amarilla", tarjeta_roja: "Tarjeta roja" };

/** El ícono de una jugada: pelota para el gol, cartulina para las tarjetas. */
function PlayIcon({ type }: { type: Play["type"] }) {
  if (type === "gol") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1" className="text-text-primary" />
        <path d="M7 1.75l1 2h-2l1-2zM3.5 5l2 1-1 2-2-1 1-2zM10.5 5l-2 1 1 2 2-1-1-2zM5 10.5l2-1 2 1-1 2H6l-1-2z" fill="currentColor" opacity="0.5" className="text-text-primary" />
      </svg>
    );
  }
  return <div aria-hidden="true" className={`h-3.5 w-2.5 rounded-sm ${type === "tarjeta_amarilla" ? "bg-yellow" : "bg-error"}`} />;
}

/** Cronología: una línea al centro con el minuto, lo del local a la izquierda y lo del visitante a la derecha. */
function Timeline({ plays, match }: { plays: MatchEventItem[]; match: MatchListItem }) {
  const list = plays as Play[];
  const minutes = [...new Set(list.map((e) => e.minute))].sort((a, b) => a - b);
  return (
    <div className="mt-6 px-4">
      <h2 className="font-heading text-sm font-bold text-text-primary">Cronología</h2>
      <ol className="relative mt-3">
        <div aria-hidden="true" className="absolute bottom-0 left-1/2 top-0 w-px bg-border-primary" />
        {minutes.map((minute) => {
          const at = list.filter((e) => e.minute === minute);
          const side = (teamId: string | null | undefined, align: "home" | "away") =>
            at
              .filter((e) => e.teamId === teamId)
              .map((e) => (
                <div key={e.id} aria-label={`${PLAY_LABEL[e.type]} de ${e.playerName ?? "un jugador"}`} className="flex items-center gap-1.5">
                  {align === "away" && <PlayIcon type={e.type} />}
                  <span className="font-body text-xs text-text-primary">{e.playerName ?? "Jugador"}</span>
                  {align === "home" && <PlayIcon type={e.type} />}
                </div>
              ));
          return (
            <li key={minute} className="relative mb-4 flex items-center">
              <div className="flex w-[calc(50%-16px)] flex-col items-end gap-1 pr-3">{side(match.homeTeam?.id, "home")}</div>
              <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border-primary bg-surface-primary">
                <span className="font-heading text-[10px] font-bold text-text-primary">{minute}&apos;</span>
              </div>
              <div className="flex w-[calc(50%-16px)] flex-col items-start gap-1 pl-3">{side(match.awayTeam?.id, "away")}</div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * "Fecha 3", o el nombre de la ronda de un cuadro ("Semifinal", "Final"), que depende de cuántas
 * rondas tiene: por eso, y solo en un partido de eliminación, se piden los demás partidos del torneo.
 */
function PhaseName({ match }: { match: MatchListItem }) {
  if (!match.decisive) return <>{`Fecha ${match.matchday}`}</>;
  return <BracketRound match={match} />;
}

function BracketRound({ match }: { match: MatchListItem }) {
  const { data: matches } = useApi(() => getMatches({ tournamentId: match.tournamentId }));
  const rounds = (matches ?? []).filter((m) => m.decisive).map((m) => m.matchday);
  return <>{roundLabel(match.matchday, rounds.length ? Math.max(...rounds) : match.matchday)}</>;
}
