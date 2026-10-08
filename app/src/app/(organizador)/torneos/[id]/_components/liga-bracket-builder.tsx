"use client";

import { useState } from "react";
import type { StandingsRow } from "@/_lib/api";
import { playoffLabel, standardSeedOrder } from "@/_lib/fixture";
import { btnSolid } from "@/_components/button-styles";
import { Spinner } from "@/_components/spinner";
import { ClubCrest } from "@/_components/club-crest";

type Mode = "auto" | "manual";

/**
 * Arma las llaves de una liga que ya terminó: los primeros `size` de la tabla clasifican y el
 * organizador elige cómo se cruzan, automático (el mejor contra el peor) o a mano.
 */
export function LigaBracketBuilder({
  tournamentId,
  size,
  standings,
  onBuilt,
}: {
  tournamentId: string;
  size: number;
  standings: StandingsRow[];
  onBuilt: () => void;
}) {
  const qualified = standings.slice(0, size);
  const pairCount = size / 2;
  const [mode, setMode] = useState<Mode>("auto");
  // Un cruce son dos ids; "" mientras no se eligió.
  const [pairs, setPairs] = useState<[string, string][]>(() => Array.from({ length: pairCount }, () => ["", ""] as [string, string]));
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState("");

  const autoPairs = (() => {
    const order = standardSeedOrder(size);
    return Array.from({ length: pairCount }, (_, i) => [qualified[order[i * 2] - 1], qualified[order[i * 2 + 1] - 1]] as const);
  })();

  const chosen = pairs.flat().filter(Boolean);
  const manualComplete = chosen.length === size;
  const canBuild = qualified.length === size && (mode === "auto" || manualComplete);

  function setSlot(pairIndex: number, slot: 0 | 1, clubId: string) {
    setPairs((prev) => prev.map((p, i) => (i === pairIndex ? (slot === 0 ? [clubId, p[1]] : [p[0], clubId]) : p)));
  }

  async function build() {
    setError("");
    setBuilding(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/fixture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "auto" ? { mode: "bracket" } : { mode: "bracket", pairs }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudieron armar las llaves");
        return;
      }
      onBuilt();
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setBuilding(false);
    }
  }

  const byId = new Map(qualified.map((r, i) => [r.clubId, { row: r, seed: i + 1 }]));

  const optionClass = (active: boolean) =>
    `flex-1 cursor-pointer rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary ${
      active ? "border-text-primary bg-btn-regular" : "border-border-primary hover:bg-btn-regular"
    }`;

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <div>
        <h2 className="font-heading text-base font-bold text-text-primary">La liga terminó</h2>
        <p className="mt-1 font-body text-sm text-text-secondary">
          Los {size} primeros de la tabla clasifican: {playoffLabel(size).toLowerCase()}. Elige cómo se cruzan.
        </p>
      </div>

      <div className="flex gap-2" role="radiogroup" aria-label="Cómo armar los cruces">
        <button type="button" role="radio" aria-checked={mode === "auto"} onClick={() => setMode("auto")} className={optionClass(mode === "auto")}>
          <span className="block font-heading text-sm font-bold text-text-primary">Automático</span>
          <span className="mt-0.5 block font-body text-xs text-text-secondary">El mejor contra el peor clasificado</span>
        </button>
        <button type="button" role="radio" aria-checked={mode === "manual"} onClick={() => setMode("manual")} className={optionClass(mode === "manual")}>
          <span className="block font-heading text-sm font-bold text-text-primary">Elegir los cruces</span>
          <span className="mt-0.5 block font-body text-xs text-text-secondary">Defines quién juega contra quién</span>
        </button>
      </div>

      {mode === "auto" ? (
        <ul className="flex flex-col gap-2">
          {autoPairs.map(([home, away], i) => (
            <li key={i} className="rounded-xl border border-border-primary p-3">
              <PairLine row={home} seed={byId.get(home.clubId)?.seed ?? 0} />
              <PairLine row={away} seed={byId.get(away.clubId)?.seed ?? 0} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-2">
          {pairs.map((pair, i) => (
            <fieldset key={i} className="rounded-xl border border-border-primary p-3">
              <legend className="px-1 font-body text-xs text-text-secondary">Cruce {i + 1}</legend>
              <div className="flex flex-col gap-2">
                {([0, 1] as const).map((slot) => (
                  <select
                    key={slot}
                    value={pair[slot]}
                    onChange={(e) => setSlot(i, slot, e.target.value)}
                    aria-label={`Cruce ${i + 1}, equipo ${slot + 1}`}
                    className="w-full cursor-pointer rounded border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary focus:border-text-primary focus:outline-none"
                  >
                    <option value="">Elige un equipo</option>
                    {qualified.map((r, idx) => (
                      <option key={r.clubId} value={r.clubId} disabled={chosen.includes(r.clubId) && pair[slot] !== r.clubId}>
                        {idx + 1}.º {r.clubName}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="font-body text-sm text-brand-900">
          {error}
        </p>
      )}
      <button onClick={build} disabled={!canBuild || building} className={`${btnSolid} w-full`}>
        {building && <Spinner size={16} label="Armando las llaves" />}
        {building ? "Armando..." : "Armar las llaves"}
      </button>
    </div>
  );
}

function PairLine({ row, seed }: { row: StandingsRow; seed: number }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <span className="w-6 shrink-0 text-center font-heading text-xs font-bold text-text-secondary">{seed}.º</span>
      <ClubCrest club={{ shortName: row.shortName, logoUrl: row.logoUrl, color: row.color }} size="h-6 w-6" textSize="text-[10px]" />
      <span className="flex-1 truncate font-body text-sm text-text-primary">{row.clubName}</span>
    </div>
  );
}
