"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { createRequest, getClubs, getTournament, getTournamentRequests, resolveRequest, type ClubListItem } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { useAuth } from "@/lib/auth-context";
import { OPEN_STATUSES } from "@/_lib/tournament-labels";
import { ClubAvatar } from "@/_components/club-avatar";
import { PageSpinner, Spinner } from "@/_components/spinner";
import { Toast } from "@/_components/toast";
import { RequestStatusChip } from "@/_components/request-status-chip";
import { btnOutline, btnSolid, btnText } from "@/_components/button-styles";

export default function BuscarEquipoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: clubs } = useApi(() => getClubs());
  const { data: tournament, refetch } = useApi(() => getTournament(params.id));
  const { data: requests, refetch: refetchRequests } = useApi(() => getTournamentRequests(params.id, { status: "pending" }));
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  // Equipos que ya están inscritos en este torneo, y solicitudes o invitaciones pendientes por club.
  const enrolled = useMemo(() => new Set((tournament?.teams ?? []).map((t) => t.club.id)), [tournament]);
  const pendingByClub = useMemo(() => new Map((requests ?? []).map((r) => [r.club.id, r])), [requests]);

  const filtered = useMemo(() => {
    const list = clubs ?? [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        (c.delegadoNombre ?? "").toLowerCase().includes(q)
    );
  }, [query, clubs]);

  function notify(message: string, tone: "success" | "error") {
    setToast({ message, tone });
  }

  function reload() {
    refetch();
    refetchRequests();
  }

  async function act(club: ClubListItem, run: () => Promise<{ ok: boolean; error: string | null }>, success: string) {
    setPending(club.id);
    const result = await run();
    setPending(null);
    if (!result.ok) {
      notify(result.error ?? "No se pudo completar la acción", "error");
      reload(); // la lista pudo quedar vieja (otro cambió el cupo o resolvió la solicitud)
      return;
    }
    notify(success, "success");
    reload();
  }

  const add = (club: ClubListItem) =>
    act(
      club,
      async () => {
        const res = await fetch(`/api/tournaments/${params.id}/teams`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clubId: club.id }),
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, error: res.ok ? null : (data.error ?? null) };
      },
      `${club.name} se unió al torneo`
    );
  const invite = (club: ClubListItem) =>
    act(club, () => createRequest(params.id, club.id), `Invitación enviada a ${club.name}`);
  const resolve = (club: ClubListItem, requestId: string, action: "accept" | "cancel") =>
    act(
      club,
      () => resolveRequest(requestId, action),
      action === "accept" ? `${club.name} se unió al torneo` : `Cancelaste la invitación a ${club.name}`
    );
  const remove = (club: ClubListItem) =>
    act(
      club,
      async () => {
        const res = await fetch(`/api/tournaments/${params.id}/teams/${club.id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, error: res.ok ? null : (data.error ?? null) };
      },
      `Quitaste a ${club.name}`
    );

  if (!clubs || !tournament) return <PageSpinner />;

  const isOpen = OPEN_STATUSES.includes(tournament.status);
  const isFull = tournament.teams.length >= (tournament.maxTeams ?? Infinity);

  function renderAction(club: ClubListItem) {
    const isBusy = pending === club.id;
    const spinner = isBusy ? <Spinner size={16} label="Procesando" /> : null;
    const locked = pending !== null;

    if (enrolled.has(club.id)) {
      return (
        <button onClick={() => remove(club)} disabled={locked || !isOpen} className={btnText}>
          {spinner}
          Quitar
        </button>
      );
    }
    const req = pendingByClub.get(club.id);
    if (req?.kind === "invite") {
      return (
        <button onClick={() => resolve(club, req.id, "cancel")} disabled={locked || !isOpen} className={btnText}>
          {spinner}
          Cancelar
        </button>
      );
    }
    if (req?.kind === "request") {
      return (
        <button onClick={() => resolve(club, req.id, "accept")} disabled={locked || !isOpen || isFull} className={btnSolid}>
          {spinner}
          Aceptar
        </button>
      );
    }
    // Un club propio se agrega directo; el de otro dueño debe aceptar una invitación.
    const own = club.ownerId === user?.id;
    return (
      <button onClick={() => (own ? add(club) : invite(club))} disabled={locked || !isOpen || isFull} className={btnOutline}>
        {spinner}
        {own ? "Agregar" : "Invitar"}
      </button>
    );
  }

  function renderState(club: ClubListItem) {
    if (enrolled.has(club.id)) {
      return <span className="inline-flex items-center rounded-full bg-verification/20 px-2.5 py-0.5 text-xs font-medium text-brand-900">Inscrito</span>;
    }
    const req = pendingByClub.get(club.id);
    if (req?.kind === "invite") {
      return (
        <span className="inline-flex items-center gap-1.5">
          <RequestStatusChip status="pending" />
          <span className="font-body text-xs text-text-secondary">Invitación enviada</span>
        </span>
      );
    }
    if (req?.kind === "request") {
      return (
        <span className="inline-flex items-center gap-1.5">
          <RequestStatusChip status="pending" />
          <span className="font-body text-xs text-text-secondary">Pidió unirse</span>
        </span>
      );
    }
    return null;
  }

  return (
    <div className="w-full pb-8">
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}

      {/* Header */}
      <header className="px-4 py-3">
        <button
          onClick={() => router.back()}
          className="flex min-h-11 cursor-pointer items-center gap-1 font-heading text-sm font-semibold text-text-primary"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180" aria-hidden="true">
            <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver
        </button>
      </header>

      {/* Search */}
      <div className="mt-2 px-4">
        <label htmlFor="buscar-equipo" className="mb-2 block font-heading text-base font-semibold text-text-primary">
          Buscar equipo
        </label>
        <div className="relative">
          <input
            id="buscar-equipo"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre del equipo o del delegado"
            className="w-full rounded-lg border border-transparent bg-btn-regular px-3 py-3 pr-10 font-body text-base text-text-primary placeholder:text-text-primary/60 transition-colors hover:border-border-primary hover:bg-surface-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary/20"
          />
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
          >
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        <p className="mt-2 font-body text-xs text-text-secondary">
          {tournament.teams.length} de {tournament.maxTeams ?? "?"} equipos inscritos
          {!isOpen && " · El torneo ya empezó, no se pueden agregar equipos."}
          {isOpen && isFull && " · El torneo ya tiene todos sus equipos."}
        </p>
        <p className="mt-1 font-body text-xs text-text-secondary">
          Al invitar a un equipo, su dueño debe aceptar para que quede inscrito.
        </p>
      </div>

      {/* Results */}
      <div className="mt-6 px-4">
        <h2 className="mb-2 font-heading text-lg font-bold text-text-primary">
          {query.trim() ? "Resultados" : "Equipos de la comunidad"}
        </h2>

        {filtered.length === 0 ? (
          <p className="py-8 text-center font-body text-sm text-text-secondary">No se encontraron equipos</p>
        ) : (
          <ul className="flex flex-col">
            {filtered.map((club) => (
              <li key={club.id} className="flex items-center gap-3 border-b border-brand-200 py-3 last:border-0">
                <ClubAvatar shortName={club.shortName} color={club.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-sm font-bold text-text-primary">{club.name}</p>
                  <p className="mt-0.5 truncate font-body text-xs text-text-secondary">
                    {club.delegadoNombre ? (
                      <>
                        Delegado <span className="font-semibold">{club.delegadoNombre}</span>
                      </>
                    ) : (
                      "Sin delegado"
                    )}
                  </p>
                  <div className="mt-1 empty:hidden">{renderState(club)}</div>
                </div>
                <div className="shrink-0">{renderAction(club)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
