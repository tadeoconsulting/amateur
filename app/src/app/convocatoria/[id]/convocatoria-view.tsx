"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  createRequest,
  getClubs,
  getMyRequests,
  getTournament,
  modalityLabel,
  resolveRequest,
  type ClubListItem,
  type TournamentDetail,
} from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { useAuth, type AuthUser } from "@/lib/auth-context";
import { formatLabel, OPEN_STATUSES } from "@/_lib/tournament-labels";
import { btnOutline, btnSolid, btnText } from "@/_components/button-styles";
import { PageSpinner, Spinner } from "@/_components/spinner";
import { RequestStatusChip } from "@/_components/request-status-chip";
import { Toast } from "@/_components/toast";

type Notify = (message: string, tone: "success" | "error") => void;

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-brand-200 py-3 last:border-0">
      <dt className="font-body text-xs text-text-secondary">{label}</dt>
      <dd className="font-body text-sm font-semibold text-text-primary">{children}</dd>
    </div>
  );
}

export function ConvocatoriaView() {
  const params = useParams<{ id: string }>();
  const { user, loading: loadingAuth } = useAuth();
  const { data: tournament, error, refetch } = useApi(() => getTournament(params.id));
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const notify: Notify = (message, tone) => setToast({ message, tone });

  if (error) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col items-center justify-center px-6 text-center">
        <h1 className="font-heading text-xl font-bold text-text-primary">Esta convocatoria no existe</h1>
        <p className="mt-2 font-body text-sm text-text-secondary">
          El link puede estar incompleto o el torneo se eliminó. Pídele al organizador que te lo envíe de nuevo.
        </p>
        <Link href="/" className={`${btnOutline} mt-6`}>
          Ir al inicio
        </Link>
      </main>
    );
  }
  if (!tournament || loadingAuth) return <PageSpinner />;

  const isOpen = OPEN_STATUSES.includes(tournament.status);
  const teams = tournament._count.teams;
  const max = tournament.maxTeams;
  const free = max === null ? null : Math.max(0, max - teams);
  const percent = max ? Math.min(100, Math.round((teams / max) * 100)) : 0;
  const nextPath = `/convocatoria/${params.id}`;
  const format = [formatLabel(tournament.format), modalityLabel(tournament.modality)].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-surface-primary">
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}

      <header className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="font-heading text-lg font-bold text-text-primary">
          Amateur
        </Link>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${isOpen ? "bg-yellow/30 text-brand-900" : "bg-brand-300 text-brand-700"}`}
        >
          {isOpen ? "Inscripciones abiertas" : "Inscripciones cerradas"}
        </span>
      </header>

      <main className="flex-1 px-4 pb-6">
        <section className="rounded-2xl bg-surface-secondary p-5 text-text-invert">
          <p className="font-body text-xs text-brand-200">Convocatoria</p>
          <h1 className="mt-1 font-heading text-2xl font-bold leading-tight">{tournament.name}</h1>
          <p className="mt-2 font-body text-sm text-brand-200">
            {[tournament.category || "Libre", format].join(" · ")}
          </p>

          <div className="mt-5">
            <div className="flex items-baseline justify-between font-body text-sm">
              <span>
                <strong className="font-heading text-lg">{teams}</strong>
                {max !== null && <span className="text-brand-200"> de {max} equipos</span>}
              </span>
              {free !== null && (
                <span className="text-brand-200">{free === 0 ? "Sin cupos" : `${free} ${free === 1 ? "cupo libre" : "cupos libres"}`}</span>
              )}
            </div>
            {max !== null && (
              <div
                role="progressbar"
                aria-label="Equipos inscritos"
                aria-valuemin={0}
                aria-valuemax={max}
                aria-valuenow={Math.min(teams, max)}
                className="mt-2 h-2 w-full rounded-full bg-brand-700"
              >
                <div className="h-2 rounded-full bg-verification transition-[width] duration-300" style={{ width: `${percent}%` }} />
              </div>
            )}
          </div>
        </section>

        <dl className="mt-4">
          <Detail label="Inicio">{longDate(tournament.startDate)}</Detail>
          <Detail label="Sede">{tournament.location}</Detail>
          {tournament.gender && <Detail label="Género">{tournament.gender}</Detail>}
          {tournament.minutesPerHalf && <Detail label="Duración">2 tiempos de {tournament.minutesPerHalf} minutos</Detail>}
          <Detail label="Organizador">
            {tournament.organizer.firstName} {tournament.organizer.lastName}
          </Detail>
        </dl>

        {(tournament.registrationFee || tournament.refereeFee || tournament.rules.length > 0) && (
          <section className="mt-6">
            <h2 className="font-heading text-lg font-bold text-text-primary">Bases del torneo</h2>
            {(tournament.registrationFee || tournament.refereeFee) && (
              <dl className="mt-2">
                {tournament.registrationFee && <Detail label="Costo de inscripción">{tournament.registrationFee}</Detail>}
                {tournament.refereeFee && <Detail label="Arbitraje">{tournament.refereeFee}</Detail>}
              </dl>
            )}
            {tournament.rules.length > 0 && (
              <ul className="mt-3 list-disc space-y-1.5 pl-5 font-body text-sm text-text-primary">
                {tournament.rules.map((rule, i) => (
                  <li key={i}>{rule}</li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>

      {/* Acción: fija abajo, respetando el área segura del celular */}
      <footer className="sticky bottom-0 border-t border-brand-200 bg-surface-primary px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {!user ? (
          <div className="flex flex-col gap-2">
            <p className="font-body text-xs text-text-secondary">Necesitas una cuenta para pedir unirte a este torneo.</p>
            <div className="flex gap-2">
              <Link href={`/?auth=login&next=${encodeURIComponent(nextPath)}`} className={`${btnSolid} flex-1`}>
                Iniciar sesión
              </Link>
              <Link href={`/?auth=register&next=${encodeURIComponent(nextPath)}`} className={`${btnOutline} flex-1`}>
                Crear cuenta
              </Link>
            </div>
          </div>
        ) : (
          <JoinPanel user={user} tournament={tournament} isOpen={isOpen} nextPath={nextPath} onChanged={refetch} notify={notify} />
        )}
      </footer>
    </div>
  );
}

/** Lo que puede hacer quien tiene sesión. Se monta ya con la sesión, para consultar una sola vez. */
function JoinPanel({
  user,
  tournament,
  isOpen,
  nextPath,
  onChanged,
  notify,
}: {
  user: AuthUser;
  tournament: TournamentDetail;
  isOpen: boolean;
  nextPath: string;
  onChanged: () => void;
  notify: Notify;
}) {
  const { data: clubs } = useApi(() => getClubs({ ownerId: user.id }));
  const { data: mine, refetch: refetchMine } = useApi(() => getMyRequests({ tournamentId: tournament.id }));
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const enrolledIds = useMemo(() => new Set(tournament.teams.map((t) => t.club.id)), [tournament.teams]);

  if (user.id === tournament.organizerId) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="font-body text-sm text-text-primary">Este es tu torneo.</p>
        <Link href={`/torneos/${tournament.id}`} className={btnOutline}>
          Administrar
        </Link>
      </div>
    );
  }
  if (!clubs || !mine) {
    return (
      <div className="flex min-h-11 items-center justify-center text-brand-500">
        <Spinner />
      </div>
    );
  }
  if (!isOpen) {
    return <p className="font-body text-sm text-text-secondary">Las inscripciones de este torneo ya cerraron.</p>;
  }
  if (clubs.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="font-body text-xs text-text-secondary">Para pedir unirte necesitas un equipo. Crearlo toma un minuto.</p>
        <Link href={`/club?next=${encodeURIComponent(nextPath)}`} className={`${btnSolid} w-full`}>
          Crear mi equipo
        </Link>
      </div>
    );
  }

  const club: ClubListItem = clubs.find((c) => c.id === chosen) ?? clubs.find((c) => !enrolledIds.has(c.id)) ?? clubs[0];
  const req = mine.find((r) => r.club.id === club.id);
  const isFull = tournament.maxTeams !== null && tournament._count.teams >= tournament.maxTeams;

  async function send() {
    setBusy(true);
    const result = await createRequest(tournament.id, club.id);
    setBusy(false);
    if (!result.ok) {
      notify(result.error ?? "No se pudo enviar la solicitud", "error");
      onChanged();
      return;
    }
    notify("Solicitud enviada. El organizador la revisará.", "success");
    refetchMine();
  }

  async function cancel(requestId: string) {
    setBusy(true);
    const result = await resolveRequest(requestId, "cancel");
    setBusy(false);
    if (!result.ok) {
      notify(result.error ?? "No se pudo cancelar", "error");
      refetchMine();
      return;
    }
    notify("Cancelaste tu solicitud.", "success");
    refetchMine();
  }

  return (
    <div className="flex flex-col gap-2">
      {clubs.length > 1 && (
        <div>
          <label htmlFor="club-select" className="mb-1 block font-body text-xs text-text-secondary">
            Solicitar con el equipo
          </label>
          <select
            id="club-select"
            value={club.id}
            onChange={(e) => setChosen(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-border-primary bg-surface-primary px-3 font-body text-base text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary/30"
          >
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {enrolledIds.has(club.id) ? (
        <p role="status" className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-verification/20 font-heading text-sm font-bold text-brand-900">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {club.name} ya está inscrito
        </p>
      ) : req?.kind === "request" ? (
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <RequestStatusChip status="pending" />
            <span className="font-body text-sm text-text-primary">Solicitud enviada</span>
          </span>
          <button onClick={() => cancel(req.id)} disabled={busy} className={btnText}>
            {busy && <Spinner size={16} label="Cancelando" />}
            Cancelar
          </button>
        </div>
      ) : req?.kind === "invite" ? (
        <div className="flex items-center justify-between gap-2">
          <span className="font-body text-sm font-semibold text-text-primary">Este torneo invitó a tu equipo</span>
          <Link href="/club/torneos?tab=solicitudes" className={btnSolid}>
            Responder
          </Link>
        </div>
      ) : (
        <button onClick={send} disabled={busy || isFull} className={`${isFull ? btnOutline : btnSolid} min-h-12 w-full`}>
          {busy && <Spinner size={16} label="Enviando" />}
          {isFull ? "Sin cupos" : "Solicitar unirme"}
        </button>
      )}
    </div>
  );
}
