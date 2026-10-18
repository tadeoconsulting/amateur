"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMyClub } from "@/_lib/use-my-club";
import { attendancePercent, countLabel, dayLabel, nextAttendance, timeRange, type AttendanceStatus } from "@/_lib/club-training";
import { GestionError, gestionRequest, type RosterData } from "@/_lib/club-training-client";
import { PageSpinner, Spinner } from "@/_components/spinner";
import { Toast } from "@/_components/toast";
import { btnOutline } from "@/_components/button-styles";

export default function PasarListaPage() {
  const { club, loading } = useMyClub();
  const { sessionId } = useParams<{ sessionId: string }>();
  if (loading) return <PageSpinner />;
  if (!club) return <div className="px-4 py-20 text-center font-body text-sm text-text-secondary">Todavía no tienes un club.</div>;
  return <RosterContent key={sessionId} clubId={club.id} sessionId={sessionId} />;
}

const PILL: Record<AttendanceStatus | "none", { label: string; className: string }> = {
  none: { label: "Sin marcar", className: "border-2 border-dashed border-brand-500 text-text-secondary" },
  presente: { label: "Presente", className: "border-2 border-verification bg-verification/25 text-brand-900" },
  ausente: { label: "Ausente", className: "border-2 border-red bg-red/20 text-brand-900" },
  justificado: { label: "Justificado", className: "border-2 border-yellow bg-yellow/50 text-brand-900" },
};

function RosterContent({ clubId, sessionId }: { clubId: string; sessionId: string }) {
  const base = `/api/clubs/${clubId}/gestion/sesiones/${sessionId}/asistencia`;
  const [data, setData] = useState<RosterData | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  // Cada jugador guarda sus toques en orden: dos toques seguidos no se cruzan en el servidor.
  const queue = useRef(new Map<string, Promise<void>>());

  useEffect(() => {
    let cancelled = false;
    gestionRequest<RosterData>("GET", base)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError("");
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof GestionError ? err.message : "No se pudo cargar la lista");
      });
    return () => {
      cancelled = true;
    };
  }, [base, version]);

  const dismissToast = useCallback(() => setToast(null), []);
  const resync = useCallback(() => setVersion((v) => v + 1), []);

  function setStatus(playerId: string, status: AttendanceStatus | null) {
    setData((d) => (d ? { ...d, players: d.players.map((p) => (p.playerId === playerId ? { ...p, status } : p)) } : d));
    const previous = queue.current.get(playerId) ?? Promise.resolve();
    const next = previous
      .then(() => gestionRequest("PUT", `${base}/${playerId}`, { status }))
      .then(() => undefined)
      .catch((err) => {
        setToast({ message: err instanceof GestionError ? err.message : "No se pudo guardar", tone: "error" });
        resync();
      });
    queue.current.set(playerId, next);
  }

  async function markAllPresent() {
    if (bulkBusy) return;
    setBulkBusy(true);
    try {
      // Espera lo que ya se estaba guardando para no pisarlo.
      await Promise.all([...queue.current.values()]);
      const r = await gestionRequest<{ marked: number }>("POST", base, { action: "todos_presentes" });
      setToast({ message: r.marked === 1 ? "1 jugador marcado presente" : `${r.marked} jugadores marcados presentes`, tone: "success" });
      resync();
    } catch (err) {
      setToast({ message: err instanceof GestionError ? err.message : "No se pudo marcar", tone: "error" });
    } finally {
      setBulkBusy(false);
    }
  }

  if (!data && !error) return <PageSpinner />;

  const players = data?.players ?? [];
  const count = (s: AttendanceStatus) => players.filter((p) => p.status === s).length;
  const marked = players.filter((p) => p.status !== null).length;
  const percent = attendancePercent({ presente: count("presente"), ausente: count("ausente") });
  const unmarked = players.length - marked;

  return (
    <div className="w-full pb-8">
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={dismissToast} />}

      <div className="flex items-center gap-1 px-4 pt-4">
        <Link href="/club/gestion/asistencia" aria-label="Volver a Asistencia" className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center text-text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180" aria-hidden="true">
            <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-bold text-text-primary">Pasar lista</h1>
          {data && (
            <p className="truncate font-body text-xs text-text-secondary">
              {dayLabel(data.session.date)} · {timeRange(data.session.time, data.session.durationMin).replace("–", " a ")} · {data.session.categoryName ?? "Todo el club"} · {data.session.placeName}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="mx-4 mt-4 rounded-lg bg-error/15 px-3 py-2.5 font-body text-sm text-brand-900">
          {error}{" "}
          <button onClick={resync} className="font-semibold underline">
            Reintentar
          </button>
        </div>
      )}

      {data && (
        <>
          <div className="sticky top-0 z-10 mt-3 border-b border-brand-200 bg-surface-primary px-4 py-3 md:top-16" aria-live="polite">
            <p className="font-heading text-sm font-bold text-text-primary">
              {marked} de {players.length} marcados
              {percent !== null && <span className="font-medium text-text-secondary"> · {percent}% de asistencia</span>}
            </p>
            <p className="font-body text-xs text-text-secondary">
              {countLabel(count("presente"), "presente", "presentes")} · {countLabel(count("ausente"), "ausente", "ausentes")} · {countLabel(count("justificado"), "justificado", "justificados")}
            </p>
          </div>

          {!data.canMark && (
            <p role="status" className="mx-4 mt-4 rounded-lg bg-btn-regular px-3 py-2.5 font-body text-sm text-text-secondary">
              {data.session.status === "cancelada" ? "Este entrenamiento está cancelado: no se pasa lista." : "Este entrenamiento todavía no se puede marcar. Se habilita el mismo día."}
            </p>
          )}

          {data.canMark && unmarked > 0 && (
            <div className="mt-3 px-4">
              <button onClick={markAllPresent} disabled={bulkBusy} className={btnOutline}>
                {bulkBusy && <Spinner size={16} label="Marcando" />}
                Marcar los {unmarked} restantes como presentes
              </button>
            </div>
          )}

          <ul className="mt-2 px-4">
            {players.map((p) => {
              const key = p.status ?? "none";
              return (
                <li key={p.playerId} className="flex items-center justify-between gap-3 border-b border-brand-200 last:border-0">
                  <span className="min-w-0 py-2">
                    <span className="block truncate font-heading text-sm font-bold text-text-primary">{p.name}</span>
                    <span className="block truncate font-body text-xs text-text-secondary">
                      {[p.number !== null ? `#${p.number}` : null, p.position, p.provisional ? "Provisional" : null].filter(Boolean).join(" · ") || " "}
                    </span>
                  </span>
                  <button
                    onClick={() => setStatus(p.playerId, nextAttendance(p.status))}
                    disabled={!data.canMark}
                    aria-label={`${p.name}: ${PILL[key].label}. Toca para cambiar`}
                    className={`min-h-11 w-32 shrink-0 cursor-pointer rounded-lg px-2 font-heading text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${PILL[key].className}`}
                  >
                    {PILL[key].label}
                  </button>
                </li>
              );
            })}
          </ul>

          {players.length === 0 && (
            <p className="px-4 py-10 text-center font-body text-sm text-text-secondary">
              No hay jugadores en esta categoría.{" "}
              <Link href="/club/jugadores" className="font-semibold text-text-primary underline">
                Ver jugadores
              </Link>
            </p>
          )}
          {players.length > 0 && <p className="mt-4 px-4 text-center font-body text-xs text-text-secondary">Toca para cambiar: presente, ausente, justificado y sin marcar. Se guarda solo.</p>}
        </>
      )}
    </div>
  );
}
