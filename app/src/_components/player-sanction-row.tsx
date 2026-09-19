import type { PlayerSanction } from "@/_lib/types";

export function PlayerSanctionRow({ sanction }: { sanction: PlayerSanction }) {
  const isSuspended = sanction.status === "suspendido";

  return (
    <div className="flex items-center gap-3 border-b border-brand-200 px-4 py-3 last:border-0">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-300">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-brand-500">
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">{sanction.playerName}</p>
        <p className={`text-xs ${isSuspended ? "text-red" : "text-text-secondary"}`}>
          {isSuspended ? `Suspendido | ${sanction.suspensionFechas} fechas` : "Habilitado"}
        </p>
      </div>
      <span className="text-xs tabular-nums text-text-secondary">
        {sanction.accumulatedCards}/{sanction.cardLimit}
      </span>
      <div className={`flex h-7 w-7 items-center justify-center rounded ${sanction.hasRedCard ? "bg-red/15" : "bg-yellow/30"}`}>
        {sanction.hasRedCard ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M4 4l6 6M10 4l-6 6" stroke="var(--color-red)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 4v3M7 9.5v.5" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </div>
    </div>
  );
}
