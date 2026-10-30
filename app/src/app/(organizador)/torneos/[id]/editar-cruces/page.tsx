"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/_lib/use-api";
import {
  canSave,
  changeTeam,
  changedMatches,
  findProblems,
  restingTeams,
  swapMatchdays,
  teamsByGroup,
  type EditableMatch,
  type EditResult,
} from "@/_lib/fixture-edit";
import { formatMatchDate, formatTime12 } from "@/_lib/match-format";
import { MoveMatchPanel } from "./_components/move-match-panel";

type Team = { id: string; name: string; shortName: string };
type Loaded = { matches: EditableMatch[]; teams: Team[] };

const BTN = "cursor-pointer rounded-lg border border-border-primary px-3 py-2 font-heading text-xs font-semibold text-text-primary transition-colors hover:bg-btn-regular disabled:cursor-not-allowed disabled:opacity-40";

/** "Sáb 3 Oct · 06:30 pm" o "Por definir". El día viene como `YYYY-MM-DD`. */
const when = (m: EditableMatch) => (m.time === "" ? "Por definir" : `${formatMatchDate(`${m.date}T00:00:00.000Z`)} · ${formatTime12(m.time)}`);

/**
 * Editar los cruces de un fixture armado (especificación 017): cambiar el equipo de un partido y mover un partido a
 * otra fecha. Todo se trabaja en un borrador en pantalla y se guarda de una vez, solo si ningún equipo juega dos veces
 * en una misma fecha.
 */
export default function EditarCrucesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: loaded, error: loadError } = useApi<Loaded>(async () => {
    const res = await fetch(`/api/tournaments/${id}/fixture/cruces`);
    if (!res.ok) throw new Error(res.status === 403 ? "Solo quien organiza el torneo puede editar sus cruces." : "No se pudo cargar el fixture.");
    return res.json();
  });
  // `base` es lo ya guardado (tras guardar, el borrador pasa a ser la base); `edits` es el borrador, o null si no hay cambios.
  const [base, setBase] = useState<EditableMatch[] | null>(null);
  const [edits, setEdits] = useState<EditableMatch[] | null>(null);
  const [group, setGroup] = useState<string>("");
  const [matchday, setMatchday] = useState<number | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const original = useMemo(() => base ?? loaded?.matches ?? [], [base, loaded]);
  const draft = edits ?? original;
  const teamName = useMemo(() => new Map((loaded?.teams ?? []).map((t) => [t.id, t.name])), [loaded]);
  const name = (teamId: string) => teamName.get(teamId) ?? "Equipo";
  const universe = useMemo(() => teamsByGroup(original), [original]);
  const groups = [...universe.keys()];
  const activeGroup = groups.includes(group) ? group : (groups[0] ?? "");
  const groupName = activeGroup === "" ? null : activeGroup;
  const teams = universe.get(activeGroup) ?? new Set<string>();

  const groupDraft = draft.filter((m) => (m.groupName ?? "") === activeGroup);
  const matchdays = [...new Set(groupDraft.map((m) => m.matchday))].sort((a, b) => a - b);
  const activeDay = matchday !== null && matchdays.includes(matchday) ? matchday : (matchdays[0] ?? null);
  const dayMatches = groupDraft.filter((m) => m.matchday === activeDay);
  const resting = activeDay === null ? [] : restingTeams(draft, teams, activeDay, groupName);

  const problems = findProblems(draft);
  const twice = problems.filter((p) => p.kind === "twice");
  const repeated = problems.filter((p) => p.kind === "repeated");
  const changes = changedMatches(original, draft);
  const dirty = changes.length > 0;
  const okToSave = dirty && canSave(draft);

  const apply = (result: EditResult) => {
    setSaved(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError("");
    setEdits(result.matches);
  };

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/tournaments/${id}/fixture/cruces`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matches: changes.map(({ id: matchId, matchday: day, homeTeamId, awayTeamId, date, time, location }) => ({ id: matchId, matchday: day, homeTeamId, awayTeamId, date, time, location })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar.");
        return;
      }
      // Lo guardado ya es lo que hay en pantalla: no hace falta volver a pedirlo.
      setBase(draft);
      setEdits(null);
      setSaved(true);
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  if (loadError) return <p role="alert" className="px-4 py-10 font-body text-sm text-red-600">{loadError}</p>;
  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }
  if (original.length === 0) {
    return (
      <div className="px-4 py-10">
        <p className="font-body text-sm text-text-secondary">Este torneo no tiene un fixture de liga o grupos para editar.</p>
        <button onClick={() => router.push(`/torneos/${id}`)} className={`${BTN} mt-4`}>Volver al torneo</button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col pb-28">
      <header className="px-4 py-3">
        <button onClick={() => router.back()} className="flex cursor-pointer items-center gap-1 font-heading text-base font-semibold text-text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180">
            <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver
        </button>
      </header>

      <div className="px-4">
        <h1 className="font-heading text-xl font-bold text-text-primary">Editar cruces</h1>
        <p className="mt-1 font-body text-sm text-text-secondary">
          Cambia un equipo o mueve un partido a otra fecha. Cada equipo juega una sola vez por fecha; los cambios se guardan juntos.
        </p>
      </div>

      {groups.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto px-4 no-scrollbar" role="tablist" aria-label="Grupo">
          {groups.map((g) => (
            <button
              key={g}
              role="tab"
              aria-selected={activeGroup === g}
              onClick={() => { setGroup(g); setMatchday(null); setMoving(null); }}
              className={`shrink-0 cursor-pointer rounded-lg px-4 py-2 font-heading text-xs font-semibold ${activeGroup === g ? "bg-surface-secondary text-text-invert" : "border border-border-primary text-text-primary"}`}
            >
              {g === "" ? "General" : g}
            </button>
          ))}
        </div>
      )}

      {/* Lo que hay que arreglar antes de guardar */}
      {twice.length > 0 && (
        <div role="alert" className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="font-heading text-sm font-bold text-red-800">Antes de guardar, arregla esto:</p>
          <ul className="mt-1 flex flex-col gap-1">
            {twice.map((p) => (
              <li key={`${p.groupName}-${p.matchday}-${p.teamId}`}>
                <button
                  onClick={() => { setGroup(p.groupName ?? ""); setMatchday(p.matchday); setMoving(null); }}
                  className="cursor-pointer text-left font-body text-sm text-red-800 underline"
                >
                  Fecha {p.matchday}: {name(p.teamId)} juega dos veces.
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 font-body text-xs text-red-800">Cambia el equipo de uno de esos partidos por otro que esa fecha descanse o juegue en otro partido.</p>
        </div>
      )}
      {repeated.length > 0 && (
        <div role="status" className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="font-heading text-sm font-bold text-amber-800">Revisa estos cruces (se pueden guardar):</p>
          <ul className="mt-1 list-disc pl-5">
            {repeated.map((p) => (
              <li key={p.matchIds.join("-")} className="font-body text-sm text-amber-800">
                {name(p.teamIds[0])} y {name(p.teamIds[1])} se enfrentan {p.matchIds.length} veces
                {" "}(fechas {p.matchIds.map((mid) => draft.find((m) => m.id === mid)?.matchday).join(" y ")}).
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fechas */}
      <div className="mt-4 flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar" role="tablist" aria-label="Fecha">
        {matchdays.map((day) => {
          const hasProblem = twice.some((p) => p.matchday === day && (p.groupName ?? "") === activeGroup);
          return (
            <button
              key={day}
              role="tab"
              aria-selected={activeDay === day}
              onClick={() => { setMatchday(day); setMoving(null); }}
              className={`shrink-0 cursor-pointer rounded-lg px-4 py-2 font-heading text-xs font-semibold ${activeDay === day ? "bg-surface-secondary text-text-invert" : "border border-border-primary text-text-primary"}`}
            >
              Fecha {day}
              {hasProblem && <span aria-label="con problemas" className="ml-1.5 inline-block h-2 w-2 rounded-full bg-red-500 align-middle" />}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 px-4">
        {dayMatches.map((m) => {
          const options = [...teams].sort((a, b) => name(a).localeCompare(name(b), "es"));
          const before = original.find((o) => o.id === m.id);
          const modified = !!before && changedMatches([before], [m]).length > 0;
          return (
            <div key={m.id} className={`rounded-xl border p-3 ${modified ? "border-brand-500" : "border-border-primary"}`}>
              <div className="flex items-center justify-between">
                <span className="font-body text-xs text-text-secondary">{when(m)}{m.location ? ` · ${m.location}` : ""}</span>
                {m.locked ? (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">Ya empezó</span>
                ) : modified ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Modificado</span>
                ) : null}
              </div>

              <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                {(["home", "away"] as const).map((side, i) => (
                  <div key={side} className={i === 1 ? "order-3" : ""}>
                    <label className="sr-only" htmlFor={`${m.id}-${side}`}>{side === "home" ? "Local" : "Visitante"}</label>
                    <select
                      id={`${m.id}-${side}`}
                      value={side === "home" ? m.homeTeamId : m.awayTeamId}
                      disabled={m.locked}
                      onChange={(e) => apply(changeTeam(draft, m.id, side, e.target.value))}
                      className="w-full rounded-lg border border-border-primary bg-surface-primary px-2 py-2.5 font-body text-sm text-text-primary disabled:opacity-60"
                    >
                      {options.map((t) => <option key={t} value={t}>{name(t)}</option>)}
                    </select>
                  </div>
                ))}
                <span className="order-2 font-heading text-xs font-bold text-text-secondary">vs</span>
              </div>

              {!m.locked && (
                <button onClick={() => setMoving(moving === m.id ? null : m.id)} aria-expanded={moving === m.id} className={`${BTN} mt-3`}>
                  Mover a otra fecha
                </button>
              )}
              {moving === m.id && (
                <MoveMatchPanel
                  match={m}
                  candidates={groupDraft.filter((o) => o.matchday !== m.matchday && !o.locked)}
                  name={name}
                  when={when}
                  onSwap={(otherId) => { apply(swapMatchdays(draft, m.id, otherId)); setMoving(null); }}
                  onCancel={() => setMoving(null)}
                />
              )}
            </div>
          );
        })}

        {resting.length > 0 && (
          <p className="rounded-xl bg-btn-regular px-4 py-3 font-body text-sm text-text-primary">
            <strong>Descansa:</strong> {resting.map(name).join(", ")}
          </p>
        )}
      </div>

      <p className="mt-4 px-4 font-body text-xs text-text-secondary">
        Al elegir un equipo que ya juega esta fecha, ese partido recibe al que salió. Si el que elijas descansa, pasa a descansar el que salió.
      </p>

      {/* Guardar */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border-primary bg-surface-primary px-4 py-3">
        <div className="mx-auto flex max-w-[672px] flex-col gap-2">
          {error && <p role="alert" className="font-body text-sm text-red-600">{error}</p>}
          {saved && !dirty && <p role="status" className="font-body text-sm font-semibold text-text-primary">Cambios guardados.</p>}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={!okToSave || saving}
              className="flex-1 cursor-pointer rounded-lg bg-surface-secondary py-3 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Guardando..." : dirty ? `Guardar cambios (${changes.length} ${changes.length === 1 ? "partido" : "partidos"})` : "Guardar cambios"}
            </button>
            <button onClick={() => { setEdits(null); setError(""); setMoving(null); }} disabled={!dirty || saving} className={BTN}>
              Descartar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
