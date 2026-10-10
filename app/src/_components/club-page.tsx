"use client";

import Link from "next/link";
import { useState } from "react";
import { getClubInTournament, getMatches, getStandings, type ClubInTournament, type MatchListItem } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { useTournamentRealtime } from "@/_lib/use-tournament-realtime";
import { clubRecord, clubStanding, groupByDay, teamForm } from "@/_lib/fixture";
import { formatMatchDate, UNSCHEDULED_LABEL } from "@/_lib/match-format";
import { clubPublicPath } from "@/_lib/slug";
import { ClubCrest } from "@/_components/club-crest";
import { MatchRow } from "@/_components/match-row";
import { FormRow } from "@/_components/match-sheet";
import { PillTabs } from "@/_components/pill-tabs";
import { ShareViewButton } from "@/_components/share-view-button";
import { PageSpinner } from "@/_components/spinner";

const TABS = [
  { key: "partidos", label: "Partidos" },
  { key: "jugadores", label: "Jugadores" },
  { key: "resultados", label: "Resultados" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const FALLBACK_COLOR = "#1B1B1B";

/**
 * La página de un club dentro de un torneo: su cabecera, en qué puesto va de la tabla, sus partidos, sus jugadores y
 * cómo le fue. Pública: la ven el fan, el jugador, el club y el organizador por igual (los equipos de las tablas
 * llevan acá). `tournamentPath` es la página pública del torneo, a la que vuelve.
 */
export function ClubPage({ tournamentId, clubId, tournamentPath }: { tournamentId: string; clubId: string; tournamentPath: string }) {
  const { data: info, loading, error } = useApi(() => getClubInTournament(tournamentId, clubId));
  const { data: matchesData, refetchSilently: refetchMatches } = useApi(() => getMatches({ tournamentId }));
  const { data: standingsData, refetchSilently: refetchStandings } = useApi(() => getStandings(tournamentId));

  // La pestaña sale de la URL (`?pestana=jugadores`): un enlace compartido abre donde estaba quien lo compartió.
  const [tab, setTab] = useState<TabKey>(() => {
    const asked = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("pestana") : null;
    return TABS.some((t) => t.key === asked) ? (asked as TabKey) : "partidos";
  });
  function pickTab(next: TabKey) {
    setTab(next);
    const params = new URLSearchParams(window.location.search);
    params.set("pestana", next);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}${window.location.hash}`);
  }

  const mine = (matchesData ?? []).filter((m) => m.homeTeam?.id === clubId || m.awayTeam?.id === clubId);
  // Se escuchan sus partidos que todavía pueden tener novedades (también los programados, para enterarse de que arrancaron).
  useTournamentRealtime(mine.filter((m) => m.status !== "finalizado").map((m) => m.id), () => {
    refetchMatches();
    refetchStandings();
  });

  if (loading) return <PageSpinner />;
  if (error || !info) {
    return (
      <section className="px-4 py-20 text-center">
        <h1 className="font-heading text-xl font-bold text-text-primary">Este equipo no juega en este torneo</h1>
        <p className="mt-2 font-body text-sm text-text-secondary">El enlace puede estar incompleto o el equipo ya no está inscrito.</p>
        <Link href={tournamentPath} className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-border-primary px-4 font-heading text-sm font-semibold text-text-primary">
          Volver al torneo
        </Link>
      </section>
    );
  }

  const { club, tournament } = info;
  const clubPath = clubPublicPath({ id: tournament.id, slug: tournament.slug, organizerSlug: tournament.organizerSlug }, club.id);
  const standing = clubStanding(standingsData ?? [], clubId);
  const qualifyCount = tournament.format === "liga" ? tournament.playoffTeams : null;
  const color = club.color ?? FALLBACK_COLOR;

  return (
    // `@container`: lo de adentro se adapta al ancho de la columna (una sola en el celular; con la posición al lado en escritorio).
    <div className="@container w-full pb-10">
      <div className="px-4 pt-1">
        <Link href={tournamentPath} className="inline-flex min-h-11 items-center gap-1 font-heading text-sm font-semibold text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12.5 15L7.5 10l5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver al torneo
        </Link>
      </div>

      {/* Cabecera: el color del club, con una capa oscura para que el texto blanco se lea sobre cualquiera */}
      <section aria-label={club.name} className="relative mx-4 mt-1 overflow-hidden rounded-2xl text-white">
        <div aria-hidden="true" className="absolute inset-0" style={{ backgroundColor: color }} />
        <div aria-hidden="true" className="absolute inset-0 bg-black/55" />
        <div className="relative flex items-center gap-4 px-5 py-6 @2xl:gap-6 @2xl:px-8 @2xl:py-9">
          <span className="shrink-0 rounded-full bg-white p-1">
            <ClubCrest club={club} size="h-16 w-16 @2xl:h-24 @2xl:w-24" textSize="text-lg" />
          </span>
          <div className="min-w-0">
            <p className="font-body text-xs text-white/80">{[tournament.name, info.groupName].filter(Boolean).join(" · ")}</p>
            <h1 className="mt-0.5 font-heading text-2xl font-bold leading-tight @2xl:text-3xl">{club.name}</h1>
          </div>
        </div>
      </section>

      <div className="mt-4 flex flex-col gap-6 px-4 @4xl:grid @4xl:grid-cols-[minmax(0,1fr)_20rem] @4xl:items-start @4xl:gap-8">
        {/* La posición va primero en el celular y al lado en escritorio: siempre a la vista, sin tener que buscarla. */}
        <aside aria-label="Posición en la tabla" className="@4xl:order-2 @4xl:sticky @4xl:top-4">
          {standing && <PositionCard standing={standing} qualifyCount={qualifyCount} tableHref={`${tournamentPath}?vista=resultados&sub=tabla`} />}
        </aside>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="min-w-0 flex-1">
              <PillTabs tabs={[...TABS]} value={tab} onChange={pickTab} label={`${club.name}: secciones`} className="pb-1" />
            </div>
            <ShareViewButton
              title={`${club.name} · ${tournament.name}`}
              publicPath={tournamentPath}
              view={{ vista: "equipos" }}
              fixedUrl={() => `${window.location.origin}${clubPath}?pestana=${tab}`}
            />
          </div>

          <div className="mt-4">
            {tab === "partidos" && <MatchesTab matches={mine} tournamentPath={tournamentPath} />}
            {tab === "jugadores" && <PlayersTab players={info.players} />}
            {tab === "resultados" && <ResultsTab matches={mine} clubId={clubId} club={club} players={info.players} />}
          </div>
        </div>
      </div>
    </div>
  );
}

const ordinal = (n: number) => `${n}.º`;

function PositionCard({ standing, qualifyCount, tableHref }: { standing: NonNullable<ReturnType<typeof clubStanding>>; qualifyCount: number | null; tableHref: string }) {
  const qualifies = qualifyCount !== null ? standing.rank <= qualifyCount : null;
  return (
    <section className="rounded-xl border border-border-primary p-4">
      <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-text-secondary">Posición en la tabla</h2>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="font-heading text-4xl font-bold tabular-nums text-text-primary">{ordinal(standing.rank)}</span>
        <span className="font-body text-sm text-text-secondary">de {standing.total}{standing.groupName ? ` en ${standing.groupName}` : ""}</span>
      </p>
      <p className="mt-1 font-body text-sm text-text-primary">
        <strong className="font-heading">{standing.points}</strong> {standing.points === 1 ? "punto" : "puntos"} · {standing.played} PJ
      </p>
      {qualifies !== null && (
        <p className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-heading text-xs font-bold ${qualifies ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          <span aria-hidden="true">{qualifies ? "✓" : "✕"}</span>
          {qualifies ? "Clasifica a las llaves" : "Fuera de los clasificados"}
        </p>
      )}
      <Link href={tableHref} className="mt-4 flex min-h-11 w-full items-center justify-center rounded-lg border border-border-primary px-3 font-heading text-xs font-semibold text-text-primary transition-colors hover:bg-btn-regular focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary">
        Ver la tabla completa
      </Link>
    </section>
  );
}

/** Los partidos del club: primero los que faltan (y el que está en vivo), después los jugados, el más reciente arriba. */
function MatchesTab({ matches, tournamentPath }: { matches: MatchListItem[]; tournamentPath: string }) {
  if (matches.length === 0) return <p className="py-8 text-center font-body text-sm text-text-secondary">Este equipo todavía no tiene partidos programados.</p>;
  const upcoming = groupByDay(matches.filter((m) => m.status !== "finalizado"));
  const played = groupByDay(matches.filter((m) => m.status === "finalizado"))
    .reverse()
    .map((s) => ({ ...s, matches: [...s.matches].reverse() }));

  const group = (title: string, sections: typeof upcoming) =>
    sections.length > 0 && (
      <div>
        <h2 className="mb-2 font-heading text-sm font-bold text-text-primary">{title}</h2>
        <div className="flex flex-col gap-3">
          {sections.map((section) => (
            <section key={section.key} aria-label={section.date ? formatMatchDate(section.date) : UNSCHEDULED_LABEL} className="@container overflow-hidden rounded-xl border border-border-primary">
              <h3 className="bg-btn-regular px-4 py-2 font-heading text-xs font-bold text-text-primary">{section.date ? formatMatchDate(section.date) : UNSCHEDULED_LABEL}</h3>
              {section.matches.map((match, i) => (
                <MatchRow key={match.id} match={match} first={i === 0} href={`${tournamentPath}/partido/${match.id}`} />
              ))}
            </section>
          ))}
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      {group("Próximos y en vivo", upcoming)}
      {group("Jugados", played)}
    </div>
  );
}

/** La plantilla: nombre, posición, número y goles. Un menor de 18 ya viene abreviado ("Luigui F.") desde la API. */
function PlayersTab({ players }: { players: ClubInTournament["players"] }) {
  if (players.length === 0) return <p className="py-8 text-center font-body text-sm text-text-secondary">Este equipo todavía no tiene jugadores cargados.</p>;
  return (
    <div>
      <h2 className="mb-2 font-heading text-sm font-bold text-text-primary">
        {players.length} {players.length === 1 ? "jugador" : "jugadores"}
      </h2>
      <ul className="overflow-hidden rounded-xl border border-border-primary">
        {players.map((p) => (
          <li key={p.id} className="flex items-center gap-3 border-b border-border-primary px-4 py-3 last:border-0">
            <span
              aria-label={p.number != null ? `Número ${p.number}` : undefined}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 font-heading text-xs font-bold tabular-nums text-text-primary"
            >
              {p.number ?? "–"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-sm font-semibold text-text-primary">{p.name}</p>
              {p.position && <p className="font-body text-xs text-text-secondary">{p.position}</p>}
            </div>
            {p.goals > 0 && (
              <p className="shrink-0 font-body text-xs text-text-secondary">
                <strong className="font-heading text-sm text-text-primary">{p.goals}</strong> {p.goals === 1 ? "gol" : "goles"}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Cómo le fue: el resumen del torneo, cómo viene (los últimos 5) y quién lleva más goles. */
function ResultsTab({ matches, clubId, club, players }: { matches: MatchListItem[]; clubId: string; club: ClubInTournament["club"]; players: ClubInTournament["players"] }) {
  const rec = clubRecord(matches, clubId);
  // `teamForm` pide un partido de referencia; sin ninguno, cuentan todos los jugados.
  const form = teamForm(matches, clubId, { id: "", date: "9999-12-31T00:00:00.000Z", time: "" });
  const top = [...players].filter((p) => p.goals > 0).sort((a, b) => b.goals - a.goals)[0];

  if (rec.played === 0) return <p className="py-8 text-center font-body text-sm text-text-secondary">Todavía no jugó ningún partido en este torneo.</p>;
  const tiles: [string, string][] = [
    ["Jugados", String(rec.played)],
    ["Ganados", String(rec.won)],
    ["Empatados", String(rec.drawn)],
    ["Perdidos", String(rec.lost)],
    ["Goles a favor", String(rec.goalsFor)],
    ["Goles en contra", String(rec.goalsAgainst)],
    ["Diferencia", rec.goalDifference > 0 ? `+${rec.goalDifference}` : String(rec.goalDifference)],
  ];
  return (
    <div className="flex flex-col gap-5">
      <ul className="grid grid-cols-2 gap-2 @xl:grid-cols-4" aria-label="Resumen del torneo">
        {tiles.map(([label, value]) => (
          <li key={label} className="rounded-xl border border-border-primary p-3">
            <p className="font-heading text-2xl font-bold tabular-nums text-text-primary">{value}</p>
            <p className="font-body text-xs text-text-secondary">{label}</p>
          </li>
        ))}
      </ul>

      <section aria-labelledby="forma-club" className="rounded-xl border border-border-primary p-4">
        <h2 id="forma-club" className="font-heading text-sm font-bold text-text-primary">Cómo viene</h2>
        <p className="mt-0.5 font-body text-xs text-text-secondary">Sus últimos 5 partidos, de izquierda a derecha.</p>
        <div className="mt-4">
          <FormRow team={{ id: clubId, name: club.name, shortName: club.shortName, logoUrl: club.logoUrl, color: club.color }} entries={form} loading={false} />
        </div>
      </section>

      {top && (
        <p className="font-body text-sm text-text-secondary">
          Goleador del equipo: <strong className="font-heading text-text-primary">{top.name}</strong> con {top.goals} {top.goals === 1 ? "gol" : "goles"}.
        </p>
      )}
    </div>
  );
}
