"use client";

import Link from "next/link";
import { formatSolesAmount } from "@/_lib/club-fees";
import { relativeDayLabel, peruToday } from "@/_lib/club-training";
import type { ClubProgress } from "@/_lib/club-progress-client";
import { ClubCrest } from "@/_components/club-crest";

/**
 * El resumen del club en Actividad: el próximo entrenamiento, la asistencia y si debe algo. Lleva a "Mi club". Es de quien
 * mira: nunca muestra nada de otros jugadores.
 */
export function MyClubCard({ progress }: { progress: ClubProgress }) {
  const today = peruToday(new Date());
  const next = progress.sessions.find((s) => s.status === "programada");
  const owes = progress.payments.owed > 0;

  return (
    <Link href="/jugador/mi-club" className="block rounded-xl border border-border-primary p-4 hover:bg-btn-regular focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary">
      <div className="flex items-center gap-3">
        <ClubCrest club={progress.club} size="h-10 w-10" textSize="text-xs" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-sm font-bold text-text-primary">Mi club · {progress.club.name}</p>
          <p className="truncate font-body text-xs text-text-secondary">
            {next ? `Entrenas ${relativeDayLabel(next.date, today).split(" · ")[0].toLowerCase()} ${next.time} · ${next.placeName}` : "Todavía no hay entrenamientos programados"}
          </p>
        </div>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 text-text-secondary" aria-hidden="true">
          <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-btn-regular px-2.5 py-1 font-body text-xs text-text-primary">Asistencia {progress.attendance.percent === null ? "sin datos" : `${progress.attendance.percent}%`}</span>
        {progress.payments.defined && (
          <span className={`rounded-full px-2.5 py-1 font-body text-xs font-medium ${owes ? (progress.payments.overdue > 0 ? "bg-red/20" : "bg-yellow/50") : "bg-verification/20"} text-brand-900`}>
            {owes ? `Debes ${formatSolesAmount(progress.payments.owed)}` : "Pagos al día"}
          </span>
        )}
      </div>
    </Link>
  );
}
