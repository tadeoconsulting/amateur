"use client";

import { useState } from "react";
import Link from "next/link";
import { getClubs, type ClubListItem } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { useAuth } from "@/lib/auth-context";
import { ClubCrest } from "@/_components/club-crest";

interface MyJoinRequest {
  id: string;
  club: { id: string; name: string };
}

function ClubBadge({ club }: { club: Pick<ClubListItem, "shortName" | "color" | "logoUrl"> }) {
  return (
    <ClubCrest club={club} size="h-10 w-10" textSize="text-xs" />
  );
}

/** `myClubIds`: los equipos donde ya juega. Puede sumarse a otros (cada uno es una ficha propia). */
function BuscarEquiposContent({ myClubIds }: { myClubIds: string[] }) {
  const [search, setSearch] = useState("");
  const { data: clubs, loading } = useApi(() => getClubs());
  const { data: myRequests, refetch: refetchMine } = useApi<MyJoinRequest[]>(() =>
    fetch("/api/player-join-requests/mine").then((r) => (r.ok ? r.json() : []))
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const pendingClubIds = new Set((myRequests ?? []).map((r) => r.club.id));
  const memberClubIds = new Set(myClubIds);

  async function solicitar(clubId: string) {
    setBusyId(clubId);
    setError("");
    try {
      const res = await fetch(`/api/clubs/${clubId}/join-requests`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo enviar la solicitud");
        return;
      }
      refetchMine();
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setBusyId(null);
    }
  }

  async function cancelar(requestId: string) {
    setBusyId(requestId);
    setError("");
    try {
      const res = await fetch(`/api/player-join-requests/${requestId}/cancel`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo cancelar la solicitud");
        return;
      }
      refetchMine();
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = (clubs ?? []).filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="w-full pb-8">
      <div className="flex items-center gap-2 px-4 pt-4">
        <Link href="/jugador/equipos" className="shrink-0 p-1 text-text-primary">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180">
            <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="font-heading text-xl font-bold text-text-primary">Buscar equipos</h1>
      </div>

      <>
          <div className="px-4 pt-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre"
              className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-3 text-sm text-text-primary placeholder:text-text-secondary outline-none focus:border-text-primary"
            />
          </div>

          {error && <p className="mt-3 px-4 text-sm text-red-600">{error}</p>}

          {loading ? (
            <div className="flex items-center justify-center pt-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-6 pt-16 text-center text-sm text-text-secondary">
              No encontramos equipos con ese nombre.
            </p>
          ) : (
            <div className="mt-2 space-y-2 px-4">
              {filtered.map((club) => {
                const pending = pendingClubIds.has(club.id);
                const pendingRequest = (myRequests ?? []).find((r) => r.club.id === club.id);
                return (
                  <div key={club.id} className="flex items-center gap-3 rounded-lg border border-border-primary px-4 py-3">
                    <ClubBadge club={club} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">{club.name}</p>
                      <p className="text-xs text-text-secondary">{club.playerCount} jugadores</p>
                    </div>
                    {memberClubIds.has(club.id) ? (
                      <span className="shrink-0 rounded-lg border border-border-primary px-3 py-2 text-xs font-semibold text-text-secondary">
                        Ya eres parte
                      </span>
                    ) : pending && pendingRequest ? (
                      <button
                        onClick={() => cancelar(pendingRequest.id)}
                        disabled={busyId === pendingRequest.id}
                        className="shrink-0 cursor-pointer rounded-lg border border-border-primary px-3 py-2 text-xs font-semibold text-text-primary disabled:opacity-50"
                      >
                        Pendiente · Cancelar
                      </button>
                    ) : (
                      <button
                        onClick={() => solicitar(club.id)}
                        disabled={busyId === club.id}
                        className="shrink-0 cursor-pointer rounded-lg bg-surface-secondary px-3 py-2 text-xs font-semibold text-text-invert disabled:opacity-50"
                      >
                        Solicitar unirme
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
      </>
    </div>
  );
}

/** Se monta solo cuando ya se conoce el usuario: el useApi de adentro pide una sola vez, al
 * montar, así que necesita el id correcto desde el primer render (ver "use-api.ts"). */
function BuscarEquiposForUser({ userId }: { userId: string }) {
  const { data: me, loading } = useApi<{ playerProfiles: { club: { id: string } | null }[] }>(() =>
    fetch(`/api/users/${userId}`).then((r) => r.json())
  );

  if (loading && !me) {
    return (
      <div className="flex w-full items-center justify-center pt-32">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return <BuscarEquiposContent myClubIds={(me?.playerProfiles ?? []).flatMap((p) => (p.club ? [p.club.id] : []))} />;
}

export default function BuscarEquiposPage() {
  const { user, loading: loadingAuth } = useAuth();

  if (loadingAuth || !user) {
    return (
      <div className="flex w-full items-center justify-center pt-32">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  // `key` fuerza a remontar si el usuario cambia, así el useApi de adentro no se queda
  // pegado al id anterior (mismo patrón que club/equipo, club/torneos).
  return <BuscarEquiposForUser key={user.id} userId={user.id} />;
}
