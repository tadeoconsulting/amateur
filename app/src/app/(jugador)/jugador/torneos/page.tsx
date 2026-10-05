"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMatches, getUser, type MatchListItem } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { useTournamentRealtime } from "@/_lib/use-tournament-realtime";
import { isStale, liveMinute } from "@/_lib/match-live";
import { formatWhenDate } from "@/_lib/match-format";
import { useAuth } from "@/lib/auth-context";
import { ClubCrest } from "@/_components/club-crest";

type TournamentActivity = {
  id: string;
  name: string;
  /** El partido que mejor cuenta cómo va el torneo para este jugador. */
  match: MatchListItem;
};

const byDateTime = (a: MatchListItem, b: MatchListItem) =>
  a.date.localeCompare(b.date) || a.time.localeCompare(b.time);

/**
 * Un partido por torneo, el más relevante: el que se está jugando, si no el próximo, si no el
 * último que se jugó. Los torneos con algo en vivo van primero, luego los que tienen un partido
 * por venir y al final los que ya no tienen nada pendiente.
 */
function activityByTournament(matches: MatchListItem[]): TournamentActivity[] {
  const byTournament = new Map<string, MatchListItem[]>();
  for (const m of matches) {
    if (!m.tournament) continue;
    byTournament.set(m.tournament.id, [...(byTournament.get(m.tournament.id) ?? []), m]);
  }

  const rank = (m: MatchListItem) => (m.status === "en_curso" ? 0 : m.status === "programado" ? 1 : 2);

  return [...byTournament.values()]
    .map((list) => {
      const live = list.filter((m) => m.status === "en_curso");
      const upcoming = list.filter((m) => m.status === "programado").sort(byDateTime);
      const finished = list.filter((m) => m.status === "finalizado").sort(byDateTime);
      const match = live[0] ?? upcoming[0] ?? finished[finished.length - 1];
      return { id: match.tournament!.id, name: match.tournament!.name, match };
    })
    .sort((a, b) => rank(a.match) - rank(b.match) || byDateTime(a.match, b.match));
}

function TeamRow({ team, score }: { team: MatchListItem["homeTeam"]; score: number | null }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <ClubCrest club={team} size="h-6 w-6" textSize="text-[8px]" />
        <span className="truncate font-body text-sm text-text-primary">{team?.name ?? "Por definir"}</span>
      </div>
      <span className="ml-2 shrink-0 font-heading text-base font-bold text-text-primary">{score ?? "-"}</span>
    </div>
  );
}

function MatchCard({ match, now }: { match: MatchListItem; now: number }) {
  const live = match.status === "en_curso";
  const header = match.groupName || (match.decisive ? "Eliminación" : "General");

  return (
    <Link
      href={`/jugador/torneos/${match.tournamentId}`}
      className="block overflow-hidden rounded border border-border-primary bg-surface-primary"
    >
      <div className="border-b border-border-primary bg-btn-regular px-3 py-1.5">
        <span className="font-heading text-xs font-bold tracking-wide text-text-primary">{header}</span>
      </div>
      <div className="flex items-center gap-4 px-3 py-2">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <TeamRow team={match.homeTeam} score={match.homeScore} />
          <TeamRow team={match.awayTeam} score={match.awayScore} />
        </div>
        <div className="w-px self-stretch bg-border-primary" aria-hidden="true" />
        <div className="flex w-20 shrink-0 flex-col items-center gap-1.5 text-center font-body text-xs text-text-primary">
          {live ? (
            <>
              <span className="font-heading font-bold text-verification">
                {isStale(match.startedAt, now, match.tournament?.minutesPerHalf) ? "En juego" : `${liveMinute(match.startedAt, now)}”`}
              </span>
              <span>Fecha {match.matchday}</span>
            </>
          ) : match.status === "finalizado" ? (
            <>
              <span>Finalizado</span>
              <span>{formatWhenDate(match)}</span>
            </>
          ) : (
            <>
              <span>Fecha {match.matchday}</span>
              <span>{formatWhenDate(match)}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function JugadorTorneosContent({ userId }: { userId: string }) {
  const { data: matches, loading, refetchSilently } = useApi(() => getMatches({ playerId: userId }));
  const { data: me } = useApi(() => getUser(userId));

  // El minuto del partido en vivo avanza solo; sin sesión de tiempo real el resto de la
  // pantalla se actualiza con la suscripción de abajo.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Escucha los partidos que todavía pueden cambiar (programados y en juego) para ver el
  // inicio, un gol o el final sin recargar — ver useTournamentRealtime.
  const watchMatchIds = (matches ?? []).filter((m) => m.status !== "finalizado").map((m) => m.id);
  useTournamentRealtime(watchMatchIds, refetchSilently);

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center pt-32">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const activity = activityByTournament(matches ?? []);
  const club = me?.playerProfile?.club ?? null;

  return (
    <div className="w-full pb-8">
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <div className="flex items-center gap-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-text-primary" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" fill="currentColor" />
            <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M7 12l3 3 6-6" stroke="#fafafa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="font-heading text-lg font-bold tracking-wide text-text-primary">Actividad</h1>
        </div>
        {/* Con un solo equipo es solo una etiqueta: no navega a ningún lado (antes llevaba a Mis
            equipos, y no debe). El selector para cambiar de equipo aparece cuando el jugador tiene
            más de uno. */}
        {club && (
          <div className="flex min-w-0 items-center gap-1 rounded-full border border-border-primary bg-surface-alternative py-2 pl-3 pr-4">
            <ClubCrest club={club} size="h-6 w-6" />
            <span className="truncate font-heading text-xs font-semibold text-text-primary">{club.name}</span>
          </div>
        )}
      </div>

      {activity.length === 0 ? (
        <div className="flex flex-col items-center px-6 pt-32 text-center">
          <h2 className="font-heading text-lg font-bold text-text-primary">Sin actividad</h2>
          <p className="mt-2 text-sm text-text-secondary">
            {club
              ? "Tu equipo todavía no tiene partidos en ningún torneo."
              : "Aún no tienes partidos programados. Únete a un equipo para empezar."}
          </p>
          <Link href="/jugador/equipos" className="mt-4 text-sm font-medium text-text-primary underline">
            Ir a Mis Equipos
          </Link>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4 px-4">
          {activity.map((t) => (
            <section key={t.id} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 px-1">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-surface-secondary text-text-invert">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M6 3h12v5a6 6 0 01-12 0V3zM5 4H3a1 1 0 00-1 1v1.5a3 3 0 003 3h.5M19 4h2a1 1 0 011 1v1.5a3 3 0 01-3 3h-.5M8 14v3M16 14v3M7 17h10a1 1 0 011 1v2H6v-2a1 1 0 011-1z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h2 className="min-w-0 flex-1 truncate font-heading text-sm font-bold text-text-primary">{t.name}</h2>
                <Link
                  href={`/jugador/torneos/${t.id}`}
                  className="flex shrink-0 items-center gap-1 font-heading text-sm font-semibold text-text-primary underline"
                >
                  Ver torneo
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
              <MatchCard match={t.match} now={now} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default function JugadorTorneosPage() {
  const { user, loading: loadingAuth } = useAuth();

  if (loadingAuth || !user) {
    return (
      <div className="flex w-full items-center justify-center pt-32">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  // `key` fuerza a remontar si el usuario cambia, así el useApi de adentro no se queda
  // pegado al id anterior (mismo patrón que club/equipo, club/torneos).
  return <JugadorTorneosContent key={user.id} userId={user.id} />;
}
