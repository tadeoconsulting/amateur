"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useMyClub } from "@/_lib/use-my-club";
import { WEEKDAYS, addDays, peruToday, relativeDayLabel, timeRange } from "@/_lib/club-training";
import { GestionError, gestionRequest, type CategoryOption, type PlaceItem, type ScheduleItem, type SessionItem } from "@/_lib/club-training-client";
import { PageSpinner } from "@/_components/spinner";
import { SubTabs } from "@/_components/sub-tabs";
import { Toast } from "@/_components/toast";
import { btnOutline, btnSolid } from "@/_components/button-styles";
import { PlaceSheet, ScheduleSheet, SessionSheet } from "./_components/forms";

type Tab = "calendario" | "horarios" | "lugares";
const TABS: { key: Tab; label: string }[] = [
  { key: "calendario", label: "Calendario" },
  { key: "horarios", label: "Horarios" },
  { key: "lugares", label: "Lugares" },
];

type Data = { places: PlaceItem[]; schedules: ScheduleItem[]; sessions: SessionItem[]; categories: CategoryOption[] };

export default function ClubSesionesPage() {
  const { club, loading } = useMyClub();
  if (loading) return <PageSpinner />;
  if (!club) return <div className="px-4 py-20 text-center font-body text-sm text-text-secondary">Todavía no tienes un club.</div>;
  return <SesionesContent key={club.id} clubId={club.id} />;
}

function SesionesContent({ clubId }: { clubId: string }) {
  const base = `/api/clubs/${clubId}/gestion`;
  const today = peruToday(new Date());
  const [tab, setTab] = useState<Tab>("calendario");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [sessionSheet, setSessionSheet] = useState<SessionItem | "new" | null>(null);
  const [scheduleSheet, setScheduleSheet] = useState<ScheduleItem | "new" | null>(null);
  const [placeSheet, setPlaceSheet] = useState<PlaceItem | "new" | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Los lugares y horarios van antes que las sesiones: leer las sesiones genera las que falten de los horarios.
    Promise.all([
      gestionRequest<PlaceItem[]>("GET", `${base}/lugares`),
      gestionRequest<ScheduleItem[]>("GET", `${base}/horarios`),
      gestionRequest<{ sessions: SessionItem[] }>("GET", `${base}/sesiones?desde=${addDays(today, -7)}&hasta=${addDays(today, 28)}`),
      gestionRequest<CategoryOption[]>("GET", `/api/clubs/${clubId}/categories`),
    ])
      .then(([places, schedules, sessions, categories]) => {
        if (cancelled) return;
        setData({ places, schedules, sessions: sessions.sessions, categories: categories.map((c) => ({ id: c.id, name: c.name })) });
        setError("");
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof GestionError ? err.message : "No se pudieron cargar los entrenamientos");
      });
    return () => {
      cancelled = true;
    };
  }, [base, clubId, today, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const dismissToast = useCallback(() => setToast(null), []);
  const saved = (message: string) => {
    setSessionSheet(null);
    setScheduleSheet(null);
    setPlaceSheet(null);
    setToast({ message, tone: "success" });
    reload();
  };

  if (!data && !error) return <PageSpinner />;

  const upcoming = (data?.sessions ?? []).filter((s) => s.date >= today);
  const recent = (data?.sessions ?? []).filter((s) => s.date < today).reverse();
  const noPlaces = !!data && data.places.length === 0;

  return (
    <div className="w-full pb-8">
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={dismissToast} />}

      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <div className="flex min-w-0 items-center gap-1">
          <Link href="/club/gestion" aria-label="Volver a Gestión" className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center text-text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180" aria-hidden="true">
              <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="font-heading text-xl font-bold text-text-primary">Sesiones</h1>
        </div>
        {data && (
          <button
            onClick={() => (tab === "horarios" ? setScheduleSheet("new") : tab === "lugares" ? setPlaceSheet("new") : setSessionSheet("new"))}
            disabled={noPlaces && tab !== "lugares"}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-border-primary px-3 font-heading text-sm font-bold text-text-primary hover:bg-btn-regular disabled:cursor-not-allowed disabled:opacity-40"
          >
            {tab === "horarios" ? "Nuevo horario" : tab === "lugares" ? "Nuevo lugar" : "Nuevo entrenamiento"}
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="mx-4 mt-4 rounded-lg bg-error/15 px-3 py-2.5 font-body text-sm text-brand-900">
          {error}{" "}
          <button onClick={reload} className="font-semibold underline">
            Reintentar
          </button>
        </div>
      )}

      {data && (
        <>
          <SubTabs label="Sesiones" value={tab} onChange={setTab} tabs={TABS} />

          {noPlaces && tab !== "lugares" && (
            <div className="mx-4 mt-4 rounded-xl border border-brand-200 p-5 text-center">
              <p className="font-heading text-base font-bold text-text-primary">Primero, dónde entrenan</p>
              <p className="mt-1.5 font-body text-sm text-text-secondary">Agrega al menos un lugar (por ejemplo, Colegio Perú Suizo) para crear horarios y entrenamientos.</p>
              <button onClick={() => setPlaceSheet("new")} className={`${btnSolid} mt-4`}>
                Agregar lugar
              </button>
            </div>
          )}

          {tab === "calendario" && !noPlaces && (
            <div className="px-4">
              {data.schedules.length === 0 && data.sessions.length === 0 && (
                <div className="mt-4 rounded-xl border border-brand-200 p-5 text-center">
                  <p className="font-heading text-base font-bold text-text-primary">Todavía no hay entrenamientos</p>
                  <p className="mt-1.5 font-body text-sm text-text-secondary">Define tu horario semanal (por ejemplo, martes y jueves a las 19:00) y los entrenamientos se crean solos.</p>
                  <button onClick={() => { setTab("horarios"); setScheduleSheet("new"); }} className={`${btnSolid} mt-4`}>
                    Definir horario
                  </button>
                </div>
              )}
              <SessionGroup title="Próximos" sessions={upcoming} today={today} onOpen={setSessionSheet} />
              <SessionGroup title="Últimos 7 días" sessions={recent} today={today} onOpen={setSessionSheet} />
            </div>
          )}

          {tab === "horarios" && !noPlaces && (
            <ul className="mt-2 px-4">
              {data.schedules.map((s) => (
                <li key={s.id} className="border-b border-brand-200 last:border-0">
                  <button onClick={() => setScheduleSheet(s)} className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 py-3 text-left">
                    <span className="min-w-0">
                      <span className="block font-heading text-sm font-bold text-text-primary">
                        {WEEKDAYS[s.weekday]} · {timeRange(s.startTime, s.durationMin).replace("–", " a ")}
                      </span>
                      <span className="block truncate font-body text-xs text-text-secondary">
                        {s.categoryName ?? "Todo el club"} · {s.placeName}
                      </span>
                    </span>
                    <span className="shrink-0 font-body text-xs text-text-secondary underline">Editar</span>
                  </button>
                </li>
              ))}
              {data.schedules.length === 0 && <p className="px-0 py-10 text-center font-body text-sm text-text-secondary">Todavía no definiste ningún horario semanal.</p>}
            </ul>
          )}

          {tab === "lugares" && (
            <ul className="mt-2 px-4">
              {data.places.map((p) => (
                <li key={p.id} className="border-b border-brand-200 last:border-0">
                  <button onClick={() => setPlaceSheet(p)} className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 py-3 text-left">
                    <span className="min-w-0">
                      <span className="block truncate font-heading text-sm font-bold text-text-primary">{p.name}</span>
                      {p.address && <span className="block truncate font-body text-xs text-text-secondary">{p.address}</span>}
                    </span>
                    <span className="shrink-0 font-body text-xs text-text-secondary underline">Editar</span>
                  </button>
                </li>
              ))}
              {data.places.length === 0 && <p className="py-10 text-center font-body text-sm text-text-secondary">Todavía no agregaste ningún lugar.</p>}
              <li className="pt-4">
                <button onClick={() => setPlaceSheet("new")} className={btnOutline}>
                  Agregar lugar
                </button>
              </li>
            </ul>
          )}
        </>
      )}

      {data && sessionSheet && (
        <SessionSheet base={base} session={sessionSheet === "new" ? null : sessionSheet} today={today} places={data.places} categories={data.categories} onSaved={saved} onClose={() => setSessionSheet(null)} />
      )}
      {data && scheduleSheet && (
        <ScheduleSheet base={base} schedule={scheduleSheet === "new" ? null : scheduleSheet} places={data.places} categories={data.categories} onSaved={saved} onClose={() => setScheduleSheet(null)} />
      )}
      {data && placeSheet && <PlaceSheet base={base} place={placeSheet === "new" ? null : placeSheet} onSaved={saved} onClose={() => setPlaceSheet(null)} />}
    </div>
  );
}

function SessionGroup({ title, sessions, today, onOpen }: { title: string; sessions: SessionItem[]; today: string; onOpen: (s: SessionItem) => void }) {
  if (sessions.length === 0) return null;
  const days = [...new Set(sessions.map((s) => s.date))];
  return (
    <section className="mt-4" aria-label={title}>
      <h2 className="font-heading text-xs font-bold uppercase tracking-wide text-text-secondary">{title}</h2>
      {days.map((day) => (
        <div key={day} className="mt-3">
          <h3 className="font-heading text-sm font-bold text-text-primary">{relativeDayLabel(day, today)}</h3>
          <ul className="mt-1">
            {sessions
              .filter((s) => s.date === day)
              .map((s) => (
                <li key={s.id} className="flex items-center gap-2 border-b border-brand-200 last:border-0">
                  <button onClick={() => onOpen(s)} className="flex min-h-14 min-w-0 flex-1 cursor-pointer flex-col justify-center py-2 text-left" aria-label={`Mover o cancelar el entrenamiento de ${s.categoryName ?? "todo el club"} a las ${s.time}`}>
                    <span className={`block font-heading text-sm font-bold ${s.status === "cancelada" ? "text-text-secondary line-through" : "text-text-primary"}`}>
                      {timeRange(s.time, s.durationMin).replace("–", " a ")} · {s.categoryName ?? "Todo el club"}
                    </span>
                    <span className="block truncate font-body text-xs text-text-secondary">
                      {s.placeName}
                      {s.status === "cancelada" ? " · cancelado" : s.marked > 0 ? ` · ${s.marked} de ${s.rosterSize} marcados` : ""}
                    </span>
                  </button>
                  {s.canMark && (
                    <Link href={`/club/gestion/asistencia/${s.id}`} className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-border-primary px-3 font-heading text-sm font-bold text-text-primary hover:bg-btn-regular">
                      Pasar lista
                    </Link>
                  )}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
