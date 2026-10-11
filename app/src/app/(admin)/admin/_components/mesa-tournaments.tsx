"use client";

import { useState } from "react";
import { useApi } from "@/_lib/use-api";

type Tournament = { id: string; name: string };

/**
 * "Torneos de la mesa" (especificación 011): los torneos que puede gestionar una cuenta de mesa. El admin los
 * asigna o quita desde acá (el organizador lo hace desde su torneo, en Mesa). Cada cambio se guarda al momento.
 */
export function MesaTournaments({ user, initial }: { user: { id: string; firstName: string }; initial: Tournament[] }) {
  const [assigned, setAssigned] = useState<Tournament[]>(initial);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: all } = useApi<Tournament[]>(() => fetch("/api/tournaments").then((r) => (r.ok ? r.json() : [])));

  const options = (all ?? []).filter((t) => !assigned.some((a) => a.id === t.id));

  async function add() {
    const t = options.find((o) => o.id === pick);
    if (!t) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/tournaments/${t.id}/mesa`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id }) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "No se pudo asignar el torneo");
    setAssigned((a) => [...a, { id: t.id, name: t.name }]);
    setPick("");
  }

  async function remove(t: Tournament) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/tournaments/${t.id}/mesa/${user.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return setError(body.error ?? "No se pudo quitar el torneo");
    }
    setAssigned((a) => a.filter((x) => x.id !== t.id));
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-body text-sm text-text-secondary">
        {user.firstName} solo puede gestionar el partido en vivo de estos torneos, y solo el día de juego (desde 1 hora antes del primer partido hasta 1 hora después del último).
      </p>
      {error && <div role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 font-body text-sm text-red-700">{error}</div>}

      {assigned.length === 0 ? (
        <p className="rounded-lg bg-btn-regular px-3 py-3 font-body text-sm text-text-secondary">Todavía no tiene torneos asignados.</p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-border-primary">
          {assigned.map((t, i) => (
            <li key={t.id} className={`flex items-center justify-between gap-3 px-3 py-2.5 ${i > 0 ? "border-t border-border-primary" : ""}`}>
              <span className="min-w-0 truncate font-body text-sm text-text-primary">{t.name}</span>
              <button type="button" onClick={() => void remove(t)} disabled={busy} className="cursor-pointer font-heading text-xs font-semibold text-text-secondary underline disabled:opacity-50">Quitar</button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <label htmlFor="mesa-torneo" className="sr-only">Torneo para asignar</label>
        <select id="mesa-torneo" value={pick} onChange={(e) => setPick(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary">
          <option value="">Elegir un torneo...</option>
          {options.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <button type="button" onClick={() => void add()} disabled={busy || !pick} className="min-h-10 shrink-0 cursor-pointer rounded-lg bg-surface-secondary px-4 py-2 font-heading text-xs font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
          Asignar
        </button>
      </div>
    </div>
  );
}
