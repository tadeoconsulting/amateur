"use client";

import type { MatchEventItem, MatchTeamRef } from "@/_lib/api";
import { penaltyWinner } from "@/_lib/fixture";
import { Spinner } from "@/_components/spinner";

type Attempt = { scored: boolean };

function attemptsFor(events: MatchEventItem[], teamId: string): Attempt[] {
  return events
    .filter((e) => e.type === "penal_definicion" && e.teamId === teamId)
    .map((e) => ({ scored: e.scored === true }));
}

/** Una tira de intentos: al menos 5 espacios, y más si la tanda ya sigue en muerte súbita. */
function AttemptRow({ attempts, minSlots }: { attempts: Attempt[]; minSlots: number }) {
  const slots = Math.max(minSlots, attempts.length);
  return (
    <div className="flex flex-wrap gap-1.5" role="list" aria-label="Intentos">
      {Array.from({ length: slots }, (_, i) => {
        const a = attempts[i];
        return (
          <div
            key={i}
            role="listitem"
            aria-label={a === undefined ? "Sin patear" : a.scored ? "Convirtió" : "Erró"}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
              a === undefined
                ? "border-border-primary text-transparent"
                : a.scored
                  ? "border-verification bg-verification/20 text-brand-900"
                  : "border-error bg-error/15 text-brand-900"
            }`}
          >
            {a === undefined ? "" : a.scored ? "✓" : "✗"}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Tanda de penales (especificación 007): reemplaza al selector de acciones mientras el
 * partido está en fase "penales". Cada intento es un evento `penal_definicion`; el
 * organizador elige el equipo (mismo selector Local/Visitante de arriba) y si convirtió o
 * erró. No hace falta alternar en un orden estricto: se registra lo que realmente pasó.
 */
export function PenaltyShootout({
  homeTeam,
  awayTeam,
  activeTeam,
  events,
  penaltyHomeScore,
  penaltyAwayScore,
  saving,
  onKick,
  onUndo,
}: {
  homeTeam: MatchTeamRef;
  awayTeam: MatchTeamRef;
  activeTeam: "local" | "visitante";
  events: MatchEventItem[];
  penaltyHomeScore: number | null;
  penaltyAwayScore: number | null;
  saving: boolean;
  onKick: (scored: boolean) => void;
  onUndo: () => void;
}) {
  const homeAttempts = homeTeam ? attemptsFor(events, homeTeam.id) : [];
  const awayAttempts = awayTeam ? attemptsFor(events, awayTeam.id) : [];
  const homeScored = penaltyHomeScore ?? 0;
  const awayScored = penaltyAwayScore ?? 0;
  const decided = penaltyWinner(homeScored, homeAttempts.length - homeScored, awayScored, awayAttempts.length - awayScored);
  const activeTeamName = (activeTeam === "local" ? homeTeam?.name : awayTeam?.name) ?? "el equipo";

  return (
    <div className="flex-1 px-4">
      <p className="mb-4 text-center font-heading text-sm font-bold text-text-primary">Tanda de penales</p>

      <div className="mb-6 flex flex-col gap-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="truncate font-body text-sm text-text-primary">{homeTeam?.name ?? "Por definir"}</span>
            <span className="font-heading text-base font-bold tabular-nums text-text-primary">{homeScored}</span>
          </div>
          <AttemptRow attempts={homeAttempts} minSlots={5} />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="truncate font-body text-sm text-text-primary">{awayTeam?.name ?? "Por definir"}</span>
            <span className="font-heading text-base font-bold tabular-nums text-text-primary">{awayScored}</span>
          </div>
          <AttemptRow attempts={awayAttempts} minSlots={5} />
        </div>
      </div>

      {decided ? (
        <p role="status" className="mb-4 rounded-lg bg-verification/15 px-3 py-2.5 text-center font-body text-sm font-semibold text-brand-900">
          {decided === "home" ? homeTeam?.name : awayTeam?.name} ya ganó la tanda. Puedes finalizar el partido.
        </p>
      ) : (
        <p className="mb-4 text-center font-body text-sm text-text-secondary">
          Registra el intento de <span className="font-semibold text-text-primary">{activeTeamName}</span> (elige el equipo arriba).
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => onKick(false)}
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border-primary py-3.5 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving && <Spinner size={16} label="Guardando" />}
          Erró
        </button>
        <button
          onClick={() => onKick(true)}
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-surface-secondary py-3.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving && <Spinner size={16} label="Guardando" />}
          Convirtió
        </button>
      </div>

      {(homeAttempts.length > 0 || awayAttempts.length > 0) && (
        <button
          onClick={onUndo}
          disabled={saving}
          className="mx-auto mt-4 block cursor-pointer font-heading text-xs font-semibold text-text-secondary underline disabled:opacity-40"
        >
          Deshacer último intento
        </button>
      )}
    </div>
  );
}
