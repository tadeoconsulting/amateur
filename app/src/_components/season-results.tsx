"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getSeason, getSeasonScorers, getSeasonStandings, getStandings, type SeasonSummary } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import type { SeasonStage } from "@/_lib/season";
import { parseSeasonView, withSeasonView, type SeasonScorers, type SeasonTable } from "@/_lib/share-view";
import { PillTabs } from "@/_components/pill-tabs";
import { ScorersList, StandingsTable } from "@/_components/tournament-results";
import { Spinner } from "@/_components/spinner";

// En un torneo de temporada (especificación 012), la Tabla y los Goleadores tienen pestañas propias:
// Apertura · Clausura · General temporada, y Del torneo · General temporada. La pestaña del propio torneo
// muestra lo de siempre (`children`, que arma cada pantalla); las demás se piden acá. Fuera de una
// temporada no cambia nada: se muestra `children` tal cual.

type SeasonRef = { seasonId: string | null; seasonStage: SeasonStage | null };

const TABLE_LABEL: Record<SeasonTable, string> = { apertura: "Apertura", clausura: "Clausura", final: "Fase final", general: "General temporada" };

/** Deja la pestaña elegida en la URL (sin recargar), para que el enlace que se comparte abra en ella. */
function writeParam(key: "tabla" | "goleadores", value: string) {
  const query = withSeasonView(window.location.search.slice(1), key, value);
  window.history.replaceState(null, "", `${window.location.pathname}?${query}${window.location.hash}`);
}

/**
 * `version`: súbelo cuando llega una novedad en vivo (un gol, un partido que termina) para que las tablas
 * que se piden acá se actualicen igual que la del torneo.
 */
export function SeasonTables({
  tournament,
  clubHref,
  version = 0,
  className,
  pub = false,
  children,
}: {
  tournament: SeasonRef;
  clubHref?: (clubId: string) => string;
  version?: number;
  className?: string;
  /** Pantalla pública: sus lecturas pueden guardarse unos segundos en la caché de borde (ver `public-cache.ts`). */
  pub?: boolean;
  children: ReactNode;
}) {
  if (!tournament.seasonId || !tournament.seasonStage) return <>{children}</>;
  return (
    <SeasonTablesInner seasonId={tournament.seasonId} stage={tournament.seasonStage} clubHref={clubHref} version={version} className={className} pub={pub}>
      {children}
    </SeasonTablesInner>
  );
}

function SeasonTablesInner({
  seasonId,
  stage,
  clubHref,
  version,
  className,
  pub,
  children,
}: {
  seasonId: string;
  stage: SeasonStage;
  clubHref?: (clubId: string) => string;
  version: number;
  className?: string;
  pub: boolean;
  children: ReactNode;
}) {
  // La fase final no mira las tablas de las otras etapas, solo la suya y la General.
  const keys: SeasonTable[] = stage === "final" ? ["final", "general"] : ["apertura", "clausura", "general"];
  const [value, setValue] = useState<SeasonTable>(() => {
    const fromUrl = typeof window !== "undefined" ? parseSeasonView(window.location.search).tabla : null;
    return fromUrl && keys.includes(fromUrl) ? fromUrl : stage;
  });
  const { data: season } = useApi(() => getSeason(seasonId, { pub }));
  // En la fase final hay equipos de la General que no están en este torneo: su página no existe acá.
  const href = stage === "final" ? undefined : clubHref;

  const pick = (key: SeasonTable) => {
    setValue(key);
    writeParam("tabla", key);
  };

  let content: ReactNode;
  // Una fase final por llaves no tiene tabla: se juega en el cuadro, que está en el fixture.
  if (value === "final" && season?.finalFormat === "llaves") {
    content = <p className="py-8 text-center font-body text-sm text-text-secondary">La fase final se juega por llaves: los cruces están en el fixture.</p>;
  } else if (value === stage) content = children;
  else if (!season) content = <Spinner />;
  else if (value === "general") content = <GeneralTable season={season} clubHref={href} version={version} pub={pub} />;
  else {
    const t = season.tournaments.find((x) => x.stage === value);
    content = t ? (
      <StageTable tournamentId={t.id} qualifyCount={t.format === "liga" ? t.playoffTeams : null} clubHref={href} version={version} pub={pub} />
    ) : (
      <p className="py-8 text-center font-body text-sm text-text-secondary">El Clausura empieza cuando termine la Apertura.</p>
    );
  }

  return (
    <div>
      <PillTabs label="Tablas de la temporada" className={className} value={value} onChange={pick} tabs={keys.map((key) => ({ key, label: TABLE_LABEL[key] }))} />
      {content}
    </div>
  );
}

function StageTable({ tournamentId, qualifyCount, clubHref, version, pub }: { tournamentId: string; qualifyCount: number | null; clubHref?: (clubId: string) => string; version: number; pub: boolean }) {
  const { data, refetchSilently } = useApi(() => getStandings(tournamentId, { pub }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (version) refetchSilently(); }, [version]);
  return data ? <StandingsTable standings={data} qualifyCount={qualifyCount} clubHref={clubHref} /> : <Spinner />;
}

function GeneralTable({ season, clubHref, version, pub }: { season: SeasonSummary; clubHref?: (clubId: string) => string; version: number; pub: boolean }) {
  const { data, refetchSilently } = useApi(() => getSeasonStandings(season.id, { pub }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (version) refetchSilently(); }, [version]);
  if (!data) return <Spinner />;
  const qualifyCount = season.finalFormat === "ninguna" ? null : season.finalTeams;
  return (
    <>
      <p className="mb-3 font-body text-xs text-text-secondary">Suma la Apertura y el Clausura. No cuentan las llaves de cada torneo ni la fase final.</p>
      <StandingsTable standings={data} qualifyCount={qualifyCount} qualifyLabel="la fase final" clubHref={clubHref} />
    </>
  );
}

/** Goleadores: Del torneo (lo de siempre, `children`) · General temporada. */
export function SeasonScorersTabs({
  tournament,
  clubHref,
  version = 0,
  className,
  pub = false,
  children,
}: {
  tournament: SeasonRef;
  clubHref?: (clubId: string) => string;
  version?: number;
  className?: string;
  /** Pantalla pública: sus lecturas pueden guardarse unos segundos en la caché de borde (ver `public-cache.ts`). */
  pub?: boolean;
  children: ReactNode;
}) {
  if (!tournament.seasonId) return <>{children}</>;
  return (
    <SeasonScorersInner seasonId={tournament.seasonId} clubHref={tournament.seasonStage === "final" ? undefined : clubHref} version={version} className={className} pub={pub}>
      {children}
    </SeasonScorersInner>
  );
}

function SeasonScorersInner({
  seasonId,
  clubHref,
  version,
  className,
  pub,
  children,
}: {
  seasonId: string;
  clubHref?: (clubId: string) => string;
  version: number;
  className?: string;
  pub: boolean;
  children: ReactNode;
}) {
  const [value, setValue] = useState<SeasonScorers>(() => (typeof window !== "undefined" ? parseSeasonView(window.location.search).goleadores : null) ?? "torneo");
  const pick = (key: SeasonScorers) => {
    setValue(key);
    writeParam("goleadores", key);
  };
  return (
    <div>
      <PillTabs
        label="Goleadores de la temporada"
        className={className}
        value={value}
        onChange={pick}
        tabs={[
          { key: "torneo", label: "Del torneo" },
          { key: "general", label: "General temporada" },
        ]}
      />
      {value === "torneo" ? children : <GeneralScorers seasonId={seasonId} clubHref={clubHref} version={version} pub={pub} />}
    </div>
  );
}

function GeneralScorers({ seasonId, clubHref, version, pub }: { seasonId: string; clubHref?: (clubId: string) => string; version: number; pub: boolean }) {
  const { data, refetchSilently } = useApi(() => getSeasonScorers(seasonId, { pub }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (version) refetchSilently(); }, [version]);
  if (!data) return <Spinner />;
  if (data.length === 0) return <p className="py-8 text-center font-body text-sm text-text-secondary">Todavía no hay goles en la temporada.</p>;
  return <ScorersList scorers={data} clubHref={clubHref} />;
}
