"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { getTournament } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { planFixture, planBracket } from "@/_lib/fixture";
import { formatLabel, OPEN_STATUSES } from "@/_lib/tournament-labels";
import { btnSolid, btnOutline } from "@/_components/button-styles";
import { Spinner } from "@/_components/spinner";

const BRACKET_FORMATS = ["eliminacion", "relampago"];

export default function IniciarTorneoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [confirmMode, setConfirmMode] = useState<"auto" | "manual" | null>(null);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [day, setDay] = useState({ date: "", startTime: "09:00", endTime: "18:00" });
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const { data: tournament, loading } = useApi(() => getTournament(params.id));

  if (loading || !tournament) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const isBracket = BRACKET_FORMATS.includes(tournament.format);
  const isCopa = tournament.format === "copa";
  const started = !OPEN_STATUSES.includes(tournament.status);

  // Qué impide armar el fixture: ya empezó, faltan equipos, o (liga/grupos/la fase de
  // grupos de copa) el formato o los grupos no están listos.
  const teamIds = tournament.teams.map((t) => t.club.id);
  const groupPlan = isBracket
    ? null
    : planFixture(
        tournament.teams.map((t) => ({ id: t.club.id, groupName: t.groupName })),
        isCopa ? "grupos" : tournament.format
      );
  const bracket = isBracket ? planBracket(teamIds) : null;

  const blockReason = started
    ? "Este torneo ya empezó."
    : isBracket
      ? bracket && !bracket.ok
        ? bracket.error
        : null
      : groupPlan && !groupPlan.ok
        ? groupPlan.error
        : null;
  const missingTeams = Math.max(0, (tournament.maxTeams ?? 0) - tournament.teams.length);

  // Cuántos equipos entran directo a la ronda 2 (bye) por no alcanzar para un cuadro parejo:
  // los que no aparecen jugando la ronda 1.
  const round1Matches = bracket && bracket.ok ? bracket.matches.filter((m) => m.round === 1).length : 0;
  const byeCount = teamIds.length - round1Matches * 2;

  async function postFixture(body: Record<string, unknown>) {
    setError("");
    setStarting(true);
    try {
      const res = await fetch(`/api/tournaments/${params.id}/fixture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar el torneo");
        return false;
      }
      return true;
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
      return false;
    } finally {
      setStarting(false);
    }
  }

  async function start() {
    if (!confirmMode || starting) return;
    // liga/grupos/copa con programación automática: se define fecha por fecha en la
    // pantalla siguiente, ahí se crea el fixture.
    if (confirmMode === "auto" && !isBracket) {
      setConfirmMode(null);
      router.push(`/torneos/${params.id}/fixture`);
      return;
    }
    // Todo lo demás (manual, y el cuadro de eliminación siempre) crea los partidos ahora.
    const ok = await postFixture({ mode: "manual" });
    setConfirmMode(null);
    if (!ok) return;
    router.push(isBracket ? `/torneos/${params.id}` : `/torneos/${params.id}/manual`);
  }

  async function startRelampagoAuto() {
    if (!day.date || starting) return;
    const ok = await postFixture({ mode: "auto", day });
    if (!ok) return;
    setShowDayPicker(false);
    router.push(`/torneos/${params.id}`);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Title */}
      <div className="flex items-center gap-2 px-4 pt-4 mb-4">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-text-primary">
          <path
            d="M5.5 2.5h11v5a5.5 5.5 0 01-11 0v-5zM4.5 3.5H2.5a.5.5 0 00-.5.5v1.5A3 3 0 005 8.5h.5M17.5 3.5h2a.5.5 0 01.5.5v1.5A3 3 0 0117 8.5h-.5M8.5 13.5v2.5M13.5 13.5v2.5M7.5 16h7a1 1 0 011 1v1.5h-9V17a1 1 0 011-1z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h1 className="font-heading text-xl font-bold text-text-primary">Fixture</h1>
      </div>

      {/* Tournament info pill */}
      <div className="mx-4 mb-6 rounded-xl border border-border-primary p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red/10">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 2h8v4a4 4 0 01-8 0V2zM3 3H1.5a.5.5 0 00-.5.5v1a2 2 0 002 2H3M13 3h1.5a.5.5 0 01.5.5v1a2 2 0 01-2 2h-.5M6 10v2M10 10v2M5 12h6a1 1 0 011 1v1H4v-1a1 1 0 011-1z"
                stroke="var(--color-red)"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-sm font-bold text-text-primary">
              {tournament.name}
            </p>
            <p className="font-body text-xs text-text-secondary">
              {tournament._count.teams} equipos | {formatLabel(tournament.format)} | {tournament.category || "Libre"}
              {" "}
              <span className="inline-flex items-center rounded-full bg-verification px-1.5 py-0.5 text-[10px] font-bold text-text-primary">
                Activo
              </span>
            </p>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-text-secondary">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Illustration */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-6">
          <svg width="220" height="160" viewBox="0 0 220 160" fill="none">
            {/* Football field */}
            <rect x="30" y="40" width="160" height="100" rx="8" fill="#E6FFF5" stroke="#00CA81" strokeWidth="1.5" />
            <line x1="110" y1="40" x2="110" y2="140" stroke="#00CA81" strokeWidth="1" strokeDasharray="4 3" />
            <circle cx="110" cy="90" r="20" stroke="#00CA81" strokeWidth="1" fill="none" />
            <circle cx="110" cy="90" r="2" fill="#00CA81" />
            {/* Goal lines */}
            <rect x="30" y="70" width="12" height="40" rx="2" stroke="#00CA81" strokeWidth="1" fill="none" />
            <rect x="178" y="70" width="12" height="40" rx="2" stroke="#00CA81" strokeWidth="1" fill="none" />

            {/* Player left — kicking */}
            <circle cx="75" cy="58" r="10" fill="#FFCDD2" />
            <rect x="67" y="68" width="16" height="30" rx="3" fill="#FF6363" />
            <rect x="69" y="98" width="6" height="22" fill="#1B1B1B" rx="2" />
            <rect x="79" y="98" width="6" height="22" fill="#1B1B1B" rx="2" />
            {/* Arms */}
            <rect x="59" y="70" width="8" height="18" rx="3" fill="#FF6363" transform="rotate(-15 59 70)" />
            <rect x="83" y="68" width="8" height="18" rx="3" fill="#FF6363" transform="rotate(20 83 68)" />

            {/* Football */}
            <circle cx="108" cy="42" r="12" fill="white" stroke="#1B1B1B" strokeWidth="1.5" />
            <path d="M108 30l3 5h-6l3-5zM100 38l5 3-2 5-5-3 2-5zM116 38l-5 3 2 5 5-3-2-5zM103 49l5-3 5 3-2 5h-6l-2-5z" fill="#1B1B1B" />

            {/* Player right — celebrating */}
            <circle cx="152" cy="58" r="10" fill="#BBDEFB" />
            <rect x="144" y="68" width="16" height="30" rx="3" fill="#7C3AED" />
            <rect x="146" y="98" width="6" height="22" fill="#1B1B1B" rx="2" />
            <rect x="156" y="98" width="6" height="22" fill="#1B1B1B" rx="2" />
            {/* Arms up */}
            <rect x="136" y="56" width="8" height="22" rx="3" fill="#7C3AED" transform="rotate(-25 136 56)" />
            <rect x="160" y="54" width="8" height="22" rx="3" fill="#7C3AED" transform="rotate(25 160 54)" />

            {/* Confetti */}
            <rect x="40" y="10" width="6" height="6" rx="1" fill="#FFD039" transform="rotate(15 40 10)" />
            <rect x="90" y="5" width="5" height="5" rx="1" fill="#FF6363" transform="rotate(-10 90 5)" />
            <rect x="140" y="8" width="6" height="6" rx="1" fill="#00CA81" transform="rotate(25 140 8)" />
            <rect x="180" y="15" width="5" height="5" rx="1" fill="#1565C0" transform="rotate(-15 180 15)" />
            <circle cx="65" cy="8" r="3" fill="#7C3AED" />
            <circle cx="170" cy="3" r="3" fill="#FFD039" />
          </svg>
        </div>

        <h2 className="font-heading text-xl font-bold text-text-primary mb-2">
          El torneo ya puede empezar
        </h2>
        <p className="font-body text-sm text-text-secondary leading-relaxed max-w-[280px] mb-2">
          {blockReason ?? (isCopa ? "Arma primero la fase de grupos; el cuadro se arma después, cuando termine." : "Crea el fixture del torneo y que empiece esta fiesta deportiva.")}
        </p>
        {!blockReason && isBracket && bracket?.ok && (
          <p className="font-body text-xs text-text-secondary leading-relaxed max-w-[280px] mb-8">
            El cuadro tendrá {bracket.totalRounds} {bracket.totalRounds === 1 ? "ronda" : "rondas"}
            {byeCount > 0 ? ` y ${byeCount} ${byeCount === 1 ? "equipo pasa" : "equipos pasan"} directo a la siguiente ronda por no completar el cuadro` : ""}.
          </p>
        )}
        <div className="mt-6 flex w-full flex-col gap-3">
          {error && <p className="font-body text-sm text-red-600">{error}</p>}
          {tournament.status === "en_curso" && (
            <Link
              href={`/torneos/${params.id}/partidos`}
              className="flex w-full items-center justify-center rounded-lg bg-surface-secondary py-3 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700"
            >
              Ver fixture
            </Link>
          )}

          {isBracket ? (
            tournament.format === "relampago" ? (
              <>
                <button
                  onClick={() => setShowDayPicker(true)}
                  disabled={blockReason !== null}
                  className={`${btnSolid} w-full disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  Programación automática (un solo día)
                </button>
                <button
                  onClick={() => setConfirmMode("manual")}
                  disabled={blockReason !== null}
                  className={`${btnOutline} w-full disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  Programación manual
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmMode("manual")}
                disabled={blockReason !== null}
                className={`${btnSolid} w-full disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Armar el cuadro
              </button>
            )
          ) : (
            <>
              <button
                onClick={() => setConfirmMode("auto")}
                disabled={blockReason !== null}
                className={`${btnSolid} w-full disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Programación automática
              </button>
              <button
                onClick={() => setConfirmMode("manual")}
                disabled={blockReason !== null}
                className={`${btnOutline} w-full disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Programación manual
              </button>
            </>
          )}
          <Link
            href="/crear-torneo"
            className="mt-1 flex items-center justify-center font-heading text-sm font-semibold text-text-primary underline underline-offset-2"
          >
            Editar bases de torneo
          </Link>
        </div>
      </div>

      {/* Confirmation bottom sheet */}
      {confirmMode && (
        <>
          <div className="fixed inset-0 z-[110] bg-black/40" onClick={() => setConfirmMode(null)} />
          <div className="fixed inset-x-0 bottom-0 z-[110] mx-auto max-w-[430px] animate-slide-up rounded-t-2xl bg-surface-primary px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6">
            <h3 className="text-center font-heading text-lg font-bold text-text-primary mb-3">
              ¿Seguro que deseas iniciar el torneo?
            </h3>
            <p className="mb-6 text-center font-body text-sm text-text-secondary">
              {missingTeams > 0
                ? `Faltan ${missingTeams} ${missingTeams === 1 ? "equipo" : "equipos"} para completar el cupo. `
                : ""}
              Al iniciar ya no podrás agregar ni quitar equipos.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmMode(null)}
                className="flex-1 cursor-pointer rounded-lg border border-border-primary py-3 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular"
              >
                Cancelar
              </button>
              <button onClick={start} disabled={starting} className={`${btnSolid} flex-1`}>
                {starting && <Spinner size={16} label="Iniciando" />}
                {starting ? "Iniciando..." : "Iniciar"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Relámpago: elegir el día */}
      {showDayPicker && (
        <>
          <div className="fixed inset-0 z-[110] bg-black/40" onClick={() => !starting && setShowDayPicker(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[110] mx-auto max-w-[430px] animate-slide-up rounded-t-2xl bg-surface-primary px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6">
            <h3 className="text-center font-heading text-lg font-bold text-text-primary mb-1">¿Qué día se juega?</h3>
            <p className="mb-5 text-center font-body text-sm text-text-secondary">
              Todos los partidos del cuadro se programan ese día, uno detrás de otro.
            </p>
            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label htmlFor="rel-date" className="mb-1.5 block font-heading text-sm font-semibold text-text-primary">
                  Fecha
                </label>
                <input
                  id="rel-date"
                  type="date"
                  value={day.date}
                  onChange={(e) => setDay((d) => ({ ...d, date: e.target.value }))}
                  className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-3 font-body text-base text-text-primary focus:border-text-primary focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="rel-start" className="mb-1.5 block font-heading text-sm font-semibold text-text-primary">
                    Desde
                  </label>
                  <input
                    id="rel-start"
                    type="time"
                    value={day.startTime}
                    onChange={(e) => setDay((d) => ({ ...d, startTime: e.target.value }))}
                    className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-3 font-body text-base text-text-primary focus:border-text-primary focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="rel-end" className="mb-1.5 block font-heading text-sm font-semibold text-text-primary">
                    Hasta
                  </label>
                  <input
                    id="rel-end"
                    type="time"
                    value={day.endTime}
                    onChange={(e) => setDay((d) => ({ ...d, endTime: e.target.value }))}
                    className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-3 font-body text-base text-text-primary focus:border-text-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>
            {error && (
              <p role="alert" className="mb-3 font-body text-sm text-brand-900">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDayPicker(false)}
                disabled={starting}
                className="flex-1 cursor-pointer rounded-lg border border-border-primary py-3 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular disabled:opacity-40"
              >
                Cancelar
              </button>
              <button onClick={startRelampagoAuto} disabled={starting || !day.date} className={`${btnSolid} flex-1 disabled:opacity-40`}>
                {starting && <Spinner size={16} label="Armando el cuadro" />}
                {starting ? "Armando..." : "Armar el cuadro"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
