"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApi } from "@/_lib/use-api";
import type { MatchListItem } from "@/_lib/api";
import { UNSCHEDULED_LABEL } from "@/_lib/match-format";
import { isUnscheduled } from "@/_lib/fixture";

const clubColors = ["#E53935", "#43A047", "#1E88E5", "#FB8C00", "#8E24AA", "#00ACC1", "#F4511E", "#7B1FA2"];

function formatMatchDate(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.toLocaleDateString("es-PE", { weekday: "short", timeZone: "UTC" });
  const num = d.getUTCDate();
  const month = d.toLocaleDateString("es-PE", { month: "short", timeZone: "UTC" });
  return `${day.charAt(0).toUpperCase() + day.slice(1)} ${num} ${month.charAt(0).toUpperCase() + month.slice(1)}`;
}

function formatTime12h(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "pm" : "am";
  const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h12}:${m}${ampm}`;
}

function getCountdown(targetDate: Date): string {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();
  if (diff <= 0) return "00:00:00";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/** Momento de inicio del partido: su día más la hora de reloj de la cancha. null si no está programado. */
function matchStart(match: { date: string; time: string }): number | null {
  if (isUnscheduled(match)) return null;
  const [y, m, d] = match.date.slice(0, 10).split("-").map(Number);
  const [hh, mm] = match.time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime();
}

export default function PartidoDetailPage() {
  const params = useParams<{ id: string; matchId: string }>();
  const router = useRouter();
  const { data: match, loading } = useApi<MatchListItem>(() =>
    fetch(`/api/matches/${params.matchId}`).then((r) => r.json())
  );
  const [countdown, setCountdown] = useState("--:--:--");
  const targetMs = match ? matchStart(match) : null;

  useEffect(() => {
    if (targetMs === null) return;
    const target = new Date(targetMs);
    const tick = () => setCountdown(getCountdown(target));
    const interval = setInterval(tick, 1000);
    tick();
    return () => clearInterval(interval);
  }, [targetMs]);

  if (loading || !match) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

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

      {/* Match card */}
      <div className="mx-4 mb-4 rounded-xl border border-border-primary overflow-hidden">
        {/* Group header */}
        <div className="bg-btn-regular px-4 py-2">
          <span className="font-heading text-xs font-bold text-text-primary">
            {match.groupName || "General"}
          </span>
        </div>

        {/* Match content */}
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
              <span className="font-body text-sm text-text-primary">{match.homeTeam?.name ?? "Por definir"}</span>
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
              <span className="font-body text-sm text-text-primary">{match.awayTeam?.name ?? "Por definir"}</span>
            </div>
          </div>

          <div className="mx-3 h-12 w-px bg-border-primary" />

          <div className="text-right">
            <p className="font-heading text-sm font-bold text-text-primary">
              Fecha {match.matchday}
            </p>
            <p className="font-body text-xs text-text-secondary">
              {isUnscheduled(match) ? UNSCHEDULED_LABEL : formatMatchDate(match.date)}
            </p>
          </div>
        </div>
      </div>

      {targetMs !== null ? (
        <>
          {/* Countdown timer card */}
          <div className="mx-4 rounded-xl bg-btn-regular py-6 text-center">
            <p className="font-heading text-4xl font-bold tracking-wide text-text-primary">
              {countdown}
            </p>
            <p className="mt-1 font-body text-sm text-text-secondary">
              Hora del partido: {formatTime12h(match.time)}{match.location ? ` · ${match.location}` : ""}
            </p>
          </div>
          <div className="flex-1" />
        </>
      ) : (
        <>
          {/* Illustration + message */}
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="mb-6">
              <svg width="260" height="200" viewBox="0 0 260 200" fill="none">
                <circle cx="130" cy="100" r="90" fill="#FFF3E0" />
                <ellipse cx="130" cy="170" rx="85" ry="12" fill="#4CAF50" />
                <ellipse cx="130" cy="170" rx="85" ry="6" fill="#66BB6A" />
                <line x1="130" y1="158" x2="130" y2="175" stroke="white" strokeWidth="1.5" strokeDasharray="3 2" />
                <ellipse cx="130" cy="168" rx="12" ry="4" stroke="white" strokeWidth="1" fill="none" />
                <rect x="100" y="130" width="60" height="35" rx="3" fill="none" stroke="#FFB74D" strokeWidth="2" />
                <line x1="100" y1="130" x2="130" y2="120" stroke="#FFB74D" strokeWidth="1.5" />
                <line x1="160" y1="130" x2="130" y2="120" stroke="#FFB74D" strokeWidth="1.5" />
                <line x1="110" y1="130" x2="110" y2="165" stroke="#FFE0B2" strokeWidth="0.5" />
                <line x1="120" y1="130" x2="120" y2="165" stroke="#FFE0B2" strokeWidth="0.5" />
                <line x1="130" y1="120" x2="130" y2="165" stroke="#FFE0B2" strokeWidth="0.5" />
                <line x1="140" y1="130" x2="140" y2="165" stroke="#FFE0B2" strokeWidth="0.5" />
                <line x1="150" y1="130" x2="150" y2="165" stroke="#FFE0B2" strokeWidth="0.5" />
                <line x1="100" y1="140" x2="160" y2="140" stroke="#FFE0B2" strokeWidth="0.5" />
                <line x1="100" y1="150" x2="160" y2="150" stroke="#FFE0B2" strokeWidth="0.5" />
                <circle cx="85" cy="105" r="11" fill="#FFCC80" />
                <circle cx="82" cy="102" r="1.5" fill="#5D4037" />
                <circle cx="88" cy="102" r="1.5" fill="#5D4037" />
                <path d="M82 108q3 2 6 0" stroke="#5D4037" strokeWidth="1" strokeLinecap="round" fill="none" />
                <path d="M74 100q2-8 11-8t11 5" stroke="#5D4037" strokeWidth="2" fill="none" />
                <rect x="76" y="116" width="18" height="24" rx="4" fill="#FFC107" />
                <rect x="79" y="140" width="6" height="20" fill="#1B1B1B" rx="2" />
                <rect x="89" y="140" width="6" height="20" fill="#1B1B1B" rx="2" />
                <rect x="68" y="118" width="8" height="16" rx="3" fill="#FFC107" transform="rotate(-15 68 118)" />
                <rect x="94" y="116" width="8" height="16" rx="3" fill="#FFC107" transform="rotate(20 94 116)" />
                <circle cx="175" cy="108" r="11" fill="#FFCC80" />
                <circle cx="172" cy="105" r="1.5" fill="#5D4037" />
                <circle cx="178" cy="105" r="1.5" fill="#5D4037" />
                <path d="M172 111q3 2 6 0" stroke="#5D4037" strokeWidth="1" strokeLinecap="round" fill="none" />
                <path d="M165 104q3-10 10-8" stroke="#1B1B1B" strokeWidth="2.5" fill="none" />
                <rect x="166" y="119" width="18" height="24" rx="4" fill="#E53935" />
                <rect x="169" y="143" width="6" height="20" fill="#1B1B1B" rx="2" />
                <rect x="179" y="143" width="6" height="20" fill="#1B1B1B" rx="2" />
                <rect x="158" y="120" width="8" height="16" rx="3" fill="#E53935" transform="rotate(-10 158 120)" />
                <rect x="184" y="118" width="8" height="16" rx="3" fill="#E53935" transform="rotate(15 184 118)" />
                <circle cx="135" cy="152" r="8" fill="white" stroke="#1B1B1B" strokeWidth="1.2" />
                <path d="M135 144l2 3.5h-4l2-3.5zM129 148l3.5 2-1.5 3.5-3.5-2 1.5-3.5zM141 148l-3.5 2 1.5 3.5 3.5-2-1.5-3.5z" fill="#1B1B1B" />
                <circle cx="45" cy="125" r="18" fill="#A5D6A7" />
                <circle cx="55" cy="120" r="14" fill="#81C784" />
                <rect x="48" y="130" width="4" height="15" fill="#795548" rx="1" />
                <circle cx="215" cy="120" r="16" fill="#A5D6A7" />
                <circle cx="225" cy="118" r="12" fill="#81C784" />
                <rect x="218" y="128" width="4" height="15" fill="#795548" rx="1" />
                <rect x="60" y="60" width="16" height="50" rx="2" fill="#E0E0E0" />
                <rect x="80" y="50" width="12" height="60" rx="2" fill="#EEEEEE" />
                <rect x="168" y="55" width="14" height="55" rx="2" fill="#E0E0E0" />
                <rect x="186" y="65" width="10" height="45" rx="2" fill="#EEEEEE" />
              </svg>
            </div>
            <p className="font-heading text-base font-bold text-text-primary">
              Aún no inicia el partido
            </p>
          </div>
        </>
      )}

      {/* Bottom buttons */}
      <div className="flex gap-3 px-4 pb-6 pt-3">
        <button
          onClick={() => router.push(`/torneos/${params.id}/configurar/${params.matchId}`)}
          className="flex-1 cursor-pointer rounded-lg border border-border-primary py-3 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular"
        >
          Re programar
        </button>
        <button
          onClick={() => router.push(`/torneos/${params.id}/en-vivo/${params.matchId}`)}
          className="flex-1 cursor-pointer rounded-lg bg-surface-secondary py-3 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700"
        >
          Iniciar el partido
        </button>
      </div>
    </div>
  );
}
