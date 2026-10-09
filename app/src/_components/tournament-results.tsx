import type { ScorerRow, StandingsRow } from "@/_lib/api";
import { displayShortName } from "@/_lib/short-name";
import { ClubCrest } from "@/_components/club-crest";
import { PlayerAvatar } from "@/_components/player-avatar";

/**
 * Tabla de posiciones y goleadores tal como los ven el fan, el jugador y el club: una sola
 * implementación para que las tres vistas se vean igual y respeten lo que configuró el
 * organizador.
 */

/**
 * `highlightClubIds`: resalta las filas de esos clubes (por ejemplo los dos del partido de la ficha).
 * `compact`: sin las columnas G, E y P (queda #, equipo, PJ, DG y Pts), para el panel lateral de escritorio.
 *
 * `qualifyCount`: cuántos de la tabla pasan a llaves (`playoffTeams`, solo en una liga). Con
 * llaves, del 1.º al N.º va en verde y del N+1 en adelante en rojo; sin ellas, la marca de siempre
 * (1.º–2.º verde, 7.º en adelante rojo).
 */
export function StandingsTable({ standings, qualifyCount, compact = false, highlightClubIds = [] }: { standings: StandingsRow[]; qualifyCount: number | null; compact?: boolean; highlightClubIds?: string[] }) {
  const dot = (position: number) =>
    qualifyCount !== null
      ? position <= qualifyCount ? "bg-verification text-white" : "bg-error text-white"
      : position <= 2 ? "bg-verification text-white" : position >= 7 ? "bg-error text-white" : "bg-brand-200 text-text-secondary";

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border-primary">
        <table className="w-full text-left font-body text-xs">
          <thead>
            <tr className="border-b border-border-primary bg-brand-100">
              <th className="px-2 py-2 font-heading text-[10px] font-semibold text-text-secondary">#</th>
              <th className="px-2 py-2 font-heading text-[10px] font-semibold text-text-secondary">Equipo</th>
              <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">PJ</th>
              {!compact && <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">G</th>}
              {!compact && <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">E</th>}
              {!compact && <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">P</th>}
              <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">DG</th>
              <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => (
              <tr key={row.clubId} className={`border-b border-border-primary last:border-0 ${highlightClubIds.includes(row.clubId) ? "bg-field-light" : ""}`}>
                <td className="px-2 py-2.5">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${dot(row.position)}`}>{row.position}</div>
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-2">
                    <ClubCrest club={row} />
                    <span className="truncate font-heading text-xs font-semibold text-text-primary">{displayShortName(row.shortName)}</span>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-center text-text-secondary">{row.played}</td>
                {!compact && <td className="px-2 py-2.5 text-center text-text-secondary">{row.won}</td>}
                {!compact && <td className="px-2 py-2.5 text-center text-text-secondary">{row.drawn}</td>}
                {!compact && <td className="px-2 py-2.5 text-center text-text-secondary">{row.lost}</td>}
                <td className="px-2 py-2.5 text-center text-text-secondary">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                <td className="px-2 py-2.5 text-center font-heading font-bold text-text-primary">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {standings.length === 0 && (
          <p className="px-4 py-8 text-center font-body text-sm text-text-secondary">Todavía no hay partidos jugados.</p>
        )}
      </div>

      {qualifyCount !== null && standings.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 font-body text-xs text-text-secondary">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-verification" aria-hidden="true" />
            Clasifica a las llaves (los {qualifyCount} primeros)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-error" aria-hidden="true" />
            No clasifica
          </span>
        </div>
      )}
    </>
  );
}

export function ScorersList({ scorers }: { scorers: ScorerRow[] }) {
  return (
    <div className="flex flex-col gap-2">
      {scorers.map((p, i) => (
        <div
          key={p.playerId}
          className={`flex items-center gap-3 rounded-xl p-3 ${i === 0 ? "border-2 border-yellow bg-yellow/5" : "border border-border-primary"}`}
        >
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-yellow text-white" : "bg-brand-200 text-text-secondary"}`}>
            {i + 1}
          </div>
          <PlayerAvatar avatarUrl={p.avatarUrl} size="h-8 w-8" iconSize={14} iconClass="text-text-secondary" />
          <div className="min-w-0 flex-1">
            <p className="font-heading text-sm font-bold text-text-primary">
              {p.firstName} {p.lastName}
            </p>
            <p className="font-body text-xs text-text-secondary">{p.clubName}</p>
          </div>
          <div className="flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-text-secondary" aria-hidden="true">
              <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1" />
              <path d="M7 1.75l1 2h-2l1-2zM3.5 5l2 1-1 2-2-1 1-2zM10.5 5l-2 1 1 2 2-1-1-2zM5 10.5l2-1 2 1-1 2H6l-1-2z" fill="currentColor" opacity="0.3" />
            </svg>
            <span className="font-heading text-sm font-bold text-text-primary">{p.goals}</span>
          </div>
        </div>
      ))}
      {scorers.length === 0 && <p className="py-8 text-center font-body text-sm text-text-secondary">Todavía no hay goles registrados.</p>}
    </div>
  );
}
