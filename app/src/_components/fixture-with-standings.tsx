import type { MatchListItem, StandingsRow } from "@/_lib/api";
import { FixtureTabs } from "@/_components/fixture-tabs";
import { StandingsTable } from "@/_components/tournament-results";

/**
 * El fixture de un torneo y, cuando la columna es ancha (escritorio), la tabla de posiciones fija
 * a la derecha, siempre a la vista. En el celular es solo el fixture. La usan el fan, el jugador y el
 * club; necesita un ancestro `@container` (de ahí sale "ancha": ≥ 896 px).
 *
 * `stickyTop`: a qué altura se queda la tabla al desplazarse — más abajo si hay una barra fija arriba
 * (la navegación de escritorio de jugador y club mide 64 px).
 */
export function FixtureWithStandings({
  matches,
  standings,
  qualifyCount,
  hrefFor,
  highlightClubId,
  onEdit,
  onViewFullTable,
  stickyTop = "@4xl:top-4",
  bleed = false,
  syncUrl,
}: {
  matches: MatchListItem[];
  standings: StandingsRow[];
  qualifyCount: number | null;
  hrefFor?: (match: MatchListItem) => string;
  highlightClubId?: string;
  /** Si se pasa (el organizador), los partidos por jugar traen un botón para editarlos. */
  onEdit?: (match: MatchListItem) => void;
  /** Lleva a la tabla completa (y goleadores) de la pantalla. */
  onViewFullTable: () => void;
  stickyTop?: string;
  /** El contenedor ya tiene margen lateral: el fixture (que trae el suyo) lo compensa para no quedar doble. */
  bleed?: boolean;
  /** Ver `FixtureTabs`: la fecha elegida en la URL. */
  syncUrl?: boolean;
}) {
  return (
    <div className="@4xl:grid @4xl:grid-cols-[minmax(0,1fr)_20rem] @4xl:items-start @4xl:gap-8">
      <div className={bleed ? "-mx-4" : undefined}>
        <FixtureTabs matches={matches} hrefFor={hrefFor} highlightClubId={highlightClubId} onEdit={onEdit} syncUrl={syncUrl} />
      </div>
      {standings.length > 0 && (
        <aside aria-label="Posiciones" className={`hidden @4xl:sticky @4xl:block ${stickyTop} ${bleed ? "" : "@4xl:mr-4"}`}>
          <h2 className="mb-3 font-heading text-sm font-bold text-text-primary">Posiciones</h2>
          <StandingsTable standings={standings} qualifyCount={qualifyCount} compact />
          <button
            type="button"
            onClick={onViewFullTable}
            className="mt-3 min-h-11 w-full cursor-pointer rounded-lg border border-border-primary px-3 font-heading text-xs font-semibold text-text-primary transition-colors hover:bg-btn-regular focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
          >
            Ver tabla completa y goleadores
          </button>
        </aside>
      )}
    </div>
  );
}
