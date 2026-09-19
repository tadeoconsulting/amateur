"use client";

import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/_lib/use-api";
import type { MatchDetail, MatchEventItem } from "@/_lib/api";
import { ACTION_FROM_EVENT_TYPE, EVENT_TITLES, isEventType } from "@/_lib/match-live";

const clubColors = ["#E53935", "#43A047"];

type TimelineEvent = {
  minute: string;
  type: "inicio" | "gol" | "amarilla" | "roja" | "cambio" | "penal" | "comentario" | "halftime" | "final";
  title: string;
  description: string;
  team?: string;
  player?: { name: string; position: string };
  detail?: string;
};


function formatMatchDate(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.toLocaleDateString("es-PE", { weekday: "short", timeZone: "UTC" });
  const num = d.getUTCDate();
  const month = d.toLocaleDateString("es-PE", { month: "short", timeZone: "UTC" });
  return `${day.charAt(0).toUpperCase() + day.slice(1)}. ${num.toString().padStart(2, "0")} ${month.charAt(0).toUpperCase() + month.slice(1)}`;
}

function EventIcon({ type }: { type: TimelineEvent["type"] }) {
  switch (type) {
    case "inicio":
    case "halftime":
    case "final":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="10" cy="5" r="1.5" fill="currentColor" />
          <path d="M10 5v6M7 14c0-1.5 1.3-3 3-3s3 1.5 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "gol":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 2.5l1.8 3.2h-3.6L10 2.5zM5 7l3.2 1.8-1.4 3.2L3.6 10.2 5 7zM15 7l-3.2 1.8 1.4 3.2 3.2-1.8L15 7z" fill="currentColor" />
        </svg>
      );
    case "amarilla":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="6" y="3" width="8" height="13" rx="1.5" fill="#FFC107" stroke="#1B1B1B" strokeWidth="1" />
        </svg>
      );
    case "roja":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="6" y="3" width="8" height="13" rx="1.5" fill="#E53935" stroke="#1B1B1B" strokeWidth="1" />
        </svg>
      );
    case "cambio":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M5 7h7l-2.5-2.5M15 13H8l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "penal":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 7l6-4 6 4v8l-6 4-6-4V7z" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="10" cy="11" r="2" fill="currentColor" />
        </svg>
      );
    case "comentario":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 3c-4 0-7 2.5-7 5.5 0 1.8 1.2 3.4 3 4.4L5 17l4-2.5c.3 0 .7.1 1 .1 4 0 7-2.5 7-5.5S14 3 10 3z" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      );
  }
}

function getEventStyle(type: TimelineEvent["type"]) {
  switch (type) {
    case "inicio":
    case "halftime":
    case "final":
      return "bg-brand-500 text-white";
    case "gol":
      return "bg-[#2196F3] text-white";
    default:
      return "bg-surface-primary border border-border-primary text-text-primary";
  }
}

function getMinuteStyle(type: TimelineEvent["type"]) {
  switch (type) {
    case "inicio":
    case "halftime":
    case "final":
      return "text-white";
    case "gol":
      return "text-white";
    default:
      return "text-text-secondary";
  }
}

export default function ResultadoPage() {
  const params = useParams<{ id: string; matchId: string }>();
  const router = useRouter();

  const { data: match, loading } = useApi<MatchDetail>(() =>
    fetch(`/api/matches/${params.matchId}`).then((r) => r.json())
  );
  const { data: events } = useApi<MatchEventItem[]>(() =>
    fetch(`/api/matches/${params.matchId}/events`).then((r) => r.json())
  );

  if (loading || !match) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  // Crónica del partido a partir de las jugadas guardadas: inicio, jugadas y final.
  const started = match.status !== "programado";
  const showScore = started;
  const timeline: TimelineEvent[] = [
    ...(started
      ? [{ minute: "0'", type: "inicio" as const, title: "Inicio del partido", description: `${match.homeTeam.name} vs ${match.awayTeam.name}` }]
      : []),
    ...(events ?? []).map((e): TimelineEvent => {
      const team = e.teamId === match.awayTeam.id ? match.awayTeam.name : match.homeTeam.name;
      return {
        minute: `${e.minute}'`,
        type: ACTION_FROM_EVENT_TYPE[e.type] ?? "comentario",
        title: isEventType(e.type) ? EVENT_TITLES[e.type] : e.type,
        description: e.playerName ? `${e.playerName} - ${team}` : team,
        detail: e.detail ?? undefined,
      };
    }),
    ...(match.status === "finalizado"
      ? [{
          minute: "FT",
          type: "final" as const,
          title: "Final del partido",
          description: `${match.homeTeam.name} ${match.homeScore ?? 0} - ${match.awayScore ?? 0} ${match.awayTeam.name}`,
        }]
      : []),
  ];

  return (
    <div className="flex min-h-dvh flex-col pb-20">
      {/* Header */}
      <header className="px-4 py-3">
        <button
          onClick={() => router.back()}
          className="flex cursor-pointer items-center gap-1 font-heading text-sm font-semibold text-text-primary"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180">
            <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver
        </button>
      </header>

      {/* Match card */}
      <div className="mx-4 mb-4 rounded-xl border border-border-primary overflow-hidden">
        <div className="bg-btn-regular px-4 py-2">
          <span className="font-heading text-xs font-bold text-text-primary">
            {match.groupName || "General"}
          </span>
        </div>
        <div className="flex items-center px-4 py-3">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-2">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: clubColors[0] + "20" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 1h6v3a3 3 0 01-6 0V1z" stroke={clubColors[0]} strokeWidth="1" />
                </svg>
              </div>
              <span className="font-body text-sm text-text-primary">{match.homeTeam.name}</span>
              {showScore && <span className="ml-auto font-heading text-base font-bold text-text-primary">{match.homeScore ?? 0}</span>}
            </div>
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: clubColors[1] + "20" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 1h6v3a3 3 0 01-6 0V1z" stroke={clubColors[1]} strokeWidth="1" />
                </svg>
              </div>
              <span className="font-body text-sm text-text-primary">{match.awayTeam.name}</span>
              {showScore && <span className="ml-auto font-heading text-base font-bold text-text-primary">{match.awayScore ?? 0}</span>}
            </div>
          </div>
          <div className="mx-3 h-12 w-px bg-border-primary" />
          <div className="text-right">
            <p className="font-heading text-sm font-bold text-text-primary">
              Fecha {match.matchday}
            </p>
            <p className="font-body text-xs text-text-secondary">
              {formatMatchDate(match.date)}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline events */}
      <div className="flex flex-col gap-3 px-4">
        {timeline.length === 0 && (
          <p className="py-8 text-center font-body text-sm text-text-secondary">
            Aún no hay eventos registrados en este partido.
          </p>
        )}
        {timeline.map((event, i) => (
          <div
            key={i}
            className={`rounded-xl px-4 py-3 ${getEventStyle(event.type)}`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 shrink-0 ${getMinuteStyle(event.type)}`}>
                <EventIcon type={event.type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`font-heading text-xs font-bold ${getMinuteStyle(event.type)}`}>
                    {event.minute}
                  </span>
                  <span className="font-heading text-sm font-bold">
                    {event.title}
                  </span>
                </div>
                <p className={`font-body text-xs whitespace-pre-line ${
                  event.type === "gol" || event.type === "inicio" || event.type === "halftime" || event.type === "final"
                    ? "text-white/80"
                    : "text-text-secondary"
                }`}>
                  {event.description}
                </p>

                {event.player && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-white/20 px-3 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/30">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="5" r="3" fill="white" />
                        <path d="M2 13c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="white" strokeWidth="1.2" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-heading text-xs font-bold text-white">{event.player.name}</span>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <circle cx="6" cy="6" r="5" fill="#4CAF50" />
                          <path d="M4 6l1.5 1.5L8 5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span className="font-body text-[10px] text-white/70">{event.player.position}</span>
                    </div>
                  </div>
                )}

                {event.detail && (
                  <p className="mt-2 font-body text-xs text-white/80 leading-relaxed">
                    {event.detail}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom button */}
      <div className="sticky bottom-0 bg-surface-primary px-4 pb-6 pt-3">
        <button
          onClick={() => router.push(`/torneos/${params.id}/en-vivo/${params.matchId}`)}
          className="w-full cursor-pointer rounded-lg border border-border-primary py-3.5 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular"
        >
          Editar el resultado
        </button>
      </div>
    </div>
  );
}
