"use client";

import { useState } from "react";
import type { MatchListItem } from "@/_lib/api";

type TeamOption = { id: string; name: string; groupName: string | null };

const field =
  "w-full rounded border border-transparent bg-btn-regular px-3 py-3 font-body text-sm text-text-primary transition-colors hover:border-border-primary hover:bg-surface-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none disabled:opacity-60";
const label = "mb-1.5 block font-heading text-xs font-semibold text-text-primary";

const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Hoja para programar los partidos de un torneo que ya empezó: agregar uno (por ejemplo los de
 * una fecha que todavía no existe) o editar uno pendiente — equipos, día, hora y sede — o
 * quitarlo. Habla con POST /api/matches, PATCH y DELETE /api/matches/:id; los choques de horario
 * y las demás reglas las valida el servidor y se muestran tal cual.
 */
export function MatchEditor({
  tournamentId,
  teams,
  matches,
  defaultLocation,
  match,
  onClose,
  onSaved,
}: {
  tournamentId: string;
  teams: TeamOption[];
  matches: MatchListItem[];
  defaultLocation: string;
  /** El partido a editar; sin él, se agrega uno nuevo. */
  match: MatchListItem | null;
  onClose: () => void;
  /** Se llama tras guardar o quitar, para que la pantalla vuelva a pedir los partidos. Con
   * `close: false` ("guardar y agregar otro") la hoja sigue abierta. */
  onSaved: (message: string, close?: boolean) => void;
}) {
  const editing = match !== null;
  const lastMatchday = matches.reduce((max, m) => Math.max(max, m.matchday), 0);

  const [matchday, setMatchday] = useState(match?.matchday ?? lastMatchday + 1);
  const [homeId, setHomeId] = useState(match?.homeTeamId ?? "");
  const [awayId, setAwayId] = useState(match?.awayTeamId ?? "");
  const [tbd, setTbd] = useState(match ? match.time === "" : false);
  const [date, setDate] = useState(match && match.time !== "" ? match.date.slice(0, 10) : todayYmd());
  const [time, setTime] = useState(match && match.time !== "" ? match.time : "");
  const [location, setLocation] = useState(match ? match.location : defaultLocation);
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState("");

  const matchdays = [...new Set(matches.map((m) => m.matchday))].sort((a, b) => a - b);

  async function send(url: string, method: "POST" | "PATCH", body: Record<string, unknown>) {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "No se pudo guardar el partido");
  }

  function validate() {
    if (!homeId || !awayId) return "Elige los dos equipos.";
    if (homeId === awayId) return "El equipo local y el visitante deben ser distintos.";
    if (!tbd && (!date || !time)) return "Elige el día y la hora, o marca \"Por definir\".";
    return "";
  }

  async function save(addAnother: boolean) {
    if (saving) return;
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setError("");
    setSaving(true);
    try {
      // "Por definir": sin hora; el día se conserva (en un partido nuevo, hoy) y la pantalla lo ignora.
      const schedule = { date: tbd ? (match ? match.date.slice(0, 10) : todayYmd()) : date, time: tbd ? "" : time, location: location.trim() };
      if (match) {
        await send(`/api/matches/${match.id}`, "PATCH", { homeTeamId: homeId, awayTeamId: awayId, ...schedule });
        onSaved("Partido actualizado.");
      } else {
        const home = teams.find((t) => t.id === homeId);
        const away = teams.find((t) => t.id === awayId);
        await send("/api/matches", "POST", {
          tournamentId,
          homeTeamId: homeId,
          awayTeamId: awayId,
          matchday,
          // Con grupos, el cruce es del grupo de los dos equipos.
          groupName: home?.groupName && home.groupName === away?.groupName ? home.groupName : null,
          ...schedule,
        });
        if (addAnother) {
          setHomeId("");
          setAwayId("");
          onSaved("Partido agregado. Puedes cargar el siguiente.", false);
        } else {
          onSaved("Partido agregado.");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el partido");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!match || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/matches/${match.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "No se pudo quitar el partido");
      onSaved("Partido quitado.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo quitar el partido");
      setConfirmRemove(false);
    } finally {
      setSaving(false);
    }
  }

  const teamSelect = (value: string, onChange: (v: string) => void, other: string, id: string) => (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={saving} className={field}>
      <option value="">Elige un equipo</option>
      {teams.map((t) => (
        <option key={t.id} value={t.id} disabled={t.id === other}>
          {t.name}
        </option>
      ))}
    </select>
  );

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/40" onClick={() => !saving && onClose()} />
      <div className="fixed inset-x-0 bottom-0 z-[110]">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editing ? "Editar partido" : "Agregar partido"}
          className="mx-auto max-h-[92dvh] max-w-[430px] overflow-y-auto rounded-t-2xl bg-surface-primary px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5"
        >
          <div className="mb-4 flex justify-center">
            <div className="h-1 w-10 rounded-full bg-brand-300" />
          </div>
          <h3 className="mb-4 text-center font-heading text-lg font-bold text-text-primary">
            {editing ? "Editar partido" : "Agregar partido"}
          </h3>

          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="me-fecha" className={label}>Fecha del fixture</label>
              {editing ? (
                <p className="font-body text-sm text-text-secondary">Fecha {matchday}{match?.groupName ? ` · ${match.groupName}` : ""}</p>
              ) : (
                <select id="me-fecha" value={matchday} onChange={(e) => setMatchday(Number(e.target.value))} disabled={saving} className={field}>
                  {matchdays.map((d) => (
                    <option key={d} value={d}>Fecha {d}</option>
                  ))}
                  <option value={lastMatchday + 1}>Fecha {lastMatchday + 1} (nueva)</option>
                </select>
              )}
            </div>

            <div>
              <label htmlFor="me-local" className={label}>Local</label>
              {teamSelect(homeId, setHomeId, awayId, "me-local")}
            </div>
            <div>
              <label htmlFor="me-visita" className={label}>Visitante</label>
              {teamSelect(awayId, setAwayId, homeId, "me-visita")}
            </div>

            <label className="flex cursor-pointer items-center gap-2 font-body text-sm text-text-primary">
              <input type="checkbox" checked={tbd} onChange={(e) => setTbd(e.target.checked)} disabled={saving} className="h-4 w-4" />
              Día y hora por definir
            </label>

            {!tbd && (
              <div className="flex gap-3">
                <div className="min-w-0 flex-1">
                  <label htmlFor="me-dia" className={label}>Día</label>
                  <input id="me-dia" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={saving} className={field} />
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor="me-hora" className={label}>Hora</label>
                  <input id="me-hora" type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={saving} className={field} />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="me-sede" className={label}>Sede</label>
              <input
                id="me-sede"
                type="text"
                value={location}
                maxLength={200}
                onChange={(e) => setLocation(e.target.value)}
                disabled={saving}
                placeholder="Cancha o dirección"
                className={field}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-3 font-body text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="w-full cursor-pointer rounded-lg bg-surface-secondary py-3.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Agregar partido"}
            </button>
            {!editing && (
              <button
                onClick={() => save(true)}
                disabled={saving}
                className="w-full cursor-pointer rounded-lg border border-border-primary py-3 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular disabled:opacity-50"
              >
                Guardar y agregar otro
              </button>
            )}
            <button
              onClick={onClose}
              disabled={saving}
              className="w-full cursor-pointer py-2 font-heading text-sm font-bold text-text-primary disabled:opacity-50"
            >
              Cancelar
            </button>
            {editing &&
              (confirmRemove ? (
                <div className="rounded-lg bg-btn-regular p-3">
                  <p className="font-body text-sm text-text-primary">¿Quitar este partido del fixture? No se puede deshacer.</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={remove}
                      disabled={saving}
                      className="flex-1 cursor-pointer rounded-lg bg-red-600 py-2.5 font-heading text-sm font-bold text-white disabled:opacity-50"
                    >
                      Sí, quitar
                    </button>
                    <button
                      onClick={() => setConfirmRemove(false)}
                      disabled={saving}
                      className="flex-1 cursor-pointer rounded-lg border border-border-primary py-2.5 font-heading text-sm font-bold text-text-primary disabled:opacity-50"
                    >
                      No
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmRemove(true)}
                  disabled={saving}
                  className="w-full cursor-pointer py-2 font-heading text-xs font-bold text-red-600 underline disabled:opacity-50"
                >
                  Quitar partido
                </button>
              ))}
          </div>
        </div>
      </div>
    </>
  );
}
