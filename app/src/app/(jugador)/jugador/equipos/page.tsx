"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi } from "@/_lib/use-api";
import { useAuth } from "@/lib/auth-context";

interface ClubRow {
  id: string;
  name: string;
  shortName: string;
  color: string | null;
}

interface InvitationRow {
  token: string;
  invitedBy: string;
  club: ClubRow;
}

function ClubBadge({ club, size = "h-10 w-10" }: { club: ClubRow; size?: string }) {
  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-full`}
      style={{ backgroundColor: (club.color || "#E5E7EB") + "20" }}
    >
      <span className="font-heading text-xs font-bold" style={{ color: club.color || "#6B7280" }}>
        {club.shortName}
      </span>
    </div>
  );
}

function Invitations({ onJoined }: { onJoined: () => void }) {
  const { data: invitations, refetch } = useApi<InvitationRow[]>(() =>
    fetch("/api/invitations/mine").then((r) => (r.ok ? r.json() : []))
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  // Si ya está en otro club, se pide confirmar antes de cambiarse.
  const [switching, setSwitching] = useState<{ token: string; from: string; to: string } | null>(null);

  async function respond(inv: InvitationRow, action: "accept" | "decline", replace = false) {
    setBusy(inv.token);
    setError("");
    try {
      const res = await fetch(`/api/invitations/${inv.token}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replace }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.currentClub) {
        setSwitching({ token: inv.token, from: data.currentClub.name, to: inv.club.name });
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "No se pudo completar la acción");
        return;
      }
      setSwitching(null);
      refetch();
      if (action === "accept") onJoined();
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setBusy(null);
    }
  }

  if (!invitations || invitations.length === 0) return null;

  return (
    <div className="mt-4 px-4">
      <h2 className="font-heading text-sm font-bold text-text-primary">Invitaciones</h2>
      <div className="mt-2 space-y-2">
        {invitations.map((inv) => (
          <div key={inv.token} className="rounded-lg border border-brand-200 bg-btn-regular px-4 py-3">
            <div className="flex items-center gap-3">
              <ClubBadge club={inv.club} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-primary">{inv.club.name}</p>
                <p className="truncate text-xs text-text-secondary">Te invitó {inv.invitedBy}</p>
              </div>
            </div>

            {switching?.token === inv.token && (
              <p className="mt-3 text-xs text-text-primary">
                Ya perteneces a <span className="font-semibold">{switching.from}</span>. Si aceptas, dejarás ese equipo y
                perderás tu categoría y dorsal.
              </p>
            )}

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => respond(inv, "accept", switching?.token === inv.token)}
                disabled={busy === inv.token}
                className="flex-1 cursor-pointer rounded-lg bg-surface-secondary py-2 text-sm font-semibold text-text-invert disabled:opacity-50"
              >
                {switching?.token === inv.token ? `Cambiarme a ${switching.to}` : "Aceptar"}
              </button>
              <button
                onClick={() => respond(inv, "decline")}
                disabled={busy === inv.token}
                className="flex-1 cursor-pointer rounded-lg border border-border-primary py-2 text-sm font-semibold text-text-primary disabled:opacity-50"
              >
                Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function MyTeams({ userId }: { userId: string }) {
  // El club del jugador sale de su propio perfil (antes esta pantalla listaba todos los clubes).
  const { data: me, loading, refetch } = useApi<{ playerProfile: { club: ClubRow | null } | null }>(() =>
    fetch(`/api/users/${userId}`).then((r) => r.json())
  );

  if (loading && !me) {
    return (
      <div className="flex w-full items-center justify-center pt-32">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const club = me?.playerProfile?.club ?? null;

  return (
    <div className="w-full">
      <div className="px-4 pt-4">
        <h1 className="font-heading text-xl font-bold text-text-primary">Mis Equipos</h1>
      </div>

      <Invitations onJoined={refetch} />

      {club ? (
        <div className="mt-4 space-y-2 px-4 pb-8">
          <div className="flex items-center justify-between rounded-lg border border-brand-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <ClubBadge club={club} />
              <p className="text-sm font-semibold text-text-primary">{club.name}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 pt-24 text-center">
          <h2 className="font-heading text-lg font-bold text-text-primary">Aún no perteneces a ningún equipo</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Pídele a tu club su link de invitación, o espera a que te inviten.
          </p>
          <Link href="/jugador/ajustes/perfil" className="mt-6 text-sm font-medium text-text-primary underline">
            Editar perfil
          </Link>
        </div>
      )}
    </div>
  );
}

export default function JugadorEquiposPage() {
  const { user } = useAuth();
  if (!user) {
    return (
      <div className="flex w-full items-center justify-center pt-32">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }
  return <MyTeams userId={user.id} />;
}
