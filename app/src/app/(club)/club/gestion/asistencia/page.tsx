"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMyClub } from "@/_lib/use-my-club";
import { addDays, countLabel, peruToday, relativeDayLabel, timeRange } from "@/_lib/club-training";
import { GestionError, gestionRequest, type AttendanceSummary, type SessionItem } from "@/_lib/club-training-client";
import { PageSpinner } from "@/_components/spinner";
import { SubTabs } from "@/_components/sub-tabs";

type Tab = "sesiones" | "promedios";
const TABS: { key: Tab; label: string }[] = [
  { key: "sesiones", label: "Sesiones" },
  { key: "promedios", label: "Promedios" },
];

export default function ClubAsistenciaPage() {
  const { club, loading } = useMyClub();
  if (loading) return <PageSpinner />;
  if (!club) return <div className="px-4 py-20 text-center font-body text-sm text-text-secondary">Todavía no tienes un club.</div>;
  return <AsistenciaContent key={club.id} clubId={club.id} />;
}

function AsistenciaContent({ clubId }: { clubId: string }) {
  const [tab, setTab] = useState<Tab>("sesiones");
  return (
    <div className="w-full pb-8">
      <div className="flex items-center gap-1 px-4 pt-4">
        <Link href="/club/gestion" aria-label="Volver a Gestión" className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center text-text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180" aria-hidden="true">
            <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="font-heading text-xl font-bold text-text-primary">Asistencia</h1>
      </div>
      <SubTabs label="Asistencia" value={tab} onChange={setTab} tabs={TABS} />
      {tab === "sesiones" ? <SessionsToMark clubId={clubId} /> : <Averages clubId={clubId} />}
    </div>
  );
}

/** Los entrenamientos de hoy y de los últimos días, para pasar lista. */
function SessionsToMark({ clubId }: { clubId: string }) {
  const today = peruToday(new Date());
  const [sessions, setSessions] = useState<SessionItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    gestionRequest<{ sessions: SessionItem[] }>("GET", `/api/clubs/${clubId}/gestion/sesiones?desde=${addDays(today, -14)}&hasta=${addDays(today, 1)}`)
      .then((r) => {
        if (!cancelled) setSessions(r.sessions.filter((s) => s.status === "programada" && s.canMark).reverse());
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof GestionError ? err.message : "No se pudieron cargar los entrenamientos");
      });
    return () => {
      cancelled = true;
    };
  }, [clubId, today]);

  if (error) return <p role="alert" className="mx-4 mt-4 rounded-lg bg-error/15 px-3 py-2.5 font-body text-sm text-brand-900">{error}</p>;
  if (!sessions) return <PageSpinner />;
  if (sessions.length === 0) {
    return (
      <div className="mx-4 mt-4 rounded-xl border border-brand-200 p-5 text-center">
        <p className="font-heading text-base font-bold text-text-primary">No hay entrenamientos para pasar lista</p>
        <p className="mt-1.5 font-body text-sm text-text-secondary">Aparecen aquí desde el día de cada entrenamiento. Define tus horarios en Sesiones.</p>
        <Link href="/club/gestion/sesiones" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-surface-secondary px-4 font-heading text-sm font-bold text-text-invert">
          Ir a Sesiones
        </Link>
      </div>
    );
  }
  return (
    <ul className="mt-2 px-4">
      {sessions.map((s) => (
        <li key={s.id} className="border-b border-brand-200 last:border-0">
          <Link href={`/club/gestion/asistencia/${s.id}`} className="flex min-h-14 items-center justify-between gap-3 py-3">
            <span className="min-w-0">
              <span className="block font-heading text-sm font-bold text-text-primary">{relativeDayLabel(s.date, today)}</span>
              <span className="block truncate font-body text-xs text-text-secondary">
                {timeRange(s.time, s.durationMin).replace("–", " a ")} · {s.categoryName ?? "Todo el club"} · {s.placeName}
              </span>
            </span>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.marked === 0 ? "bg-brand-200 text-text-primary" : s.marked >= s.rosterSize ? "bg-verification/20 text-brand-900" : "bg-yellow/50 text-brand-900"}`}>
              {s.marked === 0 ? "Sin marcar" : `${s.marked} de ${s.rosterSize}`}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** El promedio del club, de cada categoría y de cada jugador en los últimos 90 días. */
function Averages({ clubId }: { clubId: string }) {
  const [categoryId, setCategoryId] = useState("");
  const [data, setData] = useState<AttendanceSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    gestionRequest<AttendanceSummary>("GET", `/api/clubs/${clubId}/gestion/asistencia/resumen${categoryId ? `?categoria=${categoryId}` : ""}`)
      .then((r) => {
        if (cancelled) return;
        setData(r);
        setError("");
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof GestionError ? err.message : "No se pudieron cargar los promedios");
      });
    return () => {
      cancelled = true;
    };
  }, [clubId, categoryId]);

  if (error) return <p role="alert" className="mx-4 mt-4 rounded-lg bg-error/15 px-3 py-2.5 font-body text-sm text-brand-900">{error}</p>;
  if (!data) return <PageSpinner />;

  return (
    <div className="px-4">
      <section aria-label="Asistencia del club" className="mt-2 rounded-xl bg-btn-regular p-4">
        <p className="font-body text-sm text-text-secondary">Asistencia promedio · últimos 90 días</p>
        <p className="font-heading text-3xl font-bold text-text-primary">{data.club.percent === null ? "Sin datos" : `${data.club.percent}%`}</p>
        <p className="font-body text-xs text-text-secondary">
          {data.club.sessions === 0 ? "Aún no hay entrenamientos con asistencia marcada." : `${data.club.sessions} ${data.club.sessions === 1 ? "entrenamiento" : "entrenamientos"} con asistencia. Las justificadas no restan.`}
        </p>
      </section>

      {data.categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
          <button onClick={() => setCategoryId("")} aria-pressed={categoryId === ""} className={`min-h-11 cursor-pointer rounded-lg px-4 font-heading text-sm font-medium ${categoryId === "" ? "bg-surface-secondary text-text-invert" : "border border-border-primary text-text-primary"}`}>
            Todo el club
          </button>
          {data.categories.map((c) => (
            <button key={c.id} onClick={() => setCategoryId(c.id)} aria-pressed={categoryId === c.id} className={`min-h-11 cursor-pointer rounded-lg px-4 font-heading text-sm font-medium ${categoryId === c.id ? "bg-surface-secondary text-text-invert" : "border border-border-primary text-text-primary"}`}>
              {c.name}
              {c.percent !== null && <span className="ml-1.5 opacity-70">{c.percent}%</span>}
            </button>
          ))}
        </div>
      )}

      <h2 className="mt-5 font-heading text-xs font-bold uppercase tracking-wide text-text-secondary">Por jugador · menor asistencia primero</h2>
      <ul className="mt-1">
        {data.players.map((p) => (
          <li key={p.playerId} className="border-b border-brand-200 py-3 last:border-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate font-heading text-sm font-bold text-text-primary">{p.name}</span>
              <span className="shrink-0 font-heading text-sm font-bold text-text-primary">{p.percent === null ? "Sin datos" : `${p.percent}%`}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand-200" role="progressbar" aria-valuenow={p.percent ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label={`Asistencia de ${p.name}`}>
              <div className={`h-full rounded-full ${p.percent !== null && p.percent < 50 ? "bg-red" : "bg-verification"}`} style={{ width: `${p.percent ?? 0}%` }} />
            </div>
            <p className="mt-1 font-body text-xs text-text-secondary">
              {p.categoryName ? `${p.categoryName} · ` : ""}
              {countLabel(p.presente, "presente", "presentes")} · {countLabel(p.ausente, "ausente", "ausentes")} · {countLabel(p.justificado, "justificado", "justificados")}
            </p>
          </li>
        ))}
      </ul>
      {data.players.length === 0 && <p className="py-10 text-center font-body text-sm text-text-secondary">No hay jugadores para mostrar.</p>}
    </div>
  );
}
