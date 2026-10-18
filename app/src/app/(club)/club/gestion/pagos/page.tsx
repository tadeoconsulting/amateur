"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useMyClub } from "@/_lib/use-my-club";
import { formatSolesAmount, monthLabel } from "@/_lib/club-fees";
import { FeesError, feesRequest, type FeeRow, type FeesMonthData } from "@/_lib/club-fees-client";
import { PageSpinner, Spinner } from "@/_components/spinner";
import { Toast } from "@/_components/toast";
import { btnSolid } from "@/_components/button-styles";
import { FeeDetailSheet } from "./_components/fee-detail-sheet";
import { FeeSettingsSheet } from "./_components/fee-settings-sheet";
import { FeeStatusChip } from "./_components/fee-status";

type Filter = "todos" | "por_cobrar" | "pagados";

export default function ClubPagosPage() {
  const { club, loading } = useMyClub();
  if (loading) return <PageSpinner />;
  if (!club) return <div className="px-4 py-20 text-center font-body text-sm text-text-secondary">Todavía no tienes un club.</div>;
  return <PagosContent key={club.id} clubId={club.id} />;
}

function PagosContent({ clubId }: { clubId: string }) {
  const [month, setMonth] = useState<string | null>(null); // null = el mes en curso
  const [data, setData] = useState<FeesMonthData | null>(null);
  const [error, setError] = useState("");
  const [reloading, setReloading] = useState(false);
  const [filter, setFilter] = useState<Filter>("todos");
  const [detail, setDetail] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busyFee, setBusyFee] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  // Subir la versión vuelve a leer la lista (después de cada cambio); cambiar de mes también la lee de nuevo.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    feesRequest<FeesMonthData>("GET", `/api/clubs/${clubId}/gestion/pagos${month ? `?mes=${month}` : ""}`)
      .then((res) => {
        if (cancelled) return; // llegó una respuesta más nueva
        setData(res);
        setError("");
        setReloading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof FeesError ? err.message : "No se pudieron cargar los pagos");
        setReloading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clubId, month, version]);

  const reload = useCallback(() => {
    setReloading(true);
    setVersion((v) => v + 1);
  }, []);
  const goToMonth = (target: string | null) => {
    setReloading(true);
    setMonth(target);
  };

  const notify = useCallback((message: string, tone: "success" | "error" = "success") => setToast({ message, tone }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  async function markPaid(row: FeeRow) {
    if (busyFee) return;
    setBusyFee(row.feeId);
    try {
      await feesRequest("POST", `/api/clubs/${clubId}/gestion/cargos/${row.feeId}/abonos`, {});
      notify(`Pago registrado: ${row.name} · ${formatSolesAmount(row.balance)}`);
      reload();
    } catch (err) {
      notify(err instanceof FeesError ? err.message : "No se pudo registrar el pago", "error");
      reload();
    } finally {
      setBusyFee(null);
    }
  }

  if (!data && !error) return <PageSpinner />;

  const idx = data ? data.months.indexOf(data.month) : -1;
  const older = data && idx >= 0 ? data.months[idx + 1] : undefined;
  const newer = data && idx > 0 ? data.months[idx - 1] : undefined;

  const players = (data?.players ?? []).filter((p) => (filter === "todos" ? true : filter === "pagados" ? p.status === "pagado" || p.status === "sin_cuota" : p.status === "pendiente" || p.status === "parcial"));
  const toCollect = data ? data.summary.pending + data.summary.partial : 0;

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
          <h1 className="font-heading text-xl font-bold text-text-primary">Pagos</h1>
        </div>
        <button onClick={() => setSettingsOpen(true)} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-border-primary px-3 font-heading text-sm font-bold text-text-primary hover:bg-btn-regular">
          <span aria-hidden="true">S/</span>
          {data?.settings.defined ? `Cuota ${formatSolesAmount(data.settings.monthlyFee).replace("S/ ", "")}` : "Definir cuota"}
        </button>
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
          <div className="mt-3 flex items-center justify-between px-2">
            <button onClick={() => older && goToMonth(older)} disabled={!older} aria-label="Mes anterior" className="flex h-11 w-11 cursor-pointer items-center justify-center text-text-primary disabled:cursor-default disabled:opacity-30">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180" aria-hidden="true">
                <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <p className="font-heading text-base font-bold text-text-primary" aria-live="polite">
              {monthLabel(data.month)}
              {data.month === data.currentMonth && <span className="ml-2 text-xs font-medium text-text-secondary">mes en curso</span>}
            </p>
            <button onClick={() => newer && goToMonth(newer === data.currentMonth ? null : newer)} disabled={!newer} aria-label="Mes siguiente" className="flex h-11 w-11 cursor-pointer items-center justify-center text-text-primary disabled:cursor-default disabled:opacity-30">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {!data.settings.defined && data.players.length === 0 ? (
            <div className="mx-4 mt-4 rounded-xl border border-brand-200 p-5 text-center">
              <p className="font-heading text-base font-bold text-text-primary">Define la cuota mensual para empezar</p>
              <p className="mt-1.5 font-body text-sm text-text-secondary">Con la cuota del club, cada jugador tendrá su mes por cobrar y podrás ir marcando quién pagó.</p>
              <button onClick={() => setSettingsOpen(true)} className={`${btnSolid} mt-4`}>
                Definir cuota
              </button>
            </div>
          ) : (
            <>
              <section aria-label="Resumen del mes" className="mx-4 mt-2 rounded-xl bg-btn-regular p-4">
                <p className="font-body text-sm text-text-secondary">Recaudado</p>
                <p className="font-heading text-2xl font-bold text-text-primary">
                  {formatSolesAmount(data.summary.collected)} <span className="text-base font-medium text-text-secondary">de {formatSolesAmount(data.summary.expected)}</span>
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-200" role="progressbar" aria-valuenow={data.summary.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Porcentaje recaudado">
                  <div className="h-full rounded-full bg-verification" style={{ width: `${data.summary.percent}%` }} />
                </div>
                <p className="mt-2 font-body text-xs text-text-secondary">
                  {data.summary.percent}% · {data.summary.paid} pagaron · {toCollect} por cobrar
                  {data.summary.overdue > 0 && <> · <strong className="text-text-primary">{data.summary.overdue} vencidos</strong></>}
                </p>
              </section>

              <div className="mt-4 flex gap-2 px-4" role="group" aria-label="Filtrar jugadores">
                {([["todos", "Todos"], ["por_cobrar", "Por cobrar"], ["pagados", "Pagados"]] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    aria-pressed={filter === key}
                    className={`min-h-11 cursor-pointer rounded-lg px-4 font-heading text-sm font-medium transition-colors ${filter === key ? "bg-surface-secondary text-text-invert" : "border border-border-primary text-text-primary"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <ul className={`mt-2 px-4 transition-opacity ${reloading ? "opacity-60" : ""}`} aria-busy={reloading}>
                {players.map((p) => (
                  <PlayerFeeRow key={p.feeId} p={p} busy={busyFee === p.feeId} disabled={busyFee !== null} onOpen={() => setDetail(p.playerId)} onPay={() => markPaid(p)} />
                ))}
              </ul>

              {players.length === 0 && (
                <p className="px-4 py-10 text-center font-body text-sm text-text-secondary">
                  {data.players.length === 0 ? (
                    <>
                      Todavía no hay jugadores en tu club.{" "}
                      <Link href="/club/jugadores/buscar" className="font-semibold text-text-primary underline">
                        Invitar jugadores
                      </Link>
                    </>
                  ) : filter === "por_cobrar" ? (
                    "No queda nadie por cobrar este mes."
                  ) : (
                    "Nadie ha pagado todavía este mes."
                  )}
                </p>
              )}
            </>
          )}
        </>
      )}

      {settingsOpen && data && (
        <FeeSettingsSheet
          clubId={clubId}
          current={data.settings}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => {
            setSettingsOpen(false);
            notify("Cuota guardada");
            reload();
          }}
        />
      )}
      {detail && data && <FeeDetailSheet clubId={clubId} playerId={detail} clubFee={data.settings.monthlyFee} notify={notify} onChanged={reload} onClose={() => setDetail(null)} />}
    </div>
  );
}

function PlayerFeeRow({ p, busy, disabled, onOpen, onPay }: { p: FeeRow; busy: boolean; disabled: boolean; onOpen: () => void; onPay: () => void }) {
  const canPay = p.status === "pendiente" || p.status === "parcial";
  return (
    <li className="flex items-center gap-1 border-b border-brand-200 last:border-0">
      <button onClick={onOpen} className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 py-2 text-left" aria-label={`Ver pagos de ${p.name}`}>
        <span className="min-w-0">
          <span className="block truncate font-heading text-sm font-bold text-text-primary">{p.name}</span>
          <span className="block truncate font-body text-xs text-text-secondary">
            {p.categoryName ? `${p.categoryName} · ` : ""}
            {p.status === "sin_cuota" ? "Sin cuota" : `Cuota ${formatSolesAmount(p.amount)}${p.ownAmount !== null ? " (propia)" : ""}`}
            {p.status === "parcial" && ` · falta ${formatSolesAmount(p.balance)}`}
            {!p.active && " · ya no está en el club"}
          </span>
          {p.owed > p.balance && <span className="block font-body text-xs font-semibold text-text-primary">Debe {formatSolesAmount(p.owed)} en total</span>}
        </span>
        <FeeStatusChip status={p.status} overdue={p.overdue} />
      </button>
      <PayCheck row={p} canPay={canPay} busy={busy} disabled={disabled} onPay={onPay} onOpen={onOpen} />
    </li>
  );
}

/** El checklist: tocar cobra el saldo completo; un mes ya pagado abre el detalle (ahí se anula). */
function PayCheck({ row, canPay, busy, disabled, onPay, onOpen }: { row: FeeRow; canPay: boolean; busy: boolean; disabled: boolean; onPay: () => void; onOpen: () => void }) {
  if (row.status === "sin_cuota") {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center text-text-secondary" aria-label={`${row.name} no tiene cuota`}>
        –
      </span>
    );
  }
  const paid = row.status === "pagado";
  return (
    <button
      onClick={paid ? onOpen : onPay}
      disabled={disabled && !paid}
      aria-label={paid ? `${row.name} pagó. Ver el detalle` : `Marcar como pagado a ${row.name}, ${formatSolesAmount(row.balance)}`}
      className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
    >
      {busy ? (
        <Spinner size={18} label="Registrando" />
      ) : (
        <span className={`flex h-7 w-7 items-center justify-center rounded-md border-2 ${paid ? "border-verification bg-verification" : canPay ? "border-border-primary" : "border-brand-200"}`} aria-hidden="true">
          {paid && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 8.5l3 3 6-7" stroke="#1B1B1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {row.status === "parcial" && <span className="h-0.5 w-3 bg-text-primary" />}
        </span>
      )}
    </button>
  );
}
