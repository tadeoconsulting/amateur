"use client";

import { MATCH_TONE, matchTone } from "@/_lib/match-tone";
import Link from "next/link";
import { useApi } from "@/_lib/use-api";
import { ClubCrest } from "@/_components/club-crest";
import { PageSpinner } from "@/_components/spinner";
import { formatTime12 } from "@/_lib/match-format";
import { btnOutline, btnSolid } from "@/_components/button-styles";

// El inicio de la mesa (especificación 011): sus torneos y los partidos del día de juego. Con la ventana abierta
// puede gestionarlos; cerrada, solo ve su próximo turno.

type Team = { id: string; name: string; shortName: string; logoUrl: string | null; color: string | null } | null;
type ScheduleMatch = { id: string; time: string; status: string; period: string | null; homeScore: number | null; awayScore: number | null; matchday: number; location: string; homeTeam: Team; awayTeam: Team };
type ScheduleTournament = {
  id: string;
  name: string;
  open: boolean;
  window: { day: string; opensAt: number; closesAt: number } | null;
  next: { day: string; opensAt: number } | null;
  day: string | null;
  matches: ScheduleMatch[];
};
type Schedule = { ok: true; tournaments: ScheduleTournament[] } | { ok: false; error: string };

const LIMA = "America/Lima";
const clock = (ms: number) => new Date(ms).toLocaleTimeString("es-PE", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: LIMA });
const dayLabel = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function statusLabel(m: ScheduleMatch) {
  if (m.status === "en_curso") return m.period === "descanso" ? "Descanso" : "En vivo";
  if (m.status === "finalizado") return "Final";
  return m.time ? formatTime12(m.time) : "Por definir";
}

export default function MesaHomePage() {
  const { data, loading } = useApi<Schedule>(async () => {
    const res = await fetch("/api/mesa/schedule");
    const body = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, tournaments: body.tournaments as ScheduleTournament[] } : { ok: false, error: body.error ?? "No se pudo cargar tu agenda" };
  });

  if (loading || !data) return <PageSpinner />;
  if (!data.ok) {
    return <p role="alert" className="px-4 py-10 text-center font-body text-sm text-text-secondary">Esta pantalla es para las cuentas de mesa.</p>;
  }

  return (
    <div className="flex flex-col gap-6 px-4 pb-10 pt-2">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">Tus partidos</h1>
        <p className="mt-1 font-body text-sm text-text-secondary">Solo puedes gestionar los partidos el día de juego: desde 1 hora antes del primero hasta 1 hora después del último.</p>
      </div>

      {data.tournaments.length === 0 && (
        <p className="rounded-xl bg-btn-regular px-4 py-6 text-center font-body text-sm text-text-secondary">Todavía no te asignaron ningún torneo. Pídeselo al organizador.</p>
      )}

      {data.tournaments.map((t) => (
        <section key={t.id} aria-labelledby={`t-${t.id}`} className="overflow-hidden rounded-2xl border border-border-primary">
          <div className="border-b border-border-primary px-4 py-3">
            <h2 id={`t-${t.id}`} className="font-heading text-base font-bold text-text-primary">{t.name}</h2>
            {t.open && t.window ? (
              <p className="mt-0.5 inline-flex items-center gap-1.5 font-body text-sm text-text-primary">
                <span className="h-2 w-2 rounded-full bg-verification" aria-hidden="true" />
                Abierto hasta las {clock(t.window.closesAt)}
              </p>
            ) : t.next ? (
              <p className="mt-0.5 font-body text-sm text-text-secondary">
                Tu próximo turno: <strong className="capitalize text-text-primary">{dayLabel(t.next.day)}</strong>, desde las {clock(t.next.opensAt)}
              </p>
            ) : (
              <p className="mt-0.5 font-body text-sm text-text-secondary">No hay partidos programados por ahora.</p>
            )}
          </div>

          {t.matches.length > 0 && (
            <ul>
              {t.matches.map((m, i) => (
                <li key={m.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border-primary" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <ClubCrest club={m.homeTeam} size="h-6 w-6" textSize="text-[8px]" />
                      <span className="truncate font-body text-sm text-text-primary">{m.homeTeam?.name ?? "Por definir"}</span>
                      {m.status !== "programado" && <span className="ml-auto font-heading text-sm font-bold tabular-nums text-text-primary">{m.homeScore ?? 0}</span>}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <ClubCrest club={m.awayTeam} size="h-6 w-6" textSize="text-[8px]" />
                      <span className="truncate font-body text-sm text-text-primary">{m.awayTeam?.name ?? "Por definir"}</span>
                      {m.status !== "programado" && <span className="ml-auto font-heading text-sm font-bold tabular-nums text-text-primary">{m.awayScore ?? 0}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className={`font-heading text-xs font-bold ${m.status === "programado" ? "text-text-secondary" : MATCH_TONE[matchTone(m.status, m.period)].text}`}>{statusLabel(m)}</span>
                    {t.open && m.homeTeam && m.awayTeam && (
                      <Link href={`/mesa/torneos/${t.id}/en-vivo/${m.id}`} className={`${m.status === "finalizado" ? btnOutline : btnSolid} !min-h-10 !px-3 !text-xs`}>
                        {m.status === "finalizado" ? "Ver" : "Gestionar"}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <Link href="/mesa/contrasena" className="self-center font-heading text-sm font-semibold text-text-secondary underline underline-offset-2">
        Cambiar mi contraseña
      </Link>
    </div>
  );
}
