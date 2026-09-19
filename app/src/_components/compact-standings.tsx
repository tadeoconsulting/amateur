import type { StandingsRow } from "@/_lib/types";

export function CompactStandings({
  rows,
  onViewFull,
}: {
  rows: StandingsRow[];
  onViewFull?: () => void;
}) {
  const top3 = rows.slice(0, 3);

  return (
    <div className="rounded-xl border border-brand-200">
      <div className="px-4 pt-3 pb-2">
        <p className="font-heading text-sm font-semibold text-text-primary">Posiciones</p>
      </div>
      <div className="px-4">
        <div className="flex items-center border-b border-brand-200 pb-2 text-[10px] font-medium uppercase tracking-wider text-text-secondary">
          <span className="flex-1">Equipo</span>
          <span className="w-8 text-center">PTS</span>
          <span className="w-7 text-center">PJ</span>
          <span className="w-7 text-center">PG</span>
          <span className="w-7 text-center">PE</span>
          <span className="w-7 text-center">PP</span>
          <span className="w-8 text-center">DG</span>
        </div>
        {top3.map((row, i) => (
          <div key={row.club.id} className="flex items-center border-b border-brand-200 py-2 last:border-0">
            <div className="flex flex-1 items-center gap-2">
              <div className={`h-5 w-1 rounded-full ${i === 0 ? "bg-verification" : i >= 2 ? "bg-red" : "bg-transparent"}`} />
              <span className="text-xs font-medium text-text-primary">{row.position}</span>
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-300 text-[8px] font-bold">
                {row.club.shortName.slice(0, 2)}
              </div>
              <span className="truncate text-xs text-text-primary">{row.club.name}</span>
            </div>
            <span className="w-8 text-center text-xs font-semibold tabular-nums">{row.points}</span>
            <span className="w-7 text-center text-xs tabular-nums text-text-secondary">{row.played}</span>
            <span className="w-7 text-center text-xs tabular-nums text-text-secondary">{row.won}</span>
            <span className="w-7 text-center text-xs tabular-nums text-text-secondary">{row.drawn}</span>
            <span className="w-7 text-center text-xs tabular-nums text-text-secondary">{row.lost}</span>
            <span className="w-8 text-center text-xs tabular-nums text-text-secondary">
              {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 px-4 py-2">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-verification" />
          <span className="text-[10px] text-text-secondary">Clasifica a liguilla</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-red" />
          <span className="text-[10px] text-text-secondary">Desciende</span>
        </div>
      </div>
      {onViewFull && (
        <div className="border-t border-brand-200 px-4 py-3 text-center">
          <button onClick={onViewFull} className="text-sm font-medium text-text-primary underline">
            Ver tabla completa
          </button>
        </div>
      )}
    </div>
  );
}
