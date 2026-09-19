"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useApi } from "@/_lib/use-api";
import type { MatchListItem, PlayerListItem } from "@/_lib/api";

const clubColors = ["#E53935", "#43A047"];

type MatchEvent = {
  type: "gol" | "amarilla" | "roja" | "cambio" | "penal";
  team: "local" | "visitante";
  minute: number;
  playerId: string | null;
  playerName: string | null;
};

export default function EnVivoPage() {
  const params = useParams<{ id: string; matchId: string }>();
  const router = useRouter();
  const { data: match, loading: loadingMatch } = useApi<MatchListItem>(() =>
    fetch(`/api/matches/${params.matchId}`).then((r) => r.json())
  );
  const [playersByClub, setPlayersByClub] = useState<Record<string, PlayerListItem[]>>({});

  useEffect(() => {
    if (!match) return;
    const ids = [match.homeTeam.id, match.awayTeam.id];
    Promise.all(
      ids.map((cid) => fetch(`/api/clubs/${cid}/players`).then((r) => r.json() as Promise<PlayerListItem[]>))
    ).then(([home, away]) => {
      setPlayersByClub({ [ids[0]]: home, [ids[1]]: away });
    });
  }, [match]);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeTeam, setActiveTeam] = useState<"local" | "visitante">("local");
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (loadingMatch || !match) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const matchDuration = 70;
  const progress = Math.min((elapsedSeconds / 60 / matchDuration) * 100, 100);

  const homeScore = events.filter((e) => e.team === "local" && e.type === "gol").length;
  const awayScore = events.filter((e) => e.team === "visitante" && e.type === "gol").length;

  const activeClubId = activeTeam === "local" ? match.homeTeam.id : match.awayTeam.id;
  const teamPlayers = playersByClub[activeClubId] ?? [];

  const playerCards = (playerId: string): { yellow: number; red: number } => {
    const yellow = events.filter((e) => e.playerId === playerId && e.type === "amarilla").length;
    const red = events.filter((e) => e.playerId === playerId && e.type === "roja").length;
    return { yellow, red };
  };

  const actions = [
    {
      id: "gol",
      label: "Gol",
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14 2.5l2.5 4.5h-5L14 2.5zM7 8l4.5 2.5-2 4.5L5 13l2-5zM21 8l-4.5 2.5 2 4.5L23 13l-2-5zM9.5 20l2-4.5h5l2 4.5-4.5 2.5L9.5 20z" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: "amarilla",
      label: "Amarilla",
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="8" y="4" width="12" height="18" rx="2" fill="#FFC107" stroke="#1B1B1B" strokeWidth="1.2" />
        </svg>
      ),
    },
    {
      id: "roja",
      label: "Roja",
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="8" y="4" width="12" height="18" rx="2" fill="#E53935" stroke="#1B1B1B" strokeWidth="1.2" />
        </svg>
      ),
    },
    {
      id: "cambio",
      label: "Cambio",
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M8 10h8l-3-3M20 18h-8l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 7v6M12 15v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "penal",
      label: "Penal",
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="4" y="8" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <line x1="4" y1="8" x2="14" y2="4" stroke="currentColor" strokeWidth="1.2" />
          <line x1="24" y1="8" x2="14" y2="4" stroke="currentColor" strokeWidth="1.2" />
          <line x1="10" y1="8" x2="10" y2="22" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" />
          <line x1="18" y1="8" x2="18" y2="22" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" />
          <line x1="4" y1="15" x2="24" y2="15" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" />
        </svg>
      ),
    },
  ];

  const handleSave = () => {
    if (!selectedAction) return;
    setEvents((prev) => [
      ...prev,
      {
        type: selectedAction as MatchEvent["type"],
        team: activeTeam,
        minute: minutes,
        playerId: selectedPlayer,
        playerName: selectedPlayer
          ? (() => {
              const p = teamPlayers.find((pl) => pl.id === selectedPlayer);
              return p ? `${p.user.firstName} ${p.user.lastName}` : null;
            })()
          : null,
      },
    ]);
    setSelectedAction(null);
    setSelectedPlayer(null);
  };

  return (
    <div className="flex min-h-dvh flex-col">
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

      {/* Match card with scores */}
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
              <span className="ml-auto font-heading text-base font-bold text-text-primary">{homeScore}</span>
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
              <span className="ml-auto font-heading text-base font-bold text-text-primary">{awayScore}</span>
            </div>
          </div>

          <div className="mx-3 h-12 w-px bg-border-primary" />

          <div className="text-right">
            <p className="font-heading text-sm font-bold text-brand-500">
              {minutes}:{seconds.toString().padStart(2, "0")}&quot;
            </p>
            <p className="font-body text-xs text-text-secondary">
              Fecha {match.matchday}
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mx-4 mb-5 flex items-center gap-2">
        <div className="h-2 flex-1 rounded-full bg-border-primary overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="font-heading text-sm font-bold text-brand-500">{matchDuration}&apos;</span>
      </div>

      {/* Team toggle */}
      <div className="mx-4 mb-5 flex gap-3">
        <button
          onClick={() => { setActiveTeam("local"); setSelectedPlayer(null); }}
          className={`flex-1 cursor-pointer rounded-lg py-2.5 font-heading text-sm font-bold transition-colors ${
            activeTeam === "local"
              ? "bg-surface-secondary text-text-invert"
              : "border border-border-primary text-text-primary"
          }`}
        >
          Local
        </button>
        <button
          onClick={() => { setActiveTeam("visitante"); setSelectedPlayer(null); }}
          className={`flex-1 cursor-pointer rounded-lg py-2.5 font-heading text-sm font-bold transition-colors ${
            activeTeam === "visitante"
              ? "bg-surface-secondary text-text-invert"
              : "border border-border-primary text-text-primary"
          }`}
        >
          Visitante
        </button>
      </div>

      {/* Action icons */}
      <div className="mx-4 mb-4 flex justify-between">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => {
              setSelectedAction(selectedAction === action.id ? null : action.id);
              setSelectedPlayer(null);
            }}
            className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg p-2 transition-colors ${
              selectedAction === action.id
                ? "bg-btn-regular"
                : "hover:bg-btn-regular"
            }`}
          >
            <span className="text-text-primary">{action.icon}</span>
            <span className="font-body text-xs text-text-secondary">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Player list or empty state */}
      {selectedAction ? (
        <div className="flex-1 px-4 pb-2">
          <div className="flex flex-col">
            {teamPlayers.map((player) => {
              const cards = playerCards(player.id);
              return (
                <button
                  key={player.id}
                  onClick={() => setSelectedPlayer(selectedPlayer === player.id ? null : player.id)}
                  className="flex cursor-pointer items-center gap-3 border-b border-border-primary px-1 py-3 transition-colors hover:bg-btn-regular"
                >
                  {/* Radio button */}
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    selectedPlayer === player.id
                      ? "border-surface-secondary bg-surface-secondary"
                      : "border-border-primary"
                  }`}>
                    {selectedPlayer === player.id && (
                      <div className="h-2 w-2 rounded-full bg-surface-primary" />
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-300">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="6" r="3" fill="currentColor" className="text-text-secondary" />
                      <path d="M3 15c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.2" className="text-text-secondary" />
                    </svg>
                  </div>

                  {/* Name + position */}
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-heading text-sm font-semibold text-text-primary">
                        {player.user.firstName} {player.user.lastName}
                      </span>
                      {/* Card indicators */}
                      {cards.red > 0 && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                          <rect x="3" y="1.5" width="8" height="11" rx="1.5" fill="#E53935" />
                        </svg>
                      )}
                      {cards.yellow > 0 && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                          <rect x="3" y="1.5" width="8" height="11" rx="1.5" fill="#FFC107" />
                        </svg>
                      )}
                    </div>
                    <span className="font-body text-xs text-text-secondary">{player.position}</span>
                  </div>

                  {/* Jersey number */}
                  <span className="font-heading text-base font-bold text-text-primary">{player.number}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <h2 className="font-heading text-lg font-bold text-text-primary mb-2">
            Registra la primera jugada
          </h2>
          <p className="font-body text-sm text-text-secondary leading-relaxed max-w-[300px]">
            Registra las acciones dentro del campo y transmite en vivo el partido a los hinchas
          </p>
        </div>
      ) : (
        <div className="flex-1 px-4">
          <div className="flex flex-col gap-3">
            {events.map((event, i) => {
              const isGol = event.type === "gol";
              const cardStyle = isGol
                ? "bg-[#2196F3] text-white"
                : "bg-surface-primary border border-border-primary text-text-primary";
              const minuteStyle = isGol ? "text-white" : "text-text-secondary";
              const descStyle = isGol ? "text-white/80" : "text-text-secondary";
              const teamName = event.team === "local" ? match.homeTeam.name : match.awayTeam.name;

              return (
                <div key={i} className={`rounded-xl px-4 py-3 ${cardStyle}`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 ${minuteStyle}`}>
                      {event.type === "gol" && (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M10 2.5l1.8 3.2h-3.6L10 2.5zM5 7l3.2 1.8-1.4 3.2L3.6 10.2 5 7zM15 7l-3.2 1.8 1.4 3.2 3.2-1.8L15 7z" fill="currentColor" />
                        </svg>
                      )}
                      {event.type === "amarilla" && (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <rect x="6" y="3" width="8" height="13" rx="1.5" fill="#FFC107" stroke="#1B1B1B" strokeWidth="1" />
                        </svg>
                      )}
                      {event.type === "roja" && (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <rect x="6" y="3" width="8" height="13" rx="1.5" fill="#E53935" stroke="#1B1B1B" strokeWidth="1" />
                        </svg>
                      )}
                      {event.type === "cambio" && (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M5 7h7l-2.5-2.5M15 13H8l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {event.type === "penal" && (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M4 7l6-4 6 4v8l-6 4-6-4V7z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                          <circle cx="10" cy="11" r="2" fill="currentColor" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`font-heading text-xs font-bold ${minuteStyle}`}>
                          {event.minute}&apos;
                        </span>
                        <span className="font-heading text-sm font-bold">
                          {event.type === "gol" ? "¡Gooooolllll!" : event.type === "amarilla" ? "Tarjeta amarilla" : event.type === "roja" ? "Tarjeta roja" : event.type === "cambio" ? "Cambio" : "¡Penal!"}
                        </span>
                      </div>
                      <p className={`font-body text-xs ${descStyle}`}>
                        {event.playerName ? `${event.playerName} - ${teamName}` : teamName}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom button */}
      <div className="sticky bottom-0 bg-surface-primary px-4 pb-6 pt-3">
        <button
          onClick={handleSave}
          className={`w-full cursor-pointer rounded-lg py-3.5 font-heading text-sm font-bold transition-colors ${
            selectedAction
              ? "bg-surface-secondary text-text-invert hover:bg-brand-700"
              : "bg-surface-secondary/50 text-text-invert/50 cursor-not-allowed"
          }`}
        >
          Guardar jugada
        </button>
      </div>
    </div>
  );
}
