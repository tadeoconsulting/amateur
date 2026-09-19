import type { RosterPlayer } from "@/_lib/types";

export function PlayerRosterRow({
  player,
  selected,
  onToggle,
  action,
}: {
  player: RosterPlayer;
  selected?: boolean;
  onToggle?: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-brand-200 px-4 py-3 last:border-0">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-300">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-brand-500">
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-text-primary">{player.firstName} {player.lastName}</p>
          {player.verified && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <circle cx="8" cy="8" r="7" fill="var(--color-verification)" />
              <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <p className="text-sm text-text-secondary">
          {player.position} | {player.age} anos
        </p>
      </div>
      {action ?? (
        player.status === "en_espera" ? (
          <span className="shrink-0 text-sm font-medium text-text-secondary">En espera</span>
        ) : (
          <button
            onClick={onToggle}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-colors ${
              selected
                ? "border-brand-900 bg-brand-900"
                : "border-brand-400 bg-transparent"
            }`}
          >
            {selected && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )
      )}
    </div>
  );
}
