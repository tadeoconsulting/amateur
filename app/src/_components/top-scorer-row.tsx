export function TopScorerRow({
  position,
  name,
  club,
  goals,
  featured,
}: {
  position: number;
  name: string;
  club: string;
  goals: number;
  featured?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 border-b border-brand-200 px-4 last:border-0 ${featured ? "py-4" : "py-3"}`}>
      {!featured && (
        <span className="w-5 text-center text-xs font-medium text-text-secondary">{position}</span>
      )}
      <div className={`flex shrink-0 items-center justify-center rounded-full bg-brand-300 ${featured ? "h-12 w-12" : "h-9 w-9"}`}>
        <svg width={featured ? 24 : 18} height={featured ? 24 : 18} viewBox="0 0 24 24" fill="none" className="text-brand-500">
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className={`font-semibold text-text-primary ${featured ? "text-base" : "text-sm"}`}>{name}</p>
          {featured && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" fill="var(--color-verification)" />
              <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <p className="text-xs text-text-secondary">{club}</p>
      </div>
      <div className="text-right">
        <p className={`font-heading font-bold tabular-nums text-text-primary ${featured ? "text-2xl" : "text-lg"}`}>
          {goals.toString().padStart(2, "0")}
        </p>
        <p className="text-[10px] text-text-secondary">Goles</p>
      </div>
    </div>
  );
}
