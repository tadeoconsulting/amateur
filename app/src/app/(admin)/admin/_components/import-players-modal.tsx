"use client";

import { useEffect, useRef, useState } from "react";

interface TournamentOption {
  id: string;
  name: string;
  teamsCount: number;
  organizer?: { firstName: string; lastName: string };
}

interface ReviewRow {
  row: number;
  status: "create" | "loaded" | "problem";
  firstName: string;
  lastName: string;
  dni: string | null;
  club: string;
  birthDate: string | null;
  minor: boolean;
  reason: string | null;
}

interface Review {
  tournament: { id: string; name: string };
  totals: { rows: number; create: number; loaded: number; problems: number; minors: number; byClub: Record<string, number> };
  rows: ReviewRow[];
}

const dmy = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");

/** Un CSV de Excel en español puede venir en Windows-1252 en vez de UTF-8: se prueba UTF-8 y, si no sirve, se lee así. */
async function readText(file: File) {
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

const STATUS = {
  create: { label: "Crear", tone: "bg-green-100 text-green-800", mark: "✓" },
  loaded: { label: "Ya cargado", tone: "bg-gray-100 text-gray-700", mark: "=" },
  problem: { label: "Problema", tone: "bg-red-100 text-red-800", mark: "!" },
} as const;

/**
 * Importador de jugadores provisionales (especificación 009): el admin elige el torneo, pega las filas de su hoja de
 * cálculo o sube un CSV, revisa fila por fila qué pasaría —con los menores de 18 marcados— y confirma. Nada se
 * guarda mientras haya filas con problemas. Es la misma validación que el script de la terminal.
 */
export function ImportPlayersModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [step, setStep] = useState<"input" | "review" | "done">("input");
  const [tournaments, setTournaments] = useState<TournamentOption[] | null>(null);
  const [tournamentId, setTournamentId] = useState("");
  const [teams, setTeams] = useState<string[] | null>(null);
  const [text, setText] = useState("");
  const [fileNote, setFileNote] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; loaded: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tournaments")
      .then((r) => r.json())
      .then((data: TournamentOption[]) => { if (!cancelled) setTournaments(data.filter((t) => t.teamsCount > 0)); })
      .catch(() => { if (!cancelled) setTournaments([]); });
    return () => { cancelled = true; };
  }, []);

  // Los equipos del torneo elegido, tal como se llaman: es lo que hay que escribir en la columna Club.
  useEffect(() => {
    if (!tournamentId) return;
    let cancelled = false;
    fetch(`/api/tournaments/${tournamentId}`)
      .then((r) => r.json())
      .then((t: { teams: { club: { name: string } }[] }) => { if (!cancelled) setTeams(t.teams.map((x) => x.club.name).sort((a, b) => a.localeCompare(b, "es"))); })
      .catch(() => { if (!cancelled) setTeams([]); });
    return () => { cancelled = true; };
  }, [tournamentId]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (/\.(xlsx|xls)$/i.test(file.name)) {
      setFileNote(null);
      return setError("Un archivo de Excel no se puede subir directo todavía: en Excel usa Archivo → Guardar como → CSV UTF-8, o copia las filas y pégalas aquí.");
    }
    const content = await readText(file);
    setText(content);
    setFileNote(`${file.name} · ${content.split(/\r?\n/).filter((l) => l.trim()).length} líneas`);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function send(dryRun: boolean) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/import-players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournamentId, text, dryRun }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "No se pudo completar la importación");
    if (dryRun) {
      setReview(data);
      setOnlyProblems(false);
      setStep("review");
    } else {
      setResult(data);
      setStep("done");
      onImported();
    }
  }

  const input = "w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500";
  const ghost = "min-h-11 cursor-pointer rounded-lg border border-border-primary px-4 py-2.5 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular disabled:cursor-not-allowed disabled:opacity-50";
  const solid = "min-h-11 cursor-pointer rounded-lg bg-surface-secondary px-5 py-2.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50";

  const shown = review ? (onlyProblems ? review.rows.filter((r) => r.status === "problem") : review.rows) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div role="dialog" aria-modal="true" aria-label="Importar jugadores" className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-surface-primary shadow-xl">
        <div className="flex items-center justify-between border-b border-border-primary px-6 py-4">
          <div>
            <h2 className="font-heading text-lg font-bold text-text-primary">Importar jugadores</h2>
            <p className="font-body text-xs text-text-secondary">
              {step === "input" ? "Paso 1 de 2 · Elige el torneo y pega o sube las filas" : step === "review" ? "Paso 2 de 2 · Revisa antes de cargar" : "Listo"}
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="cursor-pointer p-1 text-text-secondary hover:text-text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 font-body text-sm text-red-700">{error}</div>}

          {step === "input" && (
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="ip-torneo" className="mb-1 block font-body text-xs font-medium text-text-secondary">Torneo *</label>
                <select id="ip-torneo" value={tournamentId} onChange={(e) => { setTournamentId(e.target.value); setTeams(null); }} className={`${input} cursor-pointer`} disabled={!tournaments}>
                  <option value="">{tournaments ? "Elige un torneo" : "Cargando torneos..."}</option>
                  {(tournaments ?? []).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{t.organizer ? ` · ${t.organizer.firstName} ${t.organizer.lastName}` : ""} ({t.teamsCount} equipos)</option>
                  ))}
                </select>
                {teams && teams.length > 0 && (
                  <div className="mt-2" aria-live="polite">
                    <p className="font-body text-xs text-text-secondary">En la columna <strong>Club</strong> escribe el equipo tal como se llama aquí:</p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {teams.map((name) => <li key={name} className="rounded-full bg-brand-100 px-2.5 py-1 font-body text-xs text-text-primary">{name}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <label htmlFor="ip-filas" className="block font-body text-xs font-medium text-text-secondary">Filas de la hoja de cálculo *</label>
                  <div className="flex items-center gap-2">
                    {fileNote && <span className="font-body text-xs text-text-secondary">{fileNote}</span>}
                    <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv" className="sr-only" id="ip-archivo" onChange={(e) => void onFile(e.target.files?.[0])} />
                    <label htmlFor="ip-archivo" className="inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-border-primary px-3 py-1.5 font-heading text-xs font-semibold text-text-primary transition-colors hover:bg-btn-regular focus-within:outline-2">Subir un CSV</label>
                  </div>
                </div>
                <textarea
                  id="ip-filas"
                  value={text}
                  onChange={(e) => { setText(e.target.value); setFileNote(null); }}
                  rows={9}
                  spellCheck={false}
                  aria-describedby="ip-filas-ayuda"
                  className={`${input} font-mono text-xs leading-relaxed`}
                  placeholder={"Nombres\tApellidos\tClub\tDNI\tFecha de nacimiento\nAna María\tNúñez Peña\tLGK\t12345678\t05/02/1990"}
                />
                <p id="ip-filas-ayuda" className="mt-1 font-body text-xs text-text-secondary">
                  Copia las filas de Excel o Google Sheets <strong>con el encabezado</strong> (Nombres, Apellidos, Club, DNI, Fecha de nacimiento) y pégalas aquí; o sube un CSV. En la hoja, deja la columna del DNI en formato <strong>Texto</strong> para no perder un cero inicial. Las fechas se leen como día/mes/año.
                </p>
              </div>
            </div>
          )}

          {step === "review" && review && (
            <div className="flex flex-col gap-4">
              <p className="font-body text-sm text-text-secondary">Torneo: <strong className="text-text-primary">{review.tournament.name}</strong> · {review.totals.rows} {review.totals.rows === 1 ? "fila" : "filas"} leídas</p>

              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Resumen">
                <li className="rounded-lg border border-border-primary p-3"><p className="font-heading text-2xl font-bold text-text-primary">{review.totals.create}</p><p className="font-body text-xs text-text-secondary">para crear</p></li>
                <li className="rounded-lg border border-border-primary p-3"><p className="font-heading text-2xl font-bold text-text-primary">{review.totals.loaded}</p><p className="font-body text-xs text-text-secondary">ya cargados (se omiten)</p></li>
                <li className={`rounded-lg border p-3 ${review.totals.problems > 0 ? "border-red-300 bg-red-50" : "border-border-primary"}`}><p className={`font-heading text-2xl font-bold ${review.totals.problems > 0 ? "text-red-800" : "text-text-primary"}`}>{review.totals.problems}</p><p className="font-body text-xs text-text-secondary">con problemas</p></li>
                <li className={`rounded-lg border p-3 ${review.totals.minors > 0 ? "border-amber-300 bg-amber-50" : "border-border-primary"}`}><p className={`font-heading text-2xl font-bold ${review.totals.minors > 0 ? "text-amber-900" : "text-text-primary"}`}>{review.totals.minors}</p><p className="font-body text-xs text-text-secondary">menores de 18</p></li>
              </ul>

              {Object.keys(review.totals.byClub).length > 0 && (
                <p className="font-body text-sm text-text-secondary">
                  Se crearían por equipo: {Object.entries(review.totals.byClub).map(([club, n]) => `${club} (${n})`).join(" · ")}
                </p>
              )}
              {review.totals.minors > 0 && (
                <p className="rounded-lg bg-amber-50 px-4 py-2.5 font-body text-sm text-amber-900">
                  Hay {review.totals.minors} {review.totals.minors === 1 ? "jugador menor" : "jugadores menores"} de 18 años (marcados <strong>Menor</strong>). En la plataforma solo se muestran su nombre y su posición; el DNI y la fecha de nacimiento nunca son públicos.
                </p>
              )}
              {review.totals.problems > 0 && (
                <p role="status" className="rounded-lg bg-red-50 px-4 py-2.5 font-body text-sm text-red-800">
                  Corrige las filas con problema y vuelve a revisar. <strong>No se carga nada mientras haya problemas.</strong>
                </p>
              )}
              {review.totals.problems > 0 && (
                <label className="flex w-fit cursor-pointer items-center gap-2 font-body text-sm text-text-primary">
                  <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} className="h-4 w-4" />
                  Mostrar solo las filas con problemas
                </label>
              )}

              <div className="max-h-[42vh] overflow-auto rounded-xl border border-border-primary">
                <table className="w-full min-w-[760px] text-left">
                  <caption className="sr-only">Revisión de las filas importadas</caption>
                  <thead className="sticky top-0 bg-brand-50">
                    <tr className="border-b border-border-primary">
                      {["Fila", "Estado", "Jugador", "Club", "DNI", "Nacimiento", "Detalle"].map((h) => (
                        <th key={h} scope="col" className="px-3 py-2 font-heading text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => (
                      <tr key={r.row} className={`border-b border-border-primary last:border-0 ${r.status === "problem" ? "bg-red-50/60" : ""}`}>
                        <td className="px-3 py-2 font-body text-xs tabular-nums text-text-secondary">{r.row}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-heading text-[11px] font-bold ${STATUS[r.status].tone}`}>
                            <span aria-hidden="true">{STATUS[r.status].mark}</span>
                            {STATUS[r.status].label}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-body text-sm text-text-primary">{[r.firstName, r.lastName].filter(Boolean).join(" ") || "—"}</td>
                        <td className="px-3 py-2 font-body text-sm text-text-secondary">{r.club || "—"}</td>
                        <td className="px-3 py-2 font-body text-sm tabular-nums text-text-secondary">{r.dni ?? "—"}</td>
                        <td className="px-3 py-2 font-body text-sm tabular-nums text-text-secondary">
                          {dmy(r.birthDate)}
                          {r.minor && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 font-heading text-[10px] font-bold text-amber-900">Menor</span>}
                        </td>
                        <td className="px-3 py-2 font-body text-xs text-text-secondary">{r.reason ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === "done" && result && (
            <div className="py-6 text-center" role="status">
              <h3 className="font-heading text-xl font-bold text-text-primary">Se {result.created === 1 ? "cargó 1 jugador" : `cargaron ${result.created} jugadores`}</h3>
              <p className="mt-2 font-body text-sm text-text-secondary">
                {result.loaded > 0 ? `${result.loaded} ya estaban cargados y se omitieron. ` : ""}
                Ya aparecen en la lista como provisionales. Desde <strong>Asignar cuenta</strong> puedes invitar a cada jugador a reclamar su perfil.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-border-primary px-6 py-4">
          {step === "input" && (
            <>
              <button onClick={onClose} className={ghost}>Cancelar</button>
              <button onClick={() => void send(true)} disabled={busy || !tournamentId || !text.trim()} className={solid}>{busy ? "Revisando..." : "Revisar"}</button>
            </>
          )}
          {step === "review" && review && (
            <>
              <button onClick={() => { setStep("input"); setError(null); }} disabled={busy} className={ghost}>Volver y editar</button>
              <button onClick={() => void send(false)} disabled={busy || review.totals.problems > 0 || review.totals.create === 0} className={solid}>
                {busy ? "Cargando..." : review.totals.create === 0 ? "No hay jugadores nuevos" : `Confirmar y cargar ${review.totals.create} ${review.totals.create === 1 ? "jugador" : "jugadores"}`}
              </button>
            </>
          )}
          {step === "done" && <button onClick={onClose} className={solid}>Cerrar</button>}
        </div>
      </div>
    </div>
  );
}
