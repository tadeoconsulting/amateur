"use client";

import { useState } from "react";
import { formatSolesAmount, isDueDay, parseCents } from "@/_lib/club-fees";
import { FeesError, feesRequest } from "@/_lib/club-fees-client";
import { btnSolid } from "@/_components/button-styles";
import { Spinner } from "@/_components/spinner";
import { Sheet } from "@/_components/sheet";

const inputClass =
  "w-full rounded-lg border border-brand-200 bg-btn-regular px-3 py-3 font-body text-base text-text-primary transition-colors " +
  "hover:bg-surface-primary focus:bg-surface-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary/20";

/** La cuota mensual estándar del club y su día de vencimiento. */
export function FeeSettingsSheet({
  clubId,
  current,
  onSaved,
  onClose,
}: {
  clubId: string;
  current: { monthlyFee: number; dueDay: number; defined: boolean };
  onSaved: () => void;
  onClose: () => void;
}) {
  const [fee, setFee] = useState(current.defined ? String(current.monthlyFee) : "");
  const [dueDay, setDueDay] = useState(String(current.dueDay));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const cents = parseCents(fee);
  const feeError = fee.trim() === "" ? "Escribe la cuota mensual" : cents === null ? "Escribe un monto en soles, por ejemplo 80 o 80,50" : "";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (feeError || busy) return;
    if (!isDueDay(Number(dueDay))) return setError("El día de vencimiento va del 1 al 28");
    setError("");
    setBusy(true);
    try {
      await feesRequest("PATCH", `/api/clubs/${clubId}/gestion/ajustes`, { monthlyFee: cents! / 100, dueDay: Number(dueDay) });
      onSaved();
    } catch (err) {
      setError(err instanceof FeesError ? err.message : "No se pudo guardar");
      setBusy(false);
    }
  }

  return (
    <Sheet title="Cuota del club" onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-4">
        <div>
          <label htmlFor="club-fee" className="font-heading text-sm font-bold text-text-primary">
            Cuota mensual estándar (S/)
          </label>
          <input id="club-fee" inputMode="decimal" autoComplete="off" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="80" className={`${inputClass} mt-1.5`} aria-describedby="club-fee-help" />
          <p id="club-fee-help" className="mt-1.5 font-body text-xs text-text-secondary">
            La pagan todos los jugadores, salvo quien tenga un monto propio (por ejemplo S/ 60, o S/ 0 si no paga).
          </p>
        </div>
        <div>
          <label htmlFor="club-due-day" className="font-heading text-sm font-bold text-text-primary">
            Día de vencimiento
          </label>
          <select id="club-due-day" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className={`${inputClass} mt-1.5`}>
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                Día {d} de cada mes
              </option>
            ))}
          </select>
          <p className="mt-1.5 font-body text-xs text-text-secondary">Un mes con saldo pasa a “Vencido” después de este día.</p>
        </div>
        {current.defined && (
          <p className="rounded-lg bg-btn-regular px-3 py-2.5 font-body text-xs text-text-secondary">
            Hoy la cuota es {formatSolesAmount(current.monthlyFee)}. Si la cambias, el mes en curso y los anteriores conservan su monto; el nuevo se aplica desde el mes siguiente.
          </p>
        )}
        {(error || (feeError && fee !== "")) && (
          <p role="alert" className="rounded-lg bg-error/15 px-3 py-2.5 font-body text-sm text-brand-900">
            {error || feeError}
          </p>
        )}
        <button type="submit" disabled={!!feeError || busy} className={`${btnSolid} w-full`}>
          {busy && <Spinner size={16} label="Guardando" />}
          Guardar cuota
        </button>
      </form>
    </Sheet>
  );
}
