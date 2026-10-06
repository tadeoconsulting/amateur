"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createRequest,
  getClubs,
  getMatches,
  getMyRequests,
  getScorers,
  getStandings,
  getTournament,
  modalityLabel,
  resolveRequest,
  type ClubListItem,
  type TournamentDetail,
} from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { useTournamentRealtime } from "@/_lib/use-tournament-realtime";
import { useAuth, type AuthUser } from "@/lib/auth-context";
import { formatLabel, OPEN_STATUSES } from "@/_lib/tournament-labels";
import { btnOutline, btnSolid, btnText } from "@/_components/button-styles";
import { PageSpinner, Spinner } from "@/_components/spinner";
import { RequestStatusChip } from "@/_components/request-status-chip";
import { Toast } from "@/_components/toast";
import { FixtureTabs } from "@/_components/fixture-tabs";
import { ClubCrest } from "@/_components/club-crest";
import { PlayerAvatar } from "@/_components/player-avatar";

type Notify = (message: string, tone: "success" | "error") => void;
type MainTab = "fixture" | "resultados" | "detalles";
type ResultadosSubTab = "tabla" | "goleadores";

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
  const { data: matchesData, loading: loadingMatches, refetchSilently: refetchMatches } = useApi(() => getMatches({ tournamentId: params.id }));
  const { data: standingsData, refetchSilently: refetchStandings } = useApi(() => getStandings(params.id));
  const { data: scorersData, refetchSilently: refetchScorers } = useApi(() => getScorers(params.id));
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  // null = todavía no eligió: abre en el fixture, o en los detalles si el torneo aún no tiene partidos
  // (una convocatoria abierta no tiene nada que seguir todavía, sí tiene bases y cupos).
  const [pickedTab, setPickedTab] = useState<MainTab | null>(null);
  const [resultadosTab, setResultadosTab] = useState<ResultadosSubTab>("tabla");
  const notify: Notify = (message, tone) => setToast({ message, tone });

  const matches = matchesData ?? [];
  const standings = standingsData ?? [];
  const topScorers = scorersData ?? [];
  // El fan que abre el link ve el seguimiento del torneo — no solo la convocatoria — así que
  // esta pantalla también se suscribe a tiempo real, igual que las de organizador y club (ver
  // el comentario en useTournamentRealtime: hay que escuchar los partidos programados desde
  // antes de que arranquen, no solo los que ya están en_curso).
  const watchMatchIds = matches.filter((m) => m.status !== "finalizado").map((m) => m.id);
  useTournamentRealtime(watchMatchIds, () => {
    refetchMatches();
    refetchStandings();
    refetchScorers();
  });

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
  if (!tournament || loadingAuth || loadingMatches) return <PageSpinner />;
  const mainTab: MainTab = pickedTab ?? (matches.length > 0 ? "fixture" : "detalles");

  const isOpen = OPEN_STATUSES.includes(tournament.status);
  const teams = tournament._count.teams;
  const max = tournament.maxTeams;
  const free = max === null ? null : Math.max(0, max - teams);
  const percent = max ? Math.min(100, Math.round((teams / max) * 100)) : 0;
  // `?unirme=1` es la intención de quien llegó por el botón de pedir unirse: al volver de iniciar
  // sesión, registrarse o crear su equipo, la solicitud se envía sola (ver JoinPanel).
  const nextPath = `/convocatoria/${params.id}?unirme=1`;
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

        {/* Un fan que abre este link no solo viene a inscribir un equipo: quiere seguir el
         * torneo — fixture, tabla, goleadores — igual que lo ve un organizador o un club. */}
        <div className="mt-4 flex gap-2">
          {([
            { key: "fixture", label: "Fixture" },
            { key: "resultados", label: "Resultados" },
            // Para el fan esta pestaña se llama "Detalles" (no "Torneo", como en organizador y
            // club) y va al final: lo primero que busca es el seguimiento.
            { key: "detalles", label: "Detalles" },
          ] as { key: MainTab; label: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setPickedTab(t.key)}
              className={`cursor-pointer rounded-lg px-4 py-2 font-heading text-sm font-medium transition-colors ${
                mainTab === t.key ? "bg-surface-secondary text-text-invert" : "border border-border-primary text-text-primary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {mainTab === "detalles" && (
          <>
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

            {tournament.sponsors.length > 0 && (
              <section className="mt-6">
                <h2 className="font-heading text-lg font-bold text-text-primary">Con el auspicio de</h2>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {tournament.sponsors.map((s) => {
                    const logo = s.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- logo de sponsor: URL externa arbitraria.
                      <img src={s.logoUrl} alt={s.name} className="h-12 max-w-[140px] rounded-lg border border-border-primary bg-white object-contain p-1.5" />
                    ) : (
                      <div className="flex h-12 items-center rounded-lg border border-border-primary px-3 font-heading text-sm font-bold text-text-primary">
                        {s.name}
                      </div>
                    );
                    return s.website ? (
                      <a key={s.id} href={s.website} target="_blank" rel="noreferrer" aria-label={s.name}>
                        {logo}
                      </a>
                    ) : (
                      <span key={s.id}>{logo}</span>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {mainTab === "fixture" && (
          <div className="mt-4 -mx-4">
            <FixtureTabs matches={matches} />
          </div>
        )}

        {mainTab === "resultados" && (
          <div className="mt-4">
            <div className="flex gap-4 border-b border-border-primary">
              {(["tabla", "goleadores"] as ResultadosSubTab[]).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setResultadosTab(sub)}
                  className={`cursor-pointer pb-2 font-body text-sm capitalize transition-colors ${
                    resultadosTab === sub ? "border-b-2 border-text-primary font-semibold text-text-primary" : "text-text-secondary"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>

            {resultadosTab === "tabla" && (
              <div className="mt-4 overflow-x-auto rounded-xl border border-border-primary">
                <table className="w-full text-left font-body text-xs">
                  <thead>
                    <tr className="border-b border-border-primary bg-brand-100">
                      <th className="px-2 py-2 font-heading text-[10px] font-semibold text-text-secondary">#</th>
                      <th className="px-2 py-2 font-heading text-[10px] font-semibold text-text-secondary">Equipo</th>
                      <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">PJ</th>
                      <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">G</th>
                      <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">E</th>
                      <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">P</th>
                      <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">DG</th>
                      <th className="px-2 py-2 text-center font-heading text-[10px] font-semibold text-text-secondary">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row) => (
                      <tr key={row.position} className="border-b border-border-primary last:border-0">
                        <td className="px-2 py-2.5">
                          <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                            row.position <= 2 ? "bg-verification text-white" : row.position >= 7 ? "bg-error text-white" : "bg-brand-200 text-text-secondary"
                          }`}>
                            {row.position}
                          </div>
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-2">
                            <ClubCrest club={row} />
                            <span className="truncate font-heading text-xs font-semibold text-text-primary">{row.shortName}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-center text-text-secondary">{row.played}</td>
                        <td className="px-2 py-2.5 text-center text-text-secondary">{row.won}</td>
                        <td className="px-2 py-2.5 text-center text-text-secondary">{row.drawn}</td>
                        <td className="px-2 py-2.5 text-center text-text-secondary">{row.lost}</td>
                        <td className="px-2 py-2.5 text-center text-text-secondary">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                        <td className="px-2 py-2.5 text-center font-heading font-bold text-text-primary">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {standings.length === 0 && (
                  <p className="px-4 py-8 text-center font-body text-sm text-text-secondary">Todavía no hay partidos jugados.</p>
                )}
              </div>
            )}

            {resultadosTab === "goleadores" && (
              <div className="mt-4 flex flex-col gap-2">
                {topScorers.map((p, i) => (
                  <div
                    key={p.playerId}
                    className={`flex items-center gap-3 rounded-xl p-3 ${i === 0 ? "border-2 border-yellow bg-yellow/5" : "border border-border-primary"}`}
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0 ? "bg-yellow text-white" : "bg-brand-200 text-text-secondary"
                    }`}>
                      {i + 1}
                    </div>
                    <PlayerAvatar avatarUrl={p.avatarUrl} size="h-8 w-8" iconSize={14} iconClass="text-text-secondary" />
                    <div className="min-w-0 flex-1">
                      <p className="font-heading text-sm font-bold text-text-primary">
                        {p.firstName} {p.lastName}
                      </p>
                      <p className="font-body text-xs text-text-secondary">{p.clubName}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-text-secondary">
                        <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1" />
                        <path d="M7 1.75l1 2h-2l1-2zM3.5 5l2 1-1 2-2-1 1-2zM10.5 5l-2 1 1 2 2-1-1-2zM5 10.5l2-1 2 1-1 2H6l-1-2z" fill="currentColor" opacity="0.3" />
                      </svg>
                      <span className="font-heading text-sm font-bold text-text-primary">{p.goals}</span>
                    </div>
                  </div>
                ))}
                {topScorers.length === 0 && (
                  <p className="py-8 text-center font-body text-sm text-text-secondary">Todavía no hay goles registrados.</p>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Acción: fija abajo, respetando el área segura del celular */}
      <footer className="sticky bottom-0 border-t border-brand-200 bg-surface-primary px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {!user ? (
          <div className="flex flex-col gap-2">
            <p className="font-body text-xs text-text-secondary">Para pedir unirte, entra con la cuenta de tu equipo o crea una: al terminar, tu solicitud se envía sola.</p>
            <div className="flex gap-2">
              <Link href={`/?auth=login&next=${encodeURIComponent(nextPath)}`} className={`${btnSolid} flex-1`}>
                Iniciar sesión
              </Link>
              <Link href={`/?auth=register&rol=CLUB_OWNER&next=${encodeURIComponent(nextPath)}`} className={`${btnOutline} flex-1`}>
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

  // Quien vino a pedir unirse (`?unirme=1`, que dejan los botones de iniciar sesión / crear cuenta /
  // crear mi equipo de esta misma pantalla) no debería tener que volver a tocar "Solicitar unirme"
  // después de registrarse o crear su equipo: con un solo equipo, la solicitud se envía sola. El
  // organizador sigue decidiendo si entra. Con varios equipos no se adivina cuál: se elige abajo.
  const autoRequested = useRef(false);
  useEffect(() => {
    if (autoRequested.current || !clubs || !mine) return;
    if (new URLSearchParams(window.location.search).get("unirme") !== "1") return;
    autoRequested.current = true;
    window.history.replaceState(null, "", window.location.pathname); // la intención se usa una sola vez

    const only = clubs.length === 1 ? clubs[0] : null;
    const isFull = tournament.maxTeams !== null && tournament._count.teams >= tournament.maxTeams;
    if (!only || !isOpen || isFull || user.id === tournament.organizerId) return;
    if (enrolledIds.has(only.id) || mine.some((r) => r.club.id === only.id)) return;

    void (async () => {
      const result = await createRequest(tournament.id, only.id);
      if (!result.ok) {
        notify(result.error ?? "No se pudo enviar la solicitud", "error");
        onChanged();
        return;
      }
      notify(`Solicitud enviada con ${only.name}. El organizador la revisará.`, "success");
      refetchMine();
    })();
  }, [clubs, mine, isOpen, user.id, tournament, enrolledIds, notify, onChanged, refetchMine]);

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
