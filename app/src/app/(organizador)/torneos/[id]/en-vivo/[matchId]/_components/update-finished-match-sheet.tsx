"use client";

import { useState } from "react";
import { Sheet } from "@/_components/sheet";
import { btnOutline, btnSolid } from "@/_components/button-styles";
import { directResultProblem, walkoverScore, type Walkover } from "@/_lib/walkover";

const field =
  "w-full rounded border border-transparent bg-btn-regular px-3 py-3 font-body text-base text-text-primary transition-colors hover:border-border-primary hover:bg-surface-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none disabled:opacity-60";
const label = "mb-1.5 block font-heading text-xs font-semibold text-text-primary";

export type DirectResult = {
  homeScore: number;
  awayScore: number;
  /** Solo en un empate de un cuadro de eliminación: el club que avanza y, opcionalmente, los penales. */
  winnerTeamId?: string;
  penaltyHomeScore?: number;
  penaltyAwayScore?: number;
};

type Team = { id: string; name: string };
type Step = "menu" | "score" | "walkover" | "manual";

const OPTIONS: { step: Exclude<Step, "menu">; title: string; hint: string }[] = [
  { step: "manual", title: "Registrar jugadas manualmente", hint: "Cada gol y tarjeta con el minuto que escribes, sin cronómetro." },
  { step: "score", title: "Ingresar solo el marcador", hint: "Solo el resultado final del partido, sea cual sea." },
  { step: "walkover", title: "W.O.", hint: "Un equipo no se presentó (o ninguno de los dos)." },
];

/** Un número entero ≥ 0 escrito en un campo; null si está vacío o no sirve. */
const count = (value: string): number | null => (/^\d{1,3}$/.test(value.trim()) ? Number(value) : null);

/**
 * «Actualizar partido finalizado» (especificación 019): lo que se hace con un partido que ya se jugó (o no se jugó) y todavía
 * no empezó en el sistema. Tres caminos: cargar las jugadas a mano, ingresar solo el marcador, o marcarlo W.O. Cada uno
 * habla con `PATCH /api/matches/:id` a través de `onManual`, `onScore` y `onWalkover`, que devuelven si salió bien (la
 * pantalla ya muestra el error). Solo el organizador y el admin lo ven.
 */
export function UpdateFinishedMatchSheet({
  home,
  away,
  decisive,
  saving,
  error,
  onManual,
  onScore,
  onWalkover,
  onClose,
}: {
  home: Team;
  away: Team;
  /** Un partido de un cuadro de eliminación: no puede terminar empatado. */
  decisive: boolean;
  saving: boolean;
  error: string;
  onManual: () => Promise<boolean>;
  onScore: (result: DirectResult) => Promise<boolean>;
  onWalkover: (walkover: Walkover) => Promise<boolean>;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("menu");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [winner, setWinner] = useState<"home" | "away" | "">("");
  const [penHome, setPenHome] = useState("");
  const [penAway, setPenAway] = useState("");
  const [woPick, setWoPick] = useState<Walkover | "">("");

  const title = step === "menu" ? "Actualizar partido finalizado" : OPTIONS.find((o) => o.step === step)?.title ?? "";
  const back = (
    <button type="button" onClick={() => setStep("menu")} disabled={saving} className="mb-3 cursor-pointer font-body text-xs text-text-secondary underline disabled:opacity-40">
      ← Otras opciones
    </button>
  );

  // ─── Solo marcador ───
  const h = count(homeScore);
  const a = count(awayScore);
  const tied = h !== null && a !== null && h === a;
  const needsWinner = decisive && tied;
  const ph = count(penHome);
  const pa = count(penAway);
  const penaltiesTyped = penHome.trim() !== "" || penAway.trim() !== "";
  const penaltyBad = needsWinner && ((penHome.trim() !== "" && ph === null) || (penAway.trim() !== "" && pa === null));
  const scoreProblem =
    h === null || a === null
      ? "Escribe el marcador de los dos equipos"
      : penaltyBad
        ? "Los penales deben ser números enteros"
        : directResultProblem({
            decisive,
            homeScore: h,
            awayScore: a,
            winner: needsWinner && winner ? winner : null,
            penaltyHome: needsWinner ? ph : null,
            penaltyAway: needsWinner ? pa : null,
          });

  async function saveScore() {
    if (h === null || a === null || scoreProblem || saving) return;
    const result: DirectResult = { homeScore: h, awayScore: a };
    if (needsWinner) {
      result.winnerTeamId = winner === "home" ? home.id : away.id;
      if (penaltiesTyped && ph !== null && pa !== null) {
        result.penaltyHomeScore = ph;
        result.penaltyAwayScore = pa;
      }
    }
    if (await onScore(result)) onClose();
  }

  // ─── W.O. ───
  const woChoices: { value: Walkover; label: string }[] = [
    { value: "home", label: `Se presentó ${home.name}` },
    { value: "away", label: `Se presentó ${away.name}` },
    ...(decisive ? [] : [{ value: "both" as const, label: "Ninguno se presentó" }]),
  ];
  const woResult = woPick ? walkoverScore(woPick) : null;

  async function saveWalkover() {
    if (!woPick || saving) return;
    if (await onWalkover(woPick)) onClose();
  }

  async function startManual() {
    if (saving) return;
    if (await onManual()) onClose();
  }

  return (
    <Sheet title={title} onClose={onClose}>
      <div className="flex flex-col gap-3 pb-1">
        {step === "menu" && (
          <>
            <p className="font-body text-sm text-text-secondary">Elige cómo quieres cargar este partido.</p>
            {OPTIONS.map((o) => (
              <button
                key={o.step}
                type="button"
                onClick={() => setStep(o.step)}
                className="flex min-h-14 w-full cursor-pointer flex-col items-start rounded-xl border border-border-primary px-4 py-3 text-left transition-colors hover:bg-btn-regular focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
              >
                <span className="font-heading text-sm font-bold text-text-primary">{o.title}</span>
                <span className="font-body text-xs text-text-secondary">{o.hint}</span>
              </button>
            ))}
          </>
        )}

        {step === "manual" && (
          <>
            {back}
            <p className="font-body text-sm text-text-primary">
              Se abre la pantalla de jugadas de siempre, pero <strong>sin cronómetro</strong>: al registrar un gol o una tarjeta escribes el minuto en que ocurrió. El marcador sale de los goles y al terminar pulsas «Finalizar partido».
            </p>
            <button type="button" onClick={startManual} disabled={saving} className={`${btnSolid} w-full`}>
              Empezar a registrar jugadas
            </button>
          </>
        )}

        {step === "score" && (
          <>
            {back}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="direct-home" className={label}>{home.name}</label>
                <input id="direct-home" inputMode="numeric" autoComplete="off" maxLength={3} value={homeScore} onChange={(e) => setHomeScore(e.target.value)} placeholder="0" className={field} />
              </div>
              <div>
                <label htmlFor="direct-away" className={label}>{away.name}</label>
                <input id="direct-away" inputMode="numeric" autoComplete="off" maxLength={3} value={awayScore} onChange={(e) => setAwayScore(e.target.value)} placeholder="0" className={field} />
              </div>
            </div>

            {needsWinner && (
              <div role="group" aria-label="Quién avanza" className="rounded-xl bg-btn-regular p-3">
                <p className="font-heading text-sm font-bold text-text-primary">Empate en un cruce de eliminación</p>
                <p className="mb-2 mt-0.5 font-body text-xs text-text-secondary">Este partido no puede terminar empatado: elige quién avanza.</p>
                <div className="flex gap-2">
                  {([["home", home.name], ["away", away.name]] as const).map(([side, name]) => (
                    <button
                      key={side}
                      type="button"
                      onClick={() => setWinner(side)}
                      aria-pressed={winner === side}
                      className={`min-h-11 flex-1 cursor-pointer rounded-lg px-2 font-heading text-xs font-bold leading-tight transition-colors ${winner === side ? "bg-surface-secondary text-text-invert" : "border border-border-primary text-text-primary"}`}
                    >
                      Avanza {name}
                    </button>
                  ))}
                </div>
                <p className="mb-1.5 mt-3 font-heading text-xs font-semibold text-text-primary">Penales (opcional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <input aria-label={`Penales de ${home.name}`} inputMode="numeric" autoComplete="off" maxLength={3} value={penHome} onChange={(e) => setPenHome(e.target.value)} placeholder="—" className={field} />
                  <input aria-label={`Penales de ${away.name}`} inputMode="numeric" autoComplete="off" maxLength={3} value={penAway} onChange={(e) => setPenAway(e.target.value)} placeholder="—" className={field} />
                </div>
              </div>
            )}

            {h !== null && a !== null && (
              <p className="font-body text-xs text-text-secondary">
                Quedará {home.name} {h} - {a} {away.name}, finalizado y sin jugadas. Podrás reabrirlo para corregir.
              </p>
            )}
            {scoreProblem && (h !== null && a !== null) && (
              <p role="status" className="font-body text-xs text-text-secondary">{scoreProblem}</p>
            )}
            <button type="button" onClick={saveScore} disabled={saving || !!scoreProblem} className={`${btnSolid} w-full`}>
              Guardar resultado
            </button>
          </>
        )}

        {step === "walkover" && (
          <>
            {back}
            <div role="radiogroup" aria-label="Quién se presentó" className="flex flex-col gap-2">
              {woChoices.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={woPick === c.value}
                  onClick={() => setWoPick(c.value)}
                  className={`min-h-12 w-full cursor-pointer rounded-xl border px-4 py-3 text-left font-heading text-sm font-bold transition-colors ${woPick === c.value ? "border-text-primary bg-btn-regular text-text-primary ring-2 ring-text-primary" : "border-border-primary text-text-primary hover:bg-btn-regular"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {decisive && <p className="font-body text-xs text-text-secondary">En un cruce de eliminación alguien tiene que avanzar, así que no hay W.O. doble.</p>}
            {woResult && woPick && (
              <p className="font-body text-xs text-text-secondary">
                {woPick === "both"
                  ? "Quedará 0-0, con 0 puntos para los dos equipos."
                  : `Quedará ${woResult.home}-${woResult.away} para quien se presentó (3 puntos). Los goles cuentan en la tabla.`}{" "}
                Podrás deshacer el W.O.
              </p>
            )}
            <button type="button" onClick={saveWalkover} disabled={saving || !woPick} className={`${btnSolid} w-full`}>
              Marcar W.O.
            </button>
          </>
        )}

        {error && <p role="alert" className="font-body text-sm text-red-600">{error}</p>}
        {step === "menu" && (
          <button type="button" onClick={onClose} className={`${btnOutline} w-full`}>
            Cancelar
          </button>
        )}
      </div>
    </Sheet>
  );
}
