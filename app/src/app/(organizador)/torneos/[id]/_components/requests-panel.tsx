"use client";

import Link from "next/link";
import { useState } from "react";
import { ClubAvatar } from "@/_components/club-avatar";
import { btnOutline, btnSolid, btnText } from "@/_components/button-styles";
import { RequestStatusChip } from "@/_components/request-status-chip";
import { Spinner } from "@/_components/spinner";
import { resolveRequest, type TournamentRequestItem } from "@/_lib/api";
import { timeAgo } from "@/_lib/time-ago";
import type { RequestAction } from "@/_lib/tournament-request";

type Props = {
  tournamentId: string;
  kind: "request" | "invite";
  requests: TournamentRequestItem[];
  /** Equipos inscritos y cupo total: sin cupo no se puede aceptar. */
  teamsCount: number;
  maxTeams: number | null;
  /** Se llama tras cada cambio para que la pantalla recargue equipos y solicitudes. */
  onChanged: () => void;
  onNotify: (message: string, tone: "success" | "error") => void;
  onShare: () => void;
};

function EmptyState({ title, children, action }: { title: string; children: React.ReactNode; action: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mb-4 text-brand-500" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h2 className="font-heading text-base font-bold text-text-primary">{title}</h2>
      <p className="mt-2 max-w-[280px] font-body text-sm text-text-secondary">{children}</p>
      <div className="mt-5 w-full max-w-[280px]">{action}</div>
    </div>
  );
}

export function RequestsPanel({ tournamentId, kind, requests, teamsCount, maxTeams, onChanged, onNotify, onShare }: Props) {
  // Una acción a la vez por fila: mientras corre, sus botones se desactivan y muestran progreso.
  const [busy, setBusy] = useState<{ id: string; action: RequestAction } | null>(null);
  const isFull = maxTeams !== null && teamsCount >= maxTeams;

  async function run(item: TournamentRequestItem, action: RequestAction, success: string) {
    setBusy({ id: item.id, action });
    const result = await resolveRequest(item.id, action);
    setBusy(null);
    if (!result.ok) {
      onNotify(result.error ?? "No se pudo completar la acción", "error");
      // Si otra persona ya la resolvió o el cupo cambió, la lista quedó vieja: recargar.
      if (result.status === 409) onChanged();
      return;
    }
    onNotify(success, "success");
    onChanged();
  }

  const list = kind === "request" ? requests.filter((r) => r.status === "pending") : requests;

  if (kind === "request" && list.length === 0) {
    return (
      <EmptyState
        title="Sin solicitudes por ahora"
        action={
          <button onClick={onShare} className={`${btnOutline} w-full`}>
            Compartir la convocatoria
          </button>
        }
      >
        Cuando un equipo pida unirse aparecerá aquí para que lo apruebes. Comparte el link para invitarlos.
      </EmptyState>
    );
  }

  if (kind === "invite" && list.length === 0) {
    return (
      <EmptyState
        title="Aún no invitaste a ningún equipo"
        action={
          <Link href={`/torneos/${tournamentId}/agregar-equipo/buscar`} className={`${btnOutline} w-full`}>
            Buscar equipos para invitar
          </Link>
        }
      >
        Invita a un equipo de la comunidad y su dueño confirmará si se une.
      </EmptyState>
    );
  }

  return (
    <div className="mt-4 px-4">
      {kind === "request" && isFull && (
        <p role="status" className="mb-3 rounded-lg bg-yellow/30 px-3 py-2.5 font-body text-sm text-text-primary">
          El torneo ya tiene todos sus equipos. Amplía el cupo o rechaza las solicitudes.
        </p>
      )}

      <ul className="flex flex-col">
        {list.map((item) => {
          const isBusy = busy?.id === item.id;
          const meta =
            kind === "request"
              ? `${item.club.delegadoNombre ? `Delegado ${item.club.delegadoNombre} · ` : ""}pidió unirse ${timeAgo(item.createdAt)}`
              : `Invitado ${timeAgo(item.createdAt)}`;

          return (
            <li key={item.id} className="flex flex-col gap-3 border-b border-brand-200 py-4 last:border-0">
              <div className="flex items-center gap-3">
                <ClubAvatar shortName={item.club.shortName} color={item.club.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-sm font-bold text-text-primary">{item.club.name}</p>
                  <p className="mt-0.5 truncate font-body text-xs text-text-secondary">{meta}</p>
                </div>
                {kind === "invite" && <RequestStatusChip status={item.status} />}
              </div>

              {kind === "request" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => run(item, "decline", `Rechazaste a ${item.club.name}`)}
                    disabled={isBusy || busy !== null}
                    className={`${btnOutline} flex-1`}
                  >
                    {isBusy && busy?.action === "decline" ? <Spinner size={16} label="Rechazando" /> : null}
                    Rechazar
                  </button>
                  <button
                    onClick={() => run(item, "accept", `${item.club.name} se unió al torneo`)}
                    disabled={isBusy || busy !== null || isFull}
                    className={`${btnSolid} flex-1`}
                  >
                    {isBusy && busy?.action === "accept" ? <Spinner size={16} label="Aceptando" /> : null}
                    Aceptar
                  </button>
                </div>
              )}

              {kind === "invite" && item.status === "pending" && (
                <div>
                  <button
                    onClick={() => run(item, "cancel", `Cancelaste la invitación a ${item.club.name}`)}
                    disabled={busy !== null}
                    className={btnText}
                  >
                    {isBusy ? <Spinner size={16} label="Cancelando" /> : null}
                    Cancelar invitación
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
