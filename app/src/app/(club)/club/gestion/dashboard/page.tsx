"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMyClub } from "@/_lib/use-my-club";
import { formatSolesAmount, monthLabel, monthName } from "@/_lib/club-fees";
import { countLabel } from "@/_lib/club-training";
import { FeesError, feesRequest } from "@/_lib/club-fees-client";
import { PageSpinner } from "@/_components/spinner";
import { btnSolid } from "@/_components/button-styles";
import { CollectionChart, PercentBars, SERIES, TrendChart, type CollectionPoint, type TrendPoint } from "./_components/charts";

// El dashboard del delegado (especificación 015, entrega 4). Los datos salen de GET /api/clubs/:id/gestion/dashboard.
type Dashboard = {
  month: string;
  currentMonth: string;
  months: string[];
  categories: { id: string; name: string }[];
  categoryId: string | null;
  cobro: { defined: boolean; expected: number; collected: number; percent: number; players: number; paid: number; partial: number; pending: number; free: number; overdue: number; balance: number; series: CollectionPoint[] };
  morosos: { count: number; owed: number; overdue: number; list: { playerId: string; name: string; categoryName: string | null; owed: number; overdue: number; overdueMonths: number }[] };
  asistencia: {
    percent: number | null;
    sessions: number;
    categories: { id: string; name: string; sessions: number; percent: number | null }[];
    lowest: { playerId: string; name: string; categoryName: string | null; presente: number; ausente: number; justificado: number; percent: number | null }[];
    trend: TrendPoint[];
  };
  sesiones: { realizadas: number; canceladas: number; sinMarcar: number; proximas: number };
};

export default function ClubDashboardPage() {
  const { club, loading } = useMyClub();
  if (loading) return <PageSpinner />;
  if (!club) return <div className="px-4 py-20 text-center font-body text-sm text-text-secondary">Todavía no tienes un club.</div>;
  return <DashboardContent key={club.id} clubId={club.id} />;
}

function DashboardContent({ clubId }: { clubId: string }) {
  const [month, setMonth] = useState<string | null>(null); // null = el mes en curso
  const [categoryId, setCategoryId] = useState("");
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const q = new URLSearchParams();
    if (month) q.set("mes", month);
    if (categoryId) q.set("categoria", categoryId);
    feesRequest<Dashboard>("GET", `/api/clubs/${clubId}/gestion/dashboard${q.size ? `?${q}` : ""}`)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError("");
        setReloading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof FeesError ? err.message : "No se pudo cargar el dashboard");
        setReloading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clubId, month, categoryId]);

  const change = (fn: () => void) => {
    setReloading(true);
    fn();
  };

  const idx = data ? data.months.indexOf(data.month) : -1;
  const older = data && idx >= 0 ? data.months[idx + 1] : undefined;
  const newer = data && idx > 0 ? data.months[idx - 1] : undefined;

  return (
    <div className="w-full pb-10">
      <div className="flex items-center gap-1 px-4 pt-4">
        <Link href="/club/gestion" aria-label="Volver a Gestión" className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center text-text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180" aria-hidden="true">
            <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="font-heading text-xl font-bold text-text-primary">Dashboard</h1>
      </div>

      {error && (
        <div role="alert" className="mx-4 mt-4 rounded-lg bg-error/15 px-3 py-2.5 font-body text-sm text-brand-900">
          {error}
        </div>
      )}
      {!data && !error && <PageSpinner />}

      {data && (
        <div className={`transition-opacity ${reloading ? "opacity-60" : ""}`} aria-busy={reloading}>
          {/* Filtros: el mes y la categoría, en una sola fila arriba de todo. */}
          <div className="mt-2 flex items-center justify-between px-2">
            <button onClick={() => older && change(() => setMonth(older))} disabled={!older} aria-label="Mes anterior" className="flex h-11 w-11 cursor-pointer items-center justify-center text-text-primary disabled:cursor-default disabled:opacity-30">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180" aria-hidden="true">
                <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <p className="font-heading text-base font-bold text-text-primary" aria-live="polite">
              {monthLabel(data.month)}
              {data.month === data.currentMonth && <span className="ml-2 text-xs font-medium text-text-secondary">mes en curso</span>}
            </p>
            <button onClick={() => newer && change(() => setMonth(newer === data.currentMonth ? null : newer))} disabled={!newer} aria-label="Mes siguiente" className="flex h-11 w-11 cursor-pointer items-center justify-center text-text-primary disabled:cursor-default disabled:opacity-30">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          {data.categories.length > 0 && (
            <div className="mt-1 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtrar por categoría">
              {[{ id: "", name: "Todo el club" }, ...data.categories].map((c) => (
                <button key={c.id} onClick={() => change(() => setCategoryId(c.id))} aria-pressed={categoryId === c.id} className={`min-h-11 shrink-0 cursor-pointer rounded-lg px-4 font-heading text-sm font-medium transition-colors ${categoryId === c.id ? "bg-surface-secondary text-text-invert" : "border border-border-primary text-text-primary"}`}>
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <Summary data={data} />

          <Section title="Cobro por mes" subtitle="Lo recaudado sobre lo esperado de las cuotas de cada mes">
            {!data.cobro.defined ? (
              <Empty title="Todavía no defines la cuota mensual" text="Con la cuota del club verás aquí cuánto se recauda cada mes.">
                <Link href="/club/gestion/pagos" className={btnSolid}>
                  Ir a Pagos
                </Link>
              </Empty>
            ) : (
              <CollectionChart data={data.cobro.series} selected={data.month} />
            )}
          </Section>

          <Section title="Morosos" subtitle="Quién tiene cuotas vencidas, a hoy">
            {data.morosos.count === 0 ? (
              <p className="font-body text-sm text-text-secondary">{data.cobro.defined ? "Nadie tiene cuotas vencidas." : "Aparecerán cuando definas la cuota y pase un vencimiento."}</p>
            ) : (
              <>
                <p className="font-body text-sm text-text-secondary">
                  <strong className="text-text-primary">{countLabel(data.morosos.count, "jugador", "jugadores")}</strong> con {formatSolesAmount(data.morosos.overdue)} vencido
                  {data.morosos.owed > data.morosos.overdue && <> y {formatSolesAmount(data.morosos.owed)} por cobrar en total</>}.
                </p>
                <ul className="mt-1">
                  {data.morosos.list.map((m) => (
                    <li key={m.playerId} className="flex items-center justify-between gap-3 border-b border-brand-200 py-3 last:border-0">
                      <span className="min-w-0">
                        <span className="block truncate font-heading text-sm font-bold text-text-primary">{m.name}</span>
                        <span className="block truncate font-body text-xs text-text-secondary">
                          {m.categoryName ? `${m.categoryName} · ` : ""}
                          {countLabel(m.overdueMonths, "mes vencido", "meses vencidos")}
                        </span>
                      </span>
                      <span className="shrink-0 font-heading text-sm font-bold text-text-primary tabular-nums">{formatSolesAmount(m.overdue)}</span>
                    </li>
                  ))}
                </ul>
                {data.morosos.count > data.morosos.list.length && <p className="mt-2 font-body text-xs text-text-secondary">Se muestran los {data.morosos.list.length} con mayor deuda.</p>}
                <Link href="/club/gestion/pagos" className="mt-2 inline-flex min-h-11 items-center font-body text-sm font-semibold text-text-primary underline">
                  Ver pagos
                </Link>
              </>
            )}
          </Section>

          <Section title="Asistencia por semana" subtitle="Promedio de los entrenamientos de cada semana, últimas 12">
            {data.asistencia.trend.every((w) => w.percent === null) ? (
              <Empty title="Todavía no hay asistencia marcada" text="Cuando pases lista en un entrenamiento verás aquí cómo evoluciona.">
                <Link href="/club/gestion/asistencia" className={btnSolid}>
                  Pasar lista
                </Link>
              </Empty>
            ) : (
              <TrendChart data={data.asistencia.trend} />
            )}
          </Section>

          {data.asistencia.sessions > 0 && (
            <>
              <Section title="Asistencia por categoría" subtitle={`Promedio en ${monthName(data.month)}`}>
                <PercentBars caption="Asistencia por categoría" rows={data.asistencia.categories.map((c) => ({ key: c.id, label: c.name, percent: c.percent, detail: c.sessions > 0 ? countLabel(c.sessions, "entrenamiento", "entrenamientos") : "sin entrenamientos con asistencia" }))} />
              </Section>
              <Section title="Menor asistencia" subtitle={`Jugadores por debajo del 100% en ${monthName(data.month)}`}>
                {data.asistencia.lowest.filter((p) => p.percent !== null && p.percent < 100).length === 0 ? (
                  <p className="font-body text-sm text-text-secondary">Todos los que fueron marcados tienen 100% de asistencia.</p>
                ) : (
                  <PercentBars caption="Jugadores con menor asistencia" rows={data.asistencia.lowest.filter((p) => p.percent !== null && p.percent < 100).map((p) => ({ key: p.playerId, label: p.name, sub: p.categoryName ?? undefined, percent: p.percent, detail: `${countLabel(p.presente, "presente", "presentes")} · ${countLabel(p.ausente, "ausente", "ausentes")}` }))} />
                )}
              </Section>
            </>
          )}

          <Section title="Entrenamientos" subtitle={`En ${monthName(data.month)}`}>
            <dl className="grid grid-cols-2 gap-2">
              {[
                ["Realizados", data.sesiones.realizadas],
                ["Cancelados", data.sesiones.canceladas],
                ["Sin marcar", data.sesiones.sinMarcar],
                ["Próximos", data.sesiones.proximas],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-xl bg-btn-regular px-4 py-3">
                  <dt className="font-body text-xs text-text-secondary">{label}</dt>
                  <dd className="font-heading text-2xl font-bold text-text-primary tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            {data.sesiones.sinMarcar > 0 && (
              <Link href="/club/gestion/asistencia" className="mt-2 inline-flex min-h-11 items-center font-body text-sm font-semibold text-text-primary underline">
                Pasar lista de los pendientes
              </Link>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

/** Lo primero: una cifra grande (lo recaudado) y dos más chicas (asistencia y morosos). */
function Summary({ data }: { data: Dashboard }) {
  const { cobro, asistencia, morosos } = data;
  const hasFees = cobro.defined && cobro.expected > 0;
  return (
    <div className="mt-3 flex flex-col gap-2 px-4">
      <section aria-label="Recaudado del mes" className="rounded-xl bg-btn-regular p-4">
        <p className="font-body text-sm text-text-secondary">Recaudado en {monthName(data.month)}</p>
        <p className="font-heading text-5xl font-bold leading-tight text-text-primary tabular-nums">{hasFees ? `${cobro.percent}%` : "Sin cuotas"}</p>
        {hasFees ? (
          <>
            <p className="font-body text-sm text-text-secondary">
              {formatSolesAmount(cobro.collected)} de {formatSolesAmount(cobro.expected)}
              {cobro.balance > 0 && <> · faltan {formatSolesAmount(cobro.balance)}</>}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: "#CDEBDD" }} role="progressbar" aria-valuenow={cobro.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Porcentaje recaudado">
              <div className="h-full rounded-full" style={{ width: `${cobro.percent}%`, background: SERIES }} />
            </div>
            <p className="mt-2 font-body text-xs text-text-secondary">
              {countLabel(cobro.paid, "pagó", "pagaron")} · {countLabel(cobro.partial, "parcial", "parciales")} · {countLabel(cobro.pending, "pendiente", "pendientes")}
              {cobro.free > 0 && <> · {countLabel(cobro.free, "sin cuota", "sin cuota")}</>}
            </p>
          </>
        ) : (
          <p className="font-body text-sm text-text-secondary">{cobro.defined ? "No hay cuotas para cobrar este mes." : "Define la cuota mensual en Pagos para empezar."}</p>
        )}
      </section>
      <div className="grid grid-cols-2 gap-2">
        <section aria-label="Asistencia promedio" className="rounded-xl bg-btn-regular p-4">
          <p className="font-body text-xs text-text-secondary">Asistencia promedio</p>
          <p className="font-heading text-2xl font-bold text-text-primary tabular-nums">{asistencia.percent === null ? "Sin datos" : `${asistencia.percent}%`}</p>
          <p className="font-body text-xs text-text-secondary">{asistencia.sessions === 0 ? "nada marcado este mes" : countLabel(asistencia.sessions, "entrenamiento", "entrenamientos")}</p>
        </section>
        <section aria-label="Morosos" className="rounded-xl bg-btn-regular p-4">
          <p className="font-body text-xs text-text-secondary">Con deuda vencida</p>
          <p className="font-heading text-2xl font-bold text-text-primary tabular-nums">{morosos.count}</p>
          <p className="font-body text-xs text-text-secondary">{morosos.count === 0 ? "nadie por ahora" : `${formatSolesAmount(morosos.overdue)} vencido`}</p>
        </section>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 px-4" aria-label={title}>
      <h2 className="font-heading text-lg font-bold text-text-primary">{title}</h2>
      {subtitle && <p className="mb-2 font-body text-xs text-text-secondary">{subtitle}</p>}
      {children}
    </section>
  );
}

function Empty({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-brand-200 p-5 text-center">
      <p className="font-heading text-base font-bold text-text-primary">{title}</p>
      <p className="mt-1.5 font-body text-sm text-text-secondary">{text}</p>
      {children && <div className="mt-4 flex justify-center">{children}</div>}
    </div>
  );
}
