"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getTournaments, getTournamentRequests, resolveRequest, type TournamentListItem, type TournamentRequestItem } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { Toast } from "@/_components/toast";

/** Una solicitud, junto con a qué torneo pertenece (varios torneos comparten esta pantalla). */
type SolicitudConTorneo = TournamentRequestItem & { tournamentId: string; tournamentName: string };

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );
}

export default function NotificacionesPage() {
  const { user, loading: loadingAuth } = useAuth();
  if (loadingAuth || !user) return <Spinner />;
  return <NotificacionesContent organizerId={user.id} />;
}

function NotificacionesContent({ organizerId }: { organizerId: string }) {
  const { data: tournaments, loading: loadingTournaments } = useApi(() => getTournaments({ organizerId }));

  if (loadingTournaments || !tournaments) return <Spinner />;
  // key: si la lista de torneos cambia de tamaño (se creó uno nuevo), se remonta y pide de
  // nuevo — igual razón que en /club/equipo: useApi solo pide una vez al montar.
  return <SolicitudesContent key={tournaments.length} tournaments={tournaments} />;
}

function SolicitudesContent({ tournaments }: { tournaments: TournamentListItem[] }) {
  const [resolving, setResolving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  // Un club pidió unirse a alguno de mis torneos: es lo único que de verdad necesita mi
  // decisión (una invitación que YO mandé solo espera al club, no a mí).
  const { data: solicitudes, loading: loadingRequests, refetch } = useApi<SolicitudConTorneo[]>(async () => {
    const perTournament = await Promise.all(
      tournaments.map((t) =>
        getTournamentRequests(t.id, { kind: "request", status: "pending" }).then((reqs) =>
          reqs.map((r) => ({ ...r, tournamentId: t.id, tournamentName: t.name }))
        )
      )
    );
    return perTournament.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  const handleResolve = async (id: string, action: "accept" | "decline", clubName: string) => {
    setResolving(id);
    const res = await resolveRequest(id, action);
    setResolving(null);
    if (!res.ok) {
      setToast({ message: res.error ?? "No se pudo procesar la solicitud", tone: "error" });
      return;
    }
    setToast({
      message: action === "accept" ? `${clubName} se unió al torneo` : `Rechazaste a ${clubName}`,
      tone: "success",
    });
    refetch();
  };

  return (
    <div className="flex min-h-dvh flex-col pb-4">
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-text-primary">
          <path
            d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h1 className="font-heading text-xl font-bold text-text-primary">Notificaciones</h1>
      </div>

      {loadingRequests || !solicitudes ? (
        <Spinner />
      ) : solicitudes.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3 px-4">
          {solicitudes.map((s) => (
            <div key={s.id} className="rounded-xl border border-border-primary p-4">
              <div className="mb-2 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-text-primary">
                  <path
                    d="M2 2h4l1 3-2 2a11 11 0 004 4l2-2 3 1v4a1 1 0 01-1 1A13 13 0 011 3a1 1 0 011-1z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <h3 className="font-heading text-sm font-bold text-text-primary">
                  {s.club.name} quiere unirse a {s.tournamentName}
                </h3>
              </div>
              <p className="font-body text-sm leading-relaxed text-text-secondary">
                Pedido por {s.createdBy.firstName} {s.createdBy.lastName}
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  onClick={() => handleResolve(s.id, "accept", s.club.name)}
                  disabled={resolving === s.id}
                  className="flex-1 cursor-pointer rounded-lg bg-surface-secondary py-2 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                  Aceptar
                </button>
                <button
                  onClick={() => handleResolve(s.id, "decline", s.club.name)}
                  disabled={resolving === s.id}
                  className="flex-1 cursor-pointer rounded-lg border border-border-primary py-2 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular disabled:opacity-50"
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-text-secondary">
              <path
                d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="mt-4 font-body text-sm text-text-secondary">No tienes notificaciones aún.</p>
        </div>
      )}
    </div>
  );
}
