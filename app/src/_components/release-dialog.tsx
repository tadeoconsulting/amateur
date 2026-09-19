import type { RosterPlayer } from "@/_lib/types";

export function ReleaseDialog({
  player,
  onConfirm,
  onCancel,
}: {
  player: RosterPlayer;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-[430px] rounded-t-2xl bg-white px-4 pb-6 pt-6">
        <button
          onClick={onCancel}
          className="absolute right-4 top-6 flex h-6 w-6 items-center justify-center"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <h2 className="pr-8 font-heading text-xl font-bold text-text-primary">
          Estas seguro de liberar a este jugador?
        </h2>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-300">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-brand-500">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-text-primary">{player.firstName} {player.lastName}</p>
              {player.verified && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="var(--color-verification)" />
                  <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <p className="text-sm text-text-secondary">{player.position} | {player.age} anos</p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl border border-border-primary py-3 font-heading text-sm font-semibold text-text-primary"
          >
            Si, Liberar
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl bg-verification py-3 font-heading text-sm font-semibold text-white"
          >
            Mantener jugador
          </button>
        </div>
      </div>
    </div>
  );
}
