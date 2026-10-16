"use client";

import Link from "next/link";
import { getSeason, getSeasonScorers, getSeasonStandings } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { FINAL_FORMAT_LABEL } from "@/_lib/season";
import { tournamentPublicPath } from "@/_lib/slug";
import { btnOutline } from "@/_components/button-styles";
import { ClubCrest } from "@/_components/club-crest";
import { PageSpinner } from "@/_components/spinner";
import { SeasonStages, SeasonStatusChip } from "@/_components/season-stages";
import { ScorersList, StandingsTable } from "@/_components/tournament-results";

/**
 * Página pública de una temporada (`/{organizador}/{temporada}`, especificación 012): el campeón, las
 * etapas con enlace a cada torneo, la tabla General y el goleador general. Se comparte igual que un torneo.
 */
export function SeasonPublicView({ seasonId, organizerSlug }: { seasonId: string; organizerSlug: string }) {
  const { data: season, error } = useApi(() => getSeason(seasonId));
  const { data: standings } = useApi(() => getSeasonStandings(seasonId));
  const { data: scorers } = useApi(() => getSeasonScorers(seasonId));

  if (error) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col items-center justify-center px-6 text-center">
        <h1 className="font-heading text-xl font-bold text-text-primary">Esta temporada no existe</h1>
        <p className="mt-2 font-body text-sm text-text-secondary">El link puede estar incompleto o la temporada se eliminó.</p>
        <Link href="/" className={`${btnOutline} mt-6`}>
          Ir al inicio
        </Link>
      </main>
    );
  }
  if (!season) return <PageSpinner />;

  const publicPathOf = (t: { id: string; slug: string | null }) => tournamentPublicPath({ id: t.id, slug: t.slug, organizerSlug });
  // Los equipos de la General son los de la Apertura: su página dentro de ese torneo existe siempre.
  const apertura = season.tournaments.find((t) => t.stage === "apertura");
  const clubHref = apertura ? (clubId: string) => `${publicPathOf(apertura)}/equipo/${clubId}` : undefined;
  const qualifyCount = season.finalFormat === "ninguna" ? null : season.finalTeams;

  return (
    <div className="flex min-h-dvh w-full flex-col bg-surface-primary">
      <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col md:max-w-4xl">
        <header className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="font-heading text-lg font-bold text-text-primary">
            Amateur
          </Link>
          <SeasonStatusChip status={season.status} />
        </header>

        <main className="@container flex-1 px-4 pb-10">
          <section className="rounded-2xl bg-surface-secondary p-5 text-text-invert @2xl:p-8">
            <p className="font-body text-xs text-brand-200">Temporada</p>
            <h1 className="mt-1 font-heading text-2xl font-bold leading-tight @2xl:text-3xl">{season.name}</h1>
            <p className="mt-2 font-body text-sm text-brand-200">
              {season.teamsCount} equipos · Apertura y Clausura · Fase final: {FINAL_FORMAT_LABEL[season.finalFormat]}
              {season.finalTeams !== null && ` (clasifican ${season.finalTeams})`}
            </p>
          </section>

          {season.champion && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border-2 border-yellow bg-yellow/5 px-4 py-3">
              <ClubCrest club={season.champion} size="h-12 w-12" textSize="text-sm" />
              <div className="min-w-0">
                <p className="font-body text-xs text-text-secondary">Campeón de la temporada</p>
                <p className="truncate font-heading text-base font-bold text-text-primary">{season.champion.name}</p>
              </div>
            </div>
          )}

          <div className="@2xl:grid @2xl:grid-cols-5 @2xl:items-start @2xl:gap-8">
            <section className="mt-6 @2xl:col-span-3" aria-labelledby="general">
              <h2 id="general" className="mb-1 font-heading text-lg font-bold text-text-primary">
                Tabla General
              </h2>
              <p className="mb-3 font-body text-xs text-text-secondary">Suma la Apertura y el Clausura. No cuentan las llaves de cada torneo ni la fase final.</p>
              {standings ? (
                <StandingsTable standings={standings} qualifyCount={qualifyCount} qualifyLabel="la fase final" clubHref={clubHref} />
              ) : (
                <PageSpinner />
              )}
            </section>

            <div className="@2xl:col-span-2">
              <section className="mt-6" aria-labelledby="etapas">
                <h2 id="etapas" className="mb-1 font-heading text-lg font-bold text-text-primary">
                  Etapas
                </h2>
                <SeasonStages season={season} hrefFor={publicPathOf} />
              </section>

              <section className="mt-6" aria-labelledby="goleadores">
                <h2 id="goleadores" className="mb-3 font-heading text-lg font-bold text-text-primary">
                  Goleador general
                </h2>
                {scorers && scorers.length > 0 ? (
                  <ScorersList scorers={scorers} clubHref={clubHref} />
                ) : (
                  <p className="font-body text-sm text-text-secondary">Todavía no hay goles en la temporada.</p>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
