"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getMyRequests, getTournaments, modalityLabel, resolveRequest, type MyRequestItem } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { formatLabel, OPEN_STATUSES } from "@/_lib/tournament-labels";
import { timeAgo } from "@/_lib/time-ago";
import type { RequestAction } from "@/_lib/tournament-request";
import { btnOutline, btnSolid } from "@/_components/button-styles";
import { PageSpinner, Spinner } from "@/_components/spinner";
import { RequestStatusChip } from "@/_components/request-status-chip";
import { Toast } from "@/_components/toast";

type MainTab = "mis_torneos" | "solicitudes";
type CategoryTab = "libre" | "sub18";

function ClubTorneosContent() {
  // ?tab=solicitudes abre directo esa pestaña (por ejemplo, desde "Buscar torneo").
  const initialTab: MainTab = useSearchParams().get("tab") === "solicitudes" ? "solicitudes" : "mis_torneos";
  const [mainTab, setMainTab] = useState<MainTab>(initialTab);
  const [categoryTab, setCategoryTab] = useState<CategoryTab>("libre");
  const [busy, setBusy] = useState<{ id: string; action: RequestAction } | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const { data: tournaments, loading } = useApi(() => getTournaments());
  const { data: myRequests, refetch: refetchRequests } = useApi(() => getMyRequests());

  if (loading || !tournaments) return <PageSpinner />;

  const solicitudes = myRequests ?? [];
  const invitesPending = solicitudes.filter((r) => r.kind === "invite").length;

  async function run(item: MyRequestItem, action: RequestAction, success: string) {
    setBusy({ id: item.id, action });
    const result = await resolveRequest(item.id, action);
    setBusy(null);
    if (!result.ok) {
      setToast({ message: result.error ?? "No se pudo completar la acción", tone: "error" });
      if (result.status === 409) refetchRequests(); // otro la resolvió o el cupo cambió
      return;
    }
    setToast({ message: success, tone: "success" });
    refetchRequests();
  }

  const clubTournaments = tournaments.filter(
    (t) => t.status === "en_curso" || t.status === "finalizado"
  );

  return (
    <div className="flex min-h-dvh flex-col pb-4">
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-text-primary">
            <path
              d="M6 3h12v5a6 6 0 01-12 0V3zM5 4H3a1 1 0 00-1 1v1.5a3 3 0 003 3h.5M19 4h2a1 1 0 011 1v1.5a3 3 0 01-3 3h-.5M8 14v3M16 14v3M7 17h10a1 1 0 011 1v2H6v-2a1 1 0 011-1z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h1 className="font-heading text-xl font-bold text-text-primary">Torneos</h1>
        </div>
        <Link href="/club/torneos/buscar" className="p-1 text-text-primary">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </Link>
      </div>

      {/* Main tabs */}
      <div className="flex gap-2 px-4 mt-2">
        <button
          onClick={() => setMainTab("mis_torneos")}
          className={`min-h-11 cursor-pointer rounded-lg px-5 font-heading text-sm font-medium transition-colors ${
            mainTab === "mis_torneos"
              ? "bg-surface-secondary text-text-invert"
              : "border border-border-primary text-text-primary"
          }`}
        >
          Mis torneos
        </button>
        <button
          onClick={() => setMainTab("solicitudes")}
          className={`min-h-11 cursor-pointer rounded-lg px-5 font-heading text-sm font-medium transition-colors ${
            mainTab === "solicitudes"
              ? "bg-surface-secondary text-text-invert"
              : "border border-border-primary text-text-primary"
          }`}
        >
          Solicitudes
          {invitesPending > 0 && (
            <>
              <span aria-hidden="true" className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-verification px-1.5 text-[11px] font-bold leading-5 text-text-primary">
                {invitesPending}
              </span>
              <span className="sr-only"> ({invitesPending} invitaciones por responder)</span>
            </>
          )}
        </button>
      </div>

      {/* Category sub-tabs */}
      <div className="mt-4 flex gap-4 border-b border-border-primary px-4">
        <button
          onClick={() => setCategoryTab("libre")}
          className={`cursor-pointer pb-2 font-body text-sm transition-colors ${
            categoryTab === "libre"
              ? "border-b-2 border-text-primary font-semibold text-text-primary"
              : "text-text-secondary"
          }`}
        >
          Libre
        </button>
        <button
          onClick={() => setCategoryTab("sub18")}
          className={`cursor-pointer pb-2 font-body text-sm transition-colors ${
            categoryTab === "sub18"
              ? "border-b-2 border-text-primary font-semibold text-text-primary"
              : "text-text-secondary"
          }`}
        >
          Sub 18
        </button>
      </div>

      {/* Mis torneos content */}
      {mainTab === "mis_torneos" && (
        <div className="mt-4 flex flex-col gap-3 px-4">
          {clubTournaments.map((t) => (
            <Link
              key={t.id}
              href={`/club/torneos/${t.id}`}
              className="rounded-xl border border-border-primary p-4 transition-colors hover:bg-btn-regular"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-300">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M4 2h8v4a4 4 0 01-8 0V2zM3 3H1.5a.5.5 0 00-.5.5v1a2 2 0 002 2H3M13 3h1.5a.5.5 0 01.5.5v1a2 2 0 01-2 2h-.5M6 10v2M10 10v2M5 12h6a1 1 0 011 1v1H4v-1a1 1 0 011-1z"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-sm font-bold text-text-primary">{t.name}</h3>
                  <p className="mt-0.5 font-body text-xs text-text-secondary">
                    {t.category || "Libre"} | {new Date(t.startDate).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
                  </p>
                  <div className="mt-2 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-text-secondary">
                        <path d="M7 1.75a4.375 4.375 0 00-4.375 4.375C2.625 9.5 7 12.25 7 12.25s4.375-2.75 4.375-6.125A4.375 4.375 0 007 1.75z" stroke="currentColor" strokeWidth="1" />
                        <circle cx="7" cy="6.125" r="1.5" stroke="currentColor" strokeWidth="1" />
                      </svg>
                      <span className="font-body text-xs text-text-secondary">{t.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-text-secondary">
                        <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1" />
                        <path d="M7 1.75l1 2h-2l1-2zM3.5 5l2 1-1 2-2-1 1-2zM10.5 5l-2 1 1 2 2-1-1-2zM5 10.5l2-1 2 1-1 2H6l-1-2z" fill="currentColor" opacity="0.3" />
                      </svg>
                      <span className="font-body text-xs text-text-secondary">
                        {formatLabel(t.format)} | {t.teamsCount} equipos
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Solicitudes: invitaciones que recibió el club y solicitudes que envió */}
      {mainTab === "solicitudes" && (
        <div className="mt-4 flex flex-col gap-3 px-4">
          {solicitudes.length === 0 && (
            <div className="flex flex-col items-center px-4 py-12 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mb-4 text-brand-500" aria-hidden="true">
                <path d="M6 3h12v5a6 6 0 01-12 0V3z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 14v3M16 14v3M7 17h10a1 1 0 011 1v2H6v-2a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h2 className="font-heading text-base font-bold text-text-primary">Sin solicitudes pendientes</h2>
              <p className="mt-2 max-w-[280px] text-sm text-text-secondary">
                Aquí verás las invitaciones de organizadores y las solicitudes que envíes a un torneo.
              </p>
              <Link href="/club/torneos/buscar" className={`${btnSolid} mt-5 w-full max-w-[280px]`}>
                Buscar torneos
              </Link>
            </div>
          )}
          {solicitudes.map((sol) => {
            const t = sol.tournament;
            const isInvite = sol.kind === "invite";
            const isOpen = OPEN_STATUSES.includes(t.status);
            const isFull = t.maxTeams !== null && t.teamsCount >= t.maxTeams;
            const cupos = t.maxTeams === null ? "Sin límite de cupos" : `${t.maxTeams} cupos · ${Math.max(0, t.maxTeams - t.teamsCount)} libres`;
            const isBusy = busy?.id === sol.id;
            const format = [formatLabel(t.format), modalityLabel(t.modality)].filter(Boolean).join(" · ");

            return (
              <div key={sol.id} className="rounded-xl border border-border-primary p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-300" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 2h8v4a4 4 0 01-8 0V2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-heading text-sm font-bold text-text-primary">{t.name}</h3>
                      <RequestStatusChip status="pending" />
                    </div>
                    <p className="mt-0.5 font-body text-xs text-text-secondary">
                      {t.category || "Libre"} | {new Date(t.startDate).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
                    </p>
                    <p className="mt-1 font-body text-xs font-semibold text-text-primary">
                      {isInvite ? "Te invitaron" : "Esperando respuesta del organizador"} · {timeAgo(sol.createdAt)}
                    </p>
                    <dl className="mt-2 flex flex-col gap-1 font-body text-xs text-text-secondary">
                      <div className="flex gap-1.5"><dt className="sr-only">Sede</dt><dd>{t.location}</dd></div>
                      <div className="flex gap-1.5"><dt className="sr-only">Formato</dt><dd>{format}</dd></div>
                      <div className="flex gap-1.5"><dt className="sr-only">Cupos</dt><dd>{cupos}</dd></div>
                      <div className="flex gap-1.5"><dt className="sr-only">Organizador</dt><dd>Organizador: {t.organizer.firstName} {t.organizer.lastName}</dd></div>
                    </dl>
                  </div>
                </div>

                {!isOpen && (
                  <p role="status" className="mt-3 rounded-lg bg-brand-300 px-3 py-2 font-body text-xs text-text-primary">
                    Este torneo ya empezó: no se pueden aceptar más equipos.
                  </p>
                )}
                {isOpen && isInvite && isFull && (
                  <p role="status" className="mt-3 rounded-lg bg-yellow/30 px-3 py-2 font-body text-xs text-text-primary">
                    El torneo se llenó. Puedes rechazar la invitación.
                  </p>
                )}

                <div className="mt-4 flex gap-2">
                  {isInvite ? (
                    <>
                      <button
                        onClick={() => run(sol, "decline", `Rechazaste la invitación a ${t.name}`)}
                        disabled={busy !== null}
                        className={`${btnOutline} flex-1`}
                      >
                        {isBusy && busy?.action === "decline" && <Spinner size={16} label="Rechazando" />}
                        Rechazar
                      </button>
                      <button
                        onClick={() => run(sol, "accept", `${sol.club.name} se unió a ${t.name}`)}
                        disabled={busy !== null || !isOpen || isFull}
                        className={`${btnSolid} flex-1`}
                      >
                        {isBusy && busy?.action === "accept" && <Spinner size={16} label="Aceptando" />}
                        Aceptar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => run(sol, "cancel", `Cancelaste tu solicitud a ${t.name}`)}
                      disabled={busy !== null}
                      className={`${btnOutline} w-full`}
                    >
                      {isBusy && <Spinner size={16} label="Cancelando" />}
                      Cancelar solicitud
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ClubTorneosPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ClubTorneosContent />
    </Suspense>
  );
}
