"use client";

import { useState } from "react";
import Link from "next/link";
import { formatSolesAmount, monthLabel } from "@/_lib/club-fees";
import { countLabel, dayLabel, peruToday, relativeDayLabel, timeRange, type AttendanceStatus } from "@/_lib/club-training";
import { useClubProgress, type ClubProgress } from "@/_lib/club-progress-client";
import { ClubCrest } from "@/_components/club-crest";
import { FeeStatusChip } from "@/_components/fee-status";
import { PageSpinner } from "@/_components/spinner";

const ATTENDANCE: Record<AttendanceStatus | "none", { label: string; className: string }> = {
  presente: { label: "Presente", className: "bg-verification/20 text-brand-900" },
  ausente: { label: "Ausente", className: "bg-red/20 text-brand-900" },
  justificado: { label: "Justificado", className: "bg-yellow/50 text-brand-900" },
  none: { label: "Sin registrar", className: "bg-brand-200 text-text-primary" },
};

export default function JugadorMiClubPage() {
  const { clubs, error, loading } = useClubProgress();
  const [chosen, setChosen] = useState<string | null>(null);

  return (
    <div className="w-full pb-8">
      <div className="flex items-center gap-1 px-4 pt-4">
        <Link href="/jugador/torneos" aria-label="Volver a Actividad" className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center text-text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180" aria-hidden="true">
            <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="font-heading text-xl font-bold text-text-primary">Mi club</h1>
      </div>

      {loading && <PageSpinner />}
      {error && (
        <p role="alert" className="mx-4 mt-4 rounded-lg bg-error/15 px-3 py-2.5 font-body text-sm text-brand-900">
          {error}
        </p>
      )}

      {clubs && clubs.length === 0 && (
        <div className="px-6 pt-20 text-center">
          <h2 className="font-heading text-lg font-bold text-text-primary">Todavía no estás en un club</h2>
          <p className="mt-2 text-sm text-text-secondary">Cuando te unas a un equipo verás aquí tus entrenamientos, tu asistencia y tus pagos.</p>
          <Link href="/jugador/equipos" className="mt-4 inline-block text-sm font-medium text-text-primary underline">
            Ir a Mis Equipos
          </Link>
        </div>
      )}

      {clubs && clubs.length > 0 && <ClubDetail clubs={clubs} chosen={chosen} onChoose={setChosen} />}
    </div>
  );
}

function ClubDetail({ clubs, chosen, onChoose }: { clubs: ClubProgress[]; chosen: string | null; onChoose: (id: string) => void }) {
  const progress = clubs.find((c) => c.club.id === chosen) ?? clubs[0];
  const today = peruToday(new Date());
  const { attendance: att, payments: pay } = progress;

  return (
    <>
      {clubs.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2 px-4" role="group" aria-label="Elegir club">
          {clubs.map((c) => (
            <button key={c.club.id} onClick={() => onChoose(c.club.id)} aria-pressed={c.club.id === progress.club.id} className={`min-h-11 cursor-pointer rounded-lg px-4 font-heading text-sm font-medium ${c.club.id === progress.club.id ? "bg-surface-secondary text-text-invert" : "border border-border-primary text-text-primary"}`}>
              {c.club.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 px-4">
        <ClubCrest club={progress.club} size="h-12 w-12" textSize="text-sm" />
        <div className="min-w-0">
          <p className="truncate font-heading text-base font-bold text-text-primary">{progress.club.name}</p>
          <p className="font-body text-xs text-text-secondary">{progress.categoryName ? `Categoría ${progress.categoryName}` : "Todo el club"}</p>
        </div>
      </div>

      <section className="mt-6 px-4" aria-labelledby="mc-sessions">
        <h2 id="mc-sessions" className="font-heading text-lg font-bold text-text-primary">
          Próximos entrenamientos
        </h2>
        {progress.sessions.length === 0 ? (
          <p className="mt-2 font-body text-sm text-text-secondary">Tu club todavía no programó entrenamientos para las próximas semanas.</p>
        ) : (
          <ul className="mt-1">
            {progress.sessions.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-3 border-b border-brand-200 py-3 last:border-0">
                <span className="min-w-0">
                  <span className={`block font-heading text-sm font-bold ${s.status === "cancelada" ? "text-text-secondary line-through" : "text-text-primary"}`}>{relativeDayLabel(s.date, today)}</span>
                  <span className="block font-body text-xs text-text-secondary">{timeRange(s.time, s.durationMin).replace("–", " a ")}</span>
                  <span className="block font-body text-xs text-text-secondary">
                    {s.placeName}
                    {s.placeAddress ? ` · ${s.placeAddress}` : ""}
                  </span>
                </span>
                {s.status === "cancelada" && <span className="shrink-0 rounded-full bg-red/20 px-2.5 py-0.5 text-xs font-medium text-brand-900">Cancelado</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 px-4" aria-labelledby="mc-attendance">
        <h2 id="mc-attendance" className="font-heading text-lg font-bold text-text-primary">
          Mi asistencia
        </h2>
        <div className="mt-2 rounded-xl bg-btn-regular p-4">
          <p className="font-body text-sm text-text-secondary">Últimos {att.windowDays} días</p>
          <p className="font-heading text-3xl font-bold text-text-primary">{att.percent === null ? "Sin datos" : `${att.percent}%`}</p>
          {att.percent !== null && (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-200" role="progressbar" aria-valuenow={att.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Mi asistencia">
              <div className={`h-full rounded-full ${att.percent < 50 ? "bg-red" : "bg-verification"}`} style={{ width: `${att.percent}%` }} />
            </div>
          )}
          <p className="mt-2 font-body text-xs text-text-secondary">
            {countLabel(att.presente, "presente", "presentes")} · {countLabel(att.ausente, "ausente", "ausentes")} · {countLabel(att.justificado, "justificado", "justificados")}. Las faltas justificadas no restan.
          </p>
        </div>
        {att.recent.length > 0 && (
          <ul className="mt-2">
            {att.recent.map((r) => {
              const c = ATTENDANCE[r.status ?? "none"];
              return (
                <li key={`${r.date}-${r.time}-${r.categoryName}`} className="flex items-center justify-between gap-3 border-b border-brand-200 py-3 last:border-0">
                  <span className="font-body text-sm text-text-primary">{dayLabel(r.date)}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.className}`}>{c.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-8 px-4" aria-labelledby="mc-payments">
        <h2 id="mc-payments" className="font-heading text-lg font-bold text-text-primary">
          Mis pagos
        </h2>
        {!pay.defined ? (
          <p className="mt-2 font-body text-sm text-text-secondary">Tu club todavía no registra cuotas mensuales.</p>
        ) : (
          <>
            <div className="mt-2 rounded-xl bg-btn-regular p-4">
              {pay.owed > 0 ? (
                <>
                  <p className="font-body text-sm text-text-secondary">Debes</p>
                  <p className="font-heading text-3xl font-bold text-text-primary">{formatSolesAmount(pay.owed)}</p>
                  {pay.overdue > 0 && (
                    <p className="font-body text-xs text-text-secondary">
                      De eso, <strong className="text-text-primary">{formatSolesAmount(pay.overdue)}</strong> ya venció ({countLabel(pay.overdueMonths, "mes", "meses")}).
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="font-body text-sm text-text-secondary">Estado</p>
                  <p className="font-heading text-2xl font-bold text-text-primary">Estás al día</p>
                </>
              )}
              {pay.dueMonths > 0 && (
                <>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-200" role="progressbar" aria-valuenow={pay.paidMonths} aria-valuemin={0} aria-valuemax={pay.dueMonths} aria-label="Meses pagados">
                    <div className="h-full rounded-full bg-verification" style={{ width: `${Math.round((pay.paidMonths / pay.dueMonths) * 100)}%` }} />
                  </div>
                  <p className="mt-2 font-body text-xs text-text-secondary">
                    {pay.paidMonths} de {pay.dueMonths} {pay.dueMonths === 1 ? "mes pagado" : "meses pagados"}
                  </p>
                </>
              )}
            </div>
            <ul className="mt-2">
              {pay.months.map((m) => (
                <li key={m.month} className="flex items-center justify-between gap-3 border-b border-brand-200 py-3 last:border-0">
                  <span className="min-w-0">
                    <span className="block font-heading text-sm font-bold text-text-primary">{monthLabel(m.month)}</span>
                    <span className="block font-body text-xs text-text-secondary">
                      {m.status === "sin_cuota" ? "Sin cuota" : `Cuota ${formatSolesAmount(m.amount)}`}
                      {m.status === "pagado" && m.lastPaidAt ? ` · pagado el ${m.lastPaidAt.slice(8)}/${m.lastPaidAt.slice(5, 7)}` : ""}
                      {m.status === "parcial" ? ` · falta ${formatSolesAmount(m.balance)}` : ""}
                      {m.status === "pendiente" ? ` · debes ${formatSolesAmount(m.balance)}` : ""}
                    </span>
                  </span>
                  <FeeStatusChip status={m.status} overdue={m.overdue} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
