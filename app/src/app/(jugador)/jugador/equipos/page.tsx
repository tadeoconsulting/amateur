"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUser, setActiveClub } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { useAuth } from "@/lib/auth-context";
import { notifyChanged } from "@/_lib/notifications-changed";
import { BackHeader } from "@/_components/back-header";
import { ClubCrest } from "@/_components/club-crest";
import { type PlayerClub } from "../../_components/club-switcher";

interface InvitationRow {
  token: string;
  invitedBy: string;
  club: PlayerClub;
}

function Invitations({ onJoined }: { onJoined: () => void }) {
  const { data: invitations, refetch } = useApi<InvitationRow[]>(() =>
    fetch("/api/invitations/mine").then((r) => (r.ok ? r.json() : []))
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Aceptar suma el equipo a los que ya tiene: un jugador puede estar en varios.
  async function respond(inv: InvitationRow, action: "accept" | "decline") {
    setBusy(inv.token);
    setError("");
    try {
      const res = await fetch(`/api/invitations/${inv.token}/${action}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo completar la acción");
        return;
      }
      refetch();
      notifyChanged();
      if (action === "accept") onJoined();
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setBusy(null);
    }
  }

  if (!invitations || invitations.length === 0) return null;

  return (
    <div className="mt-6 px-4">
      <h2 className="font-heading text-sm font-bold text-text-primary">Invitaciones</h2>
      <div className="mt-2 space-y-2">
        {invitations.map((inv) => (
          <div key={inv.token} className="rounded border border-border-primary bg-btn-regular px-4 py-3">
            <div className="flex items-center gap-3">
              <ClubCrest club={inv.club} size="h-10 w-10" textSize="text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-sm font-bold text-text-primary">{inv.club.name}</p>
                <p className="truncate text-xs text-text-secondary">Te invitó {inv.invitedBy}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => respond(inv, "accept")}
                disabled={busy === inv.token}
                className="flex-1 cursor-pointer rounded bg-surface-secondary py-2 font-heading text-sm font-bold text-text-invert disabled:opacity-50"
              >
                Aceptar
              </button>
              <button
                onClick={() => respond(inv, "decline")}
                disabled={busy === inv.token}
                className="flex-1 cursor-pointer rounded border border-border-primary py-2 font-heading text-sm font-bold text-text-primary disabled:opacity-50"
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

/** Una fila de equipo, como en el diseño: tarjeta oscura con el escudo grande, el nombre y "Elegir". */
function ClubCard({ club, active, busy, onChoose }: { club: PlayerClub; active: boolean; busy: boolean; onChoose: () => void }) {
  return (
    <div className="relative flex items-center justify-between overflow-hidden rounded bg-surface-secondary p-3">
      {/* La franja en diagonal con el color del club, al fondo a la izquierda */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1/4 opacity-90"
        style={{ background: `linear-gradient(115deg, ${club.color ?? "#4D4D4D"} 0 58%, transparent 59%)` }}
      />
      <div className="relative flex items-center gap-1.5">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white/90">
          <ClubCrest club={club} size="size-11" textSize="text-[11px]" />
        </div>
        <span className="font-heading text-sm font-bold text-surface-primary">{club.name}</span>
        {active && (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-label="Equipo actual" className="shrink-0 text-verification">
            <circle cx="10" cy="10" r="10" fill="currentColor" />
            <path d="M5.5 10.5l3 3 6-6.5" stroke="#1b1b1b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      {active ? (
        <span className="relative font-heading text-sm font-semibold text-text-invert/70">Seleccionado</span>
      ) : (
        <button
          onClick={onChoose}
          disabled={busy}
          className="relative cursor-pointer font-heading text-sm font-semibold text-text-invert underline disabled:opacity-50"
        >
          Elegir
        </button>
      )}
    </div>
  );
}

function MyTeams({ userId }: { userId: string }) {
  const router = useRouter();
  // Los equipos del jugador salen de sus fichas (una por club donde juega).
  const { data: me, loading, refetch } = useApi(() => getUser(userId));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (loading && !me) {
    return (
      <div className="flex w-full items-center justify-center pt-32">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const clubs = (me?.playerProfiles ?? []).flatMap((p) => (p.club ? [p.club] : []));
  const activeId = clubs.find((c) => c.id === me?.activeClubId)?.id ?? clubs[0]?.id ?? null;

  async function choose(club: PlayerClub) {
    setBusyId(club.id);
    setError("");
    const result = await setActiveClub(userId, club.id);
    setBusyId(null);
    if (!result.ok) {
      setError(result.error ?? "No se pudo elegir el equipo");
      return;
    }
    router.push("/jugador/torneos"); // sale a la cancha con ese equipo: ahí ve su actividad
  }

  return (
    <div className="w-full pb-8">
      {/* Esta pantalla no lleva la barra inferior (como en el diseño): "Volver" lleva a Ajustes, de donde se llega. */}
      <BackHeader onBack={() => router.push("/jugador/ajustes")} />

      <div className="px-4">
        <h1 className="font-heading text-[22px] font-bold leading-[26px] text-text-primary">
          {clubs.length > 0 ? "¿Con qué equipo sales a la cancha hoy?" : "Mis equipos"}
        </h1>
      </div>

      <Invitations onJoined={refetch} />

      {clubs.length > 0 ? (
        <div className="mt-6 flex flex-col gap-2 px-4">
          {clubs.map((club) => (
            <ClubCard key={club.id} club={club} active={club.id === activeId} busy={busyId !== null} onChoose={() => choose(club)} />
          ))}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>
      ) : (
        <div className="flex flex-col items-center px-6 pt-16 text-center">
          <h2 className="font-heading text-lg font-bold text-text-primary">Aún no perteneces a ningún equipo</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Busca un equipo y pide unirte, pídele a tu club su link de invitación, o espera a que te inviten.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 px-4">
        <Link
          href="/jugador/equipos/buscar"
          className="flex items-center justify-center gap-2 rounded bg-surface-secondary p-3 font-heading text-sm font-bold text-text-invert"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {clubs.length > 0 ? "Agregar un equipo" : "Buscar equipos"}
        </Link>
        <Link href="/jugador/ajustes/perfil/editar" className="py-2 text-center font-heading text-sm font-bold text-text-primary underline">
          Editar perfil
        </Link>
      </div>
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
  // `key`: si cambia la persona, se remonta para pedir sus equipos (el useApi pide una sola vez).
  return <MyTeams key={user.id} userId={user.id} />;
}
