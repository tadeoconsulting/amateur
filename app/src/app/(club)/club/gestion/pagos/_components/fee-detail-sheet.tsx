"use client";

import { useEffect, useState } from "react";
import { formatSolesAmount, isMonth, monthLabel, parseCents } from "@/_lib/club-fees";
import { FeesError, feesRequest, shortDate, type PlayerFeeHistory } from "@/_lib/club-fees-client";
import { btnOutline, btnSolid, btnText } from "@/_components/button-styles";
import { PageSpinner, Spinner } from "@/_components/spinner";
import { FeeStatusChip } from "@/_components/fee-status";
import { Sheet } from "@/_components/sheet";

const inputClass =
  "w-full rounded-lg border border-brand-200 bg-btn-regular px-3 py-2.5 font-body text-base text-text-primary transition-colors " +
  "hover:bg-surface-primary focus:bg-surface-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary/20";

type Notify = (message: string, tone?: "success" | "error") => void;

/** El detalle de un jugador: su cuota propia, cada mes con sus abonos (también los anulados) y las acciones para cobrar. */
export function FeeDetailSheet({
  clubId,
  playerId,
  clubFee,
  onChanged,
  onClose,
  notify,
}: {
  clubId: string;
  playerId: string;
  /** La cuota estándar del club, en soles. */
  clubFee: number;
  onChanged: () => void;
  onClose: () => void;
  notify: Notify;
}) {
  const base = `/api/clubs/${clubId}/gestion`;
  const [data, setData] = useState<PlayerFeeHistory | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  // Subir la versión vuelve a leer el historial (después de cada acción).
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    feesRequest<PlayerFeeHistory>("GET", `${base}/jugadores/${playerId}/historial`)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setLoadError("");
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof FeesError ? err.message : "No se pudo cargar");
      });
    return () => {
      cancelled = true;
    };
  }, [base, playerId, version]);

  /** Corre una acción, avisa el resultado y vuelve a leer lo de este jugador y la lista de atrás. */
  async function run(key: string, action: () => Promise<string>) {
    if (busy) return;
    setBusy(key);
    try {
      notify(await action());
      setVersion((v) => v + 1);
      onChanged();
    } catch (err) {
      notify(err instanceof FeesError ? err.message : "No se pudo completar la acción", "error");
    } finally {
      setBusy(null);
    }
  }

  const owed = data?.months.reduce((sum, m) => sum + m.balance, 0) ?? 0;

  return (
    <Sheet title={data?.player.name ?? "Pagos del jugador"} onClose={onClose}>
      {!data && !loadError && <PageSpinner />}
      {loadError && (
        <p role="alert" className="rounded-lg bg-error/15 px-3 py-2.5 font-body text-sm text-brand-900">
          {loadError}
        </p>
      )}
      {data && (
        <div className="flex flex-col gap-5">
          <p className="font-body text-sm text-text-secondary">
            {owed > 0 ? (
              <>
                Debe <strong className="text-text-primary">{formatSolesAmount(owed)}</strong> en total.
              </>
            ) : (
              "Está al día."
            )}
          </p>

          <OwnFeeForm base={base} playerId={playerId} data={data} clubFee={clubFee} busy={busy} run={run} />

          <div className="flex flex-col gap-3">
            {data.months.length === 0 && <p className="font-body text-sm text-text-secondary">Todavía no tiene meses de cuota.</p>}
            {data.months.map((m) => (
              <MonthBlock key={m.feeId} base={base} m={m} busy={busy} run={run} />
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}

type Run = (key: string, action: () => Promise<string>) => Promise<void>;

function OwnFeeForm({ base, playerId, data, clubFee, busy, run }: { base: string; playerId: string; data: PlayerFeeHistory; clubFee: number; busy: string | null; run: Run }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(data.ownAmount === null ? "" : String(data.ownAmount));
  const [start, setStart] = useState(data.startMonth ?? "");
  const cents = parseCents(amount);
  const invalid = amount.trim() === "" || cents === null || (start !== "" && !isMonth(start));

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl bg-btn-regular px-3 py-3">
        <div className="min-w-0">
          <p className="font-heading text-sm font-bold text-text-primary">
            {data.ownAmount === null ? `${formatSolesAmount(clubFee)} · la del club` : data.ownAmount === 0 ? "Sin cuota" : `${formatSolesAmount(data.ownAmount)} · monto propio`}
          </p>
          {data.startMonth && <p className="font-body text-xs text-text-secondary">Se cobra desde {monthLabel(data.startMonth).toLowerCase()}</p>}
        </div>
        <button onClick={() => setEditing(true)} className={`${btnOutline} shrink-0`}>
          Cambiar
        </button>
      </div>
    );
  }

  async function save(body: { monthlyFee?: number | null; startMonth?: string }) {
    await run("own", async () => {
      const r = await feesRequest<{ adjustedCurrentMonth: boolean }>("PATCH", `${base}/jugadores/${playerId}/cuota`, body);
      setEditing(false);
      return r.adjustedCurrentMonth ? "Cuota guardada. Se aplicó también a este mes" : "Cuota guardada. Se aplica desde el mes siguiente";
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-brand-200 p-3">
      <div>
        <label htmlFor="own-fee" className="font-heading text-sm font-bold text-text-primary">
          Cuota de este jugador (S/)
        </label>
        <input id="own-fee" inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(clubFee)} className={`${inputClass} mt-1.5`} />
        <p className="mt-1 font-body text-xs text-text-secondary">Escribe 0 si no paga.</p>
      </div>
      <div>
        <label htmlFor="own-start" className="font-heading text-sm font-bold text-text-primary">
          Se cobra desde
        </label>
        <input id="own-start" type="month" value={start} onChange={(e) => setStart(e.target.value)} className={`${inputClass} mt-1.5`} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          disabled={invalid || busy !== null}
          onClick={() => save({ monthlyFee: cents!/100, ...(start ? { startMonth: start } : {}) })}
          className={btnSolid}
        >
          {busy === "own" && <Spinner size={16} label="Guardando" />}
          Guardar
        </button>
        <button disabled={busy !== null} onClick={() => save({ monthlyFee: null, ...(start ? { startMonth: start } : {}) })} className={btnOutline}>
          Usar la del club
        </button>
        <button onClick={() => setEditing(false)} className={btnText}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function MonthBlock({ base, m, busy, run }: { base: string; m: PlayerFeeHistory["months"][number]; busy: string | null; run: Run }) {
  const [amount, setAmount] = useState("");
  const [correcting, setCorrecting] = useState(false);
  const [newDue, setNewDue] = useState(String(m.amount));
  const [confirmVoid, setConfirmVoid] = useState<string | null>(null);
  const cents = parseCents(amount);
  const dueCents = parseCents(newDue);

  return (
    <section className="rounded-xl border border-brand-200 p-3" aria-label={monthLabel(m.month)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-bold text-text-primary">{monthLabel(m.month)}</h3>
        <FeeStatusChip status={m.status} overdue={m.overdue} />
      </div>
      <p className="mt-1 font-body text-xs text-text-secondary">
        Cuota {formatSolesAmount(m.amount)} · Abonado {formatSolesAmount(m.paid)}
        {m.balance > 0 && <> · Falta <strong className="text-text-primary">{formatSolesAmount(m.balance)}</strong></>}
      </p>

      {m.payments.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {m.payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 font-body text-xs">
              {p.voidedAt ? (
                <span className="text-text-secondary">
                  <s>{formatSolesAmount(p.amount)} · {shortDate(p.paidAt)}</s> · anulado el {shortDate(p.voidedAt)}
                  {p.voidedBy ? ` por ${p.voidedBy}` : ""}
                </span>
              ) : (
                <>
                  <span className="text-text-primary">
                    {formatSolesAmount(p.amount)} · {shortDate(p.paidAt)}
                    {p.by ? <span className="text-text-secondary"> · {p.by}</span> : null}
                  </span>
                  {confirmVoid === p.id ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        disabled={busy !== null}
                        onClick={() => run(`void-${p.id}`, async () => { await feesRequest("DELETE", `${base}/abonos/${p.id}`); setConfirmVoid(null); return "Abono anulado"; })}
                        className="min-h-11 cursor-pointer px-2 font-semibold text-text-primary underline"
                      >
                        Sí, anular
                      </button>
                      <button onClick={() => setConfirmVoid(null)} className="min-h-11 cursor-pointer px-2 text-text-secondary underline">
                        No
                      </button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmVoid(p.id)} className="min-h-11 shrink-0 cursor-pointer px-2 text-text-secondary underline" aria-label={`Anular el abono de ${formatSolesAmount(p.amount)}`}>
                      Anular
                    </button>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {m.balance > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          <button
            disabled={busy !== null}
            onClick={() => run(`pay-${m.feeId}`, async () => { await feesRequest("POST", `${base}/cargos/${m.feeId}/abonos`, {}); return `Pago registrado: ${formatSolesAmount(m.balance)}`; })}
            className={btnSolid}
          >
            {busy === `pay-${m.feeId}` && <Spinner size={16} label="Registrando" />}
            Marcar pagado ({formatSolesAmount(m.balance)})
          </button>
          <div className="flex gap-2">
            <label htmlFor={`partial-${m.feeId}`} className="sr-only">
              Monto de un pago parcial en soles
            </label>
            <input id={`partial-${m.feeId}`} inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Otro monto" className={inputClass} />
            <button
              disabled={busy !== null || cents === null || cents <= 0}
              onClick={() => run(`part-${m.feeId}`, async () => { await feesRequest("POST", `${base}/cargos/${m.feeId}/abonos`, { amount: cents! / 100 }); setAmount(""); return `Abono registrado: ${formatSolesAmount(cents!)}`; })}
              className={`${btnOutline} shrink-0`}
            >
              Abonar
            </button>
          </div>
        </div>
      )}

      {correcting ? (
        <div className="mt-3 flex gap-2">
          <label htmlFor={`due-${m.feeId}`} className="sr-only">
            Nuevo monto del mes en soles
          </label>
          <input id={`due-${m.feeId}`} inputMode="decimal" autoComplete="off" value={newDue} onChange={(e) => setNewDue(e.target.value)} className={inputClass} />
          <button
            disabled={busy !== null || dueCents === null}
            onClick={() => run(`due-${m.feeId}`, async () => { await feesRequest("PATCH", `${base}/cargos/${m.feeId}`, { amountDue: dueCents! / 100 }); setCorrecting(false); return "Monto del mes corregido"; })}
            className={`${btnSolid} shrink-0`}
          >
            Guardar
          </button>
        </div>
      ) : (
        <button onClick={() => setCorrecting(true)} className="mt-2 min-h-11 cursor-pointer font-body text-xs text-text-secondary underline">
          Corregir el monto de este mes
        </button>
      )}
    </section>
  );
}
