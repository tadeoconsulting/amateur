"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  createRequest,
  getMyRequests,
  getTournaments,
  modalityLabel,
  resolveRequest,
  type TournamentListItem,
} from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { useMyClub, type MyClub } from "@/_lib/use-my-club";
import { formatLabel } from "@/_lib/tournament-labels";
import { btnOutline, btnSolid, btnText } from "@/_components/button-styles";
import { PageSpinner, Spinner } from "@/_components/spinner";
import { RequestStatusChip } from "@/_components/request-status-chip";
import { Toast } from "@/_components/toast";

export default function ClubBuscarTorneosPage() {
  // useApi consulta una sola vez al montar: por eso se espera a conocer el club antes de montar la pantalla.
  const { club, loading } = useMyClub();
  if (loading) return <PageSpinner />;
  return <BuscarTorneos club={club} />;
}

function BuscarTorneos({ club }: { club: MyClub | null }) {
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const { data: open, refetch: refetchOpen } = useApi(() => getTournaments({ status: "inscripcion" }));
  const { data: mine, refetch: refetchMine } = useApi(() => getMyRequests());
  // Torneos donde mi club ya está inscrito.
  const { data: joined, refetch: refetchJoined } = useApi(() => (club ? getTournaments({ clubId: club.id }) : Promise.resolve([])));

  const joinedIds = useMemo(() => new Set((joined ?? []).map((t) => t.id)), [joined]);
  const requestByTournament = useMemo(() => new Map((mine ?? []).map((r) => [r.tournament.id, r])), [mine]);

  const filtered = useMemo(() => {
    const list = open ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((t) => t.name.toLowerCase().includes(q) || t.location.toLowerCase().includes(q));
  }, [open, query]);

  function reload() {
    refetchOpen();
    refetchMine();
    refetchJoined();
  }

  async function request(t: TournamentListItem) {
    if (!club) return;
    setPending(t.id);
    const result = await createRequest(t.id, club.id);
    setPending(null);
    if (!result.ok) {
      setToast({ message: result.error ?? "No se pudo enviar la solicitud", tone: "error" });
      reload(); // el cupo o el estado del torneo pudo cambiar
      return;
    }
    setToast({ message: `Solicitud enviada a ${t.name}. El organizador la revisará.`, tone: "success" });
    reload();
  }

  async function cancel(t: TournamentListItem, requestId: string) {
    setPending(t.id);
    const result = await resolveRequest(requestId, "cancel");
    setPending(null);
    if (!result.ok) {
      setToast({ message: result.error ?? "No se pudo cancelar", tone: "error" });
      reload();
      return;
    }
    setToast({ message: `Cancelaste tu solicitud a ${t.name}`, tone: "success" });
    reload();
  }

  if (!open) return <PageSpinner />;

  function renderAction(t: TournamentListItem) {
    const isFull = t.maxTeams !== null && t.teamsCount >= t.maxTeams;
    const isBusy = pending === t.id;
    const req = requestByTournament.get(t.id);

    if (joinedIds.has(t.id)) return <EnrolledBadge />;
    if (req?.kind === "request") {
      return (
        <div className="flex items-center justify-between gap-2">
          <RequestStatusChip status="pending" />
          <span className="font-body text-xs text-text-secondary">Solicitud enviada</span>
          <button onClick={() => cancel(t, req.id)} disabled={pending !== null} className={btnText}>
            {isBusy && <Spinner size={16} label="Cancelando" />}
            Cancelar
          </button>
        </div>
      );
    }
    if (req?.kind === "invite") {
      return (
        <div className="flex items-center justify-between gap-2">
          <span className="font-body text-xs font-semibold text-text-primary">Este torneo te invitó</span>
          <Link href="/club/torneos?tab=solicitudes" className={btnSolid}>
            Responder
          </Link>
        </div>
      );
    }
    return (
      <button
        onClick={() => request(t)}
        disabled={!club || isFull || pending !== null}
        className={`${isFull ? btnOutline : btnSolid} w-full`}
      >
        {isBusy && <Spinner size={16} label="Enviando" />}
        {isFull ? "Sin cupos" : "Solicitar unirme"}
      </button>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col pb-4">
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center gap-1 px-2 pt-3 pb-2">
        <Link href="/club/torneos" aria-label="Volver a Torneos" className="flex h-11 w-11 shrink-0 items-center justify-center text-text-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="font-heading text-lg font-bold text-text-primary">Buscar torneo</h1>
      </div>

      {/* Search */}
      <div className="mt-2 px-4">
        <label htmlFor="buscar-torneo" className="sr-only">
          Buscar torneo por nombre o sede
        </label>
        <div className="relative">
          <input
            id="buscar-torneo"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre del torneo o sede"
            className="w-full rounded-lg border border-transparent bg-btn-regular px-3 py-3 pr-10 font-body text-base text-text-primary placeholder:text-text-primary/60 transition-colors hover:border-border-primary hover:bg-surface-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary/20"
          />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Sin equipo: no se puede solicitar hasta crear uno */}
      {!club && (
        <div role="status" className="mx-4 mt-4 rounded-xl bg-yellow/30 p-4">
          <p className="font-heading text-sm font-bold text-text-primary">Primero crea tu equipo</p>
          <p className="mt-1 font-body text-sm text-text-primary">Para pedir unirte a un torneo necesitas un equipo.</p>
          <Link href="/club?next=/club/torneos/buscar" className={`${btnSolid} mt-3 w-full`}>
            Crear mi equipo
          </Link>
        </div>
      )}

      {/* Results */}
      <div className="mt-4 flex flex-col gap-3 px-4">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center px-4 py-12 text-center">
            <h2 className="font-heading text-base font-bold text-text-primary">
              {query.trim() ? "No encontramos torneos con esa búsqueda" : "No hay torneos abiertos por ahora"}
            </h2>
            <p className="mt-2 max-w-[280px] font-body text-sm text-text-secondary">
              {query.trim()
                ? "Prueba con otro nombre o con la sede."
                : "Cuando un organizador abra una convocatoria aparecerá aquí. También puede invitar a tu equipo."}
            </p>
            {query.trim() && (
              <button onClick={() => setQuery("")} className={`${btnOutline} mt-5`}>
                Borrar búsqueda
              </button>
            )}
          </div>
        )}

        {filtered.map((t) => {
          const libres = t.maxTeams === null ? null : Math.max(0, t.maxTeams - t.teamsCount);
          const format = [formatLabel(t.format), modalityLabel(t.modality)].filter(Boolean).join(" · ");
          return (
            <article key={t.id} className="rounded-xl border border-border-primary p-4">
              <h2 className="font-heading text-sm font-bold text-text-primary">{t.name}</h2>
              <p className="mt-0.5 font-body text-xs text-text-secondary">
                {t.category || "Libre"} | {new Date(t.startDate).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
              </p>
              <dl className="mt-2 flex flex-col gap-1 font-body text-xs text-text-secondary">
                <div><dt className="sr-only">Sede</dt><dd>{t.location}</dd></div>
                <div><dt className="sr-only">Formato</dt><dd>{format}</dd></div>
                <div>
                  <dt className="sr-only">Cupos</dt>
                  <dd>{libres === null ? "Sin límite de cupos" : `${t.maxTeams} cupos · ${libres === 0 ? "sin cupos libres" : `${libres} libres`}`}</dd>
                </div>
                <div><dt className="sr-only">Organizador</dt><dd>Organizador: {t.organizer.firstName} {t.organizer.lastName}</dd></div>
              </dl>
              <div className="mt-4">{renderAction(t)}</div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function EnrolledBadge() {
  return (
    <span className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-verification/20 font-heading text-sm font-bold text-brand-900">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Ya inscrito
    </span>
  );
}
