import type { MatchEvent, MatchStatus } from "@/_lib/types";

function EventIcon({ type }: { type: MatchEvent["type"] }) {
  if (type === "gol") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1" />
        <path d="M9 2v4M9 12v4M2 9h4M12 9h4" stroke="currentColor" strokeWidth="0.8" />
      </svg>
    );
  }
  if (type === "tarjeta_amarilla") {
    return (
      <div className="flex h-5 w-3.5 items-center justify-center rounded-sm bg-yellow">
        <span className="text-[8px] font-bold text-text-primary">!</span>
      </div>
    );
  }
  if (type === "tarjeta_roja") {
    return (
      <div className="flex h-5 w-3.5 items-center justify-center rounded-sm bg-red">
        <span className="text-[8px] font-bold text-white">!</span>
      </div>
    );
  }
  return null;
}

export function MatchTimeline({
  events,
  homeTeamId,
  status,
}: {
  events: MatchEvent[];
  homeTeamId: string;
  status: MatchStatus;
}) {
  const halftimeIndex = events.findIndex((e) => e.minute > 45);
  const firstHalf = halftimeIndex === -1 ? events : events.slice(0, halftimeIndex);
  const secondHalf = halftimeIndex === -1 ? [] : events.slice(halftimeIndex);

  return (
    <div className="relative px-4 py-6">
      <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-brand-200" />

      <div className="relative mb-6 flex justify-center">
        <div className="z-10 h-4 w-4 rounded-full bg-brand-900" />
      </div>

      {firstHalf.map((event) => (
        <TimelineEvent key={event.id} event={event} isHome={event.teamId === homeTeamId} />
      ))}

      {secondHalf.length > 0 && (
        <>
          <div className="relative my-6 flex justify-center">
            <div className="z-10 rounded bg-white px-4 py-1">
              <span className="font-heading text-lg font-bold text-text-primary">Segundo tiempo</span>
            </div>
          </div>
          {secondHalf.map((event) => (
            <TimelineEvent key={event.id} event={event} isHome={event.teamId === homeTeamId} />
          ))}
        </>
      )}

      <div className="relative mt-8 flex justify-center">
        <span className={`z-10 rounded bg-white px-3 py-1 text-sm font-medium ${status === "en_vivo" ? "text-verification" : "text-text-secondary"}`}>
          {status === "en_vivo" ? "En Vivo" : "Finalizado"}
        </span>
      </div>
    </div>
  );
}

function TimelineEvent({ event, isHome }: { event: MatchEvent; isHome: boolean }) {
  return (
    <div className={`relative mb-6 flex items-center ${isHome ? "justify-start pr-[55%]" : "justify-end pl-[55%]"}`}>
      {isHome ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-primary">{event.playerName}</span>
          <EventIcon type={event.type} />
          <span className="font-heading text-sm font-bold text-text-primary">{event.minute}&apos;</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="font-heading text-sm font-bold text-text-primary">{event.minute}&apos;</span>
          <EventIcon type={event.type} />
          <span className="text-sm text-text-primary">{event.playerName}</span>
        </div>
      )}
    </div>
  );
}
