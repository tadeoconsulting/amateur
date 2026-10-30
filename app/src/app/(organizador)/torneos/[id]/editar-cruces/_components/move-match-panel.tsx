"use client";

import { useState } from "react";
import type { EditableMatch } from "@/_lib/fixture-edit";

/**
 * Mover un partido a otra fecha = intercambiarlo con un partido de esa fecha: cada uno pasa a la fecha del otro y toma
 * su día, hora y sede. Se elige primero la fecha y después con cuál partido de ella se intercambia; los que comparten un
 * equipo con el partido que se mueve van primero, porque son los que suelen dejar la fecha bien armada.
 */
export function MoveMatchPanel({
  match,
  candidates,
  name,
  when,
  onSwap,
  onCancel,
}: {
  match: EditableMatch;
  candidates: EditableMatch[];
  name: (teamId: string) => string;
  when: (m: EditableMatch) => string;
  onSwap: (otherId: string) => void;
  onCancel: () => void;
}) {
  const days = [...new Set(candidates.map((c) => c.matchday))].sort((a, b) => a - b);
  const [day, setDay] = useState<number | null>(null);
  const [other, setOther] = useState<string | null>(null);

  const shares = (c: EditableMatch) => [c.homeTeamId, c.awayTeamId].some((t) => t === match.homeTeamId || t === match.awayTeamId);
  const options = candidates
    .filter((c) => c.matchday === day)
    .sort((a, b) => Number(shares(b)) - Number(shares(a)));

  return (
    <div className="mt-3 rounded-lg bg-btn-regular p-3">
      <p className="font-body text-sm text-text-primary">
        Mover <strong>{name(match.homeTeamId)} vs {name(match.awayTeamId)}</strong> a otra fecha. Ese partido se intercambia con uno de la fecha que elijas.
      </p>

      <label className="mt-3 block font-body text-xs text-text-secondary" htmlFor={`dia-${match.id}`}>Fecha de destino</label>
      <select
        id={`dia-${match.id}`}
        value={day ?? ""}
        onChange={(e) => { setDay(e.target.value === "" ? null : Number(e.target.value)); setOther(null); }}
        className="mt-1 w-full rounded-lg border border-border-primary bg-surface-primary px-2 py-2.5 font-body text-sm text-text-primary"
      >
        <option value="">Elige una fecha</option>
        {days.map((d) => <option key={d} value={d}>Fecha {d}</option>)}
      </select>

      {day !== null && (
        <fieldset className="mt-3">
          <legend className="font-body text-xs text-text-secondary">Intercambiar con</legend>
          <div className="mt-1 flex flex-col gap-2">
            {options.map((c) => (
              <label key={c.id} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${other === c.id ? "border-brand-500 bg-surface-primary" : "border-border-primary"}`}>
                <input type="radio" name={`otro-${match.id}`} checked={other === c.id} onChange={() => setOther(c.id)} className="mt-1" />
                <span className="font-body text-sm text-text-primary">
                  {name(c.homeTeamId)} vs {name(c.awayTeamId)}
                  <span className="block text-xs text-text-secondary">{when(c)}{c.location ? ` · ${c.location}` : ""}</span>
                  {shares(c) && <span className="block text-[11px] font-semibold text-text-secondary">Comparte un equipo con el que mueves</span>}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => other && onSwap(other)}
          disabled={!other}
          className="cursor-pointer rounded-lg bg-surface-secondary px-4 py-2 font-heading text-xs font-bold text-text-invert disabled:cursor-not-allowed disabled:opacity-40"
        >
          Intercambiar
        </button>
        <button onClick={onCancel} className="cursor-pointer rounded-lg border border-border-primary px-4 py-2 font-heading text-xs font-semibold text-text-primary">
          Cancelar
        </button>
      </div>
      <p className="mt-2 font-body text-xs text-text-secondary">
        Después puede quedar un equipo dos veces en una fecha: lo marcamos arriba y lo arreglas cambiando el equipo de los partidos afectados.
      </p>
    </div>
  );
}
