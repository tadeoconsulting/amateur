export function PlayerListRow({
  name,
  position,
}: {
  name: string;
  position: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-brand-200 px-4 py-3 last:border-0">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-300">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-brand-500">
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">{name}</p>
        <p className="text-xs text-text-secondary">{position}</p>
      </div>
    </div>
  );
}
