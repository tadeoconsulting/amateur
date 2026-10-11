"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApi } from "@/_lib/use-api";
import type { MatchDetail, MatchEventItem, PlayerListItem } from "@/_lib/api";
import { ACTION_FROM_EVENT_TYPE, EVENT_TITLES, EVENT_TYPE_FROM_ACTION, isEventType, formatLiveFor, matchClock, halfMinutes, matchDurationMinutes, PERIOD_LABELS, type MatchPeriod, type MatchPhase } from "@/_lib/match-live";
import { PenaltyShootout } from "./_components/penalty-shootout";
import { ClubCrest } from "@/_components/club-crest";


type MatchEvent = {
  id: string;
  type: "gol" | "amarilla" | "roja" | "cambio" | "penal";
  /** El tipo tal como lo guarda la API (ver EventType en match-live.ts): "cambio" arriba es un
   * cajón de 5 acciones tapeables, pero acá hace falta el original para distinguir por ejemplo
   * "penal_definicion" (tanda de penales) de una sustitución real. */
  rawType: string;
  team: "local" | "visitante";
  minute: number;
  playerId: string | null;
  playerName: string | null;
  /** Solo en un cambio: quien entra (`playerName` es quien sale). */
  playerInName: string | null;
  /** Quién la registró (solo lo ve quien gestiona el partido). */
  recordedBy: string | null;
};

export default function EnVivoPage() {
  const params = useParams<{ id: string; matchId: string }>();
  const router = useRouter();
  // La mesa (especificación 011) usa esta misma pantalla desde /mesa: vuelve a su inicio y no reabre partidos.
  const inMesa = usePathname().startsWith("/mesa");
  // Todo sale de la API: el marcador, las jugadas y el momento de inicio (así el cronómetro
  // y la crónica sobreviven a recargar la página).
  const { data: match, refetch: refetchMatch } = useApi<MatchDetail>(() =>
    fetch(`/api/matches/${params.matchId}`).then((r) => r.json())
  );
  const { data: apiEvents, refetch: refetchEvents } = useApi<MatchEventItem[]>(() =>
    fetch(`/api/matches/${params.matchId}/events`).then((r) => r.json())
  );
  const [playersByClub, setPlayersByClub] = useState<Record<string, PlayerListItem[]>>({});

  useEffect(() => {
    // Un partido "por definir" (cuadro de eliminación sin resolver) todavía no tiene equipos.
    if (!match || !match.homeTeam || !match.awayTeam) return;
    const homeId = match.homeTeam.id;
    const awayId = match.awayTeam.id;
    Promise.all(
      [homeId, awayId].map((cid) => fetch(`/api/clubs/${cid}/players`).then((r) => r.json() as Promise<PlayerListItem[]>))
    ).then(([home, away]) => {
      setPlayersByClub({ [homeId]: home, [awayId]: away });
    });
  }, [match]);

  const [now, setNow] = useState(() => Date.now());
  const [activeTeam, setActiveTeam] = useState<"local" | "visitante">("local");
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  // Un cambio tiene dos jugadores: primero quien sale (`selectedPlayer`) y después quien entra.
  const [selectedPlayerIn, setSelectedPlayerIn] = useState<string | null>(null);
  const [choosingIn, setChoosingIn] = useState(false);
  const resetPick = () => {
    setSelectedPlayer(null);
    setSelectedPlayerIn(null);
    setChoosingIn(false);
  };
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);
  // Edición del minuto de una jugada puntual de la crónica: solo una a la vez.
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editMinute, setEditMinute] = useState("");

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Solo la primera carga muestra el spinner: al refrescar tras cada jugada la pantalla no parpadea.
  if (!match) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }
  // Un partido "por definir" (cuadro de eliminación cuyo cruce anterior no terminó) no se
  // puede jugar todavía: la API ya lo rechaza (409), acá solo se evita mostrar una pantalla rota.
  if (!match.homeTeam || !match.awayTeam) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center">
        <p className="font-body text-sm text-text-secondary">
          Este partido todavía no tiene los dos equipos definidos: espera a que termine el cruce anterior.
        </p>
      </div>
    );
  }

  const live = match.status === "en_curso";
  const finished = match.status === "finalizado";
  // El cronómetro cuenta desde el inicio real; fuera de juego se detiene en 0, y si el partido
  // se quedó en vivo sin finalizar se detiene donde se da por colgado (ver isStale).
  const minutesPerHalf = match.tournament.minutesPerHalf;
  const clock = matchClock(match, now, minutesPerHalf);
  const elapsedSeconds = live ? clock.seconds : 0;
  const stale = live && clock.stale;
  // Los dos tiempos (especificación 010); null = un partido que empezó antes de que existieran.
  const period: MatchPeriod | null = match.period ?? null;
  const onBreak = live && period === "descanso";
  const inFirstHalf = live && period === "primer_tiempo";
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const matchDuration = matchDurationMinutes(match.tournament.minutesPerHalf);
  // Al finalizar la barra se completa entera (antes se vaciaba, porque elapsedSeconds vuelve a 0
  // fuera de juego) y hace un pulso una sola vez — ver animate-progress-complete en globals.css.
  const progress = finished ? 100 : live ? Math.min((elapsedSeconds / 60 / matchDuration) * 100, 100) : 0;

  const events: MatchEvent[] = (apiEvents ?? []).map((e) => ({
    id: e.id,
    type: ACTION_FROM_EVENT_TYPE[e.type] ?? "cambio",
    rawType: e.type,
    team: e.teamId === match.awayTeam?.id ? "visitante" : "local",
    minute: e.minute,
    playerId: e.playerId,
    playerName: e.playerName,
    playerInName: e.playerInName ?? null,
    recordedBy: e.recordedBy ?? null,
  }));

  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;

  const activeClubId = activeTeam === "local" ? match.homeTeam?.id : match.awayTeam?.id;
  const teamPlayers = playersByClub[activeClubId] ?? [];

  const playerCards = (playerId: string): { yellow: number; red: number } => {
    const yellow = events.filter((e) => e.playerId === playerId && e.type === "amarilla").length;
    const red = events.filter((e) => e.playerId === playerId && e.type === "roja").length;
    return { yellow, red };
  };

  const actions = [
    {
      id: "gol",
      label: "Gol",
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14 2.5l2.5 4.5h-5L14 2.5zM7 8l4.5 2.5-2 4.5L5 13l2-5zM21 8l-4.5 2.5 2 4.5L23 13l-2-5zM9.5 20l2-4.5h5l2 4.5-4.5 2.5L9.5 20z" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: "amarilla",
      label: "Amarilla",
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="8" y="4" width="12" height="18" rx="2" fill="#FFC107" stroke="#1B1B1B" strokeWidth="1.2" />
        </svg>
      ),
    },
    {
      id: "roja",
      label: "Roja",
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="8" y="4" width="12" height="18" rx="2" fill="#E53935" stroke="#1B1B1B" strokeWidth="1.2" />
        </svg>
      ),
    },
    {
      id: "cambio",
      label: "Cambio",
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M8 10h8l-3-3M20 18h-8l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 7v6M12 15v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "penal",
      label: "Penal",
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="4" y="8" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <line x1="4" y1="8" x2="14" y2="4" stroke="currentColor" strokeWidth="1.2" />
          <line x1="24" y1="8" x2="14" y2="4" stroke="currentColor" strokeWidth="1.2" />
          <line x1="10" y1="8" x2="10" y2="22" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" />
          <line x1="18" y1="8" x2="18" y2="22" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" />
          <line x1="4" y1="15" x2="24" y2="15" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" />
        </svg>
      ),
    },
  ];

  const refresh = () => {
    refetchMatch();
    refetchEvents();
  };

  /** Llama a la API; si falla muestra el mensaje y devuelve false. */
  async function call(url: string, method: string, body?: unknown) {
    setError("");
    setSaving(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo completar la acción");
        return false;
      }
      refresh();
      return true;
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  const matchUrl = `/api/matches/${params.matchId}`;

  const isCambio = selectedAction === "cambio";
  // Mientras se elige quién entra, la lista es la del mismo equipo sin quien ya salió.
  const pickingIn = isCambio && choosingIn;
  const pickedId = pickingIn ? selectedPlayerIn : selectedPlayer;
  const listPlayers = pickingIn ? teamPlayers.filter((p) => p.id !== selectedPlayer) : teamPlayers;
  const pick = (id: string) => (pickingIn ? setSelectedPlayerIn(selectedPlayerIn === id ? null : id) : setSelectedPlayer(selectedPlayer === id ? null : id));
  const outPlayer = teamPlayers.find((p) => p.id === selectedPlayer);
  // Con quien sale elegido, el botón pasa a "quién entra"; sin nadie elegido se guarda el cambio sin jugadores, como siempre.
  const goToIn = isCambio && !choosingIn && selectedPlayer !== null;
  const waitingIn = pickingIn && selectedPlayerIn === null;

  const handleSave = async () => {
    if (!selectedAction || saving || waitingIn) return;
    if (goToIn) return setChoosingIn(true);
    const ok = await call(`${matchUrl}/events`, "POST", {
      type: EVENT_TYPE_FROM_ACTION[selectedAction],
      // El servidor no acepta más de 200 (ver api/matches/[id]/events).
      minute: Math.min(minutes, 200),
      teamId: activeClubId,
      playerId: selectedPlayer,
      ...(isCambio && selectedPlayerIn && { playerInId: selectedPlayerIn }),
    });
    if (ok) {
      setSelectedAction(null);
      resetPick();
    }
  };

  const undoEvent = async (eventId: string) => {
    if (saving) return;
    if (editingEventId === eventId) setEditingEventId(null);
    await call(`${matchUrl}/events/${eventId}`, "DELETE");
  };

  const undoLast = async () => {
    const last = events[events.length - 1];
    if (last) await undoEvent(last.id);
  };

  const startEditMinute = (event: MatchEvent) => {
    setEditingEventId(event.id);
    setEditMinute(String(event.minute));
  };

  const saveEditedMinute = async (eventId: string) => {
    const value = Number(editMinute);
    if (saving || !Number.isInteger(value) || value < 0) return;
    const ok = await call(`${matchUrl}/events/${eventId}`, "PATCH", { minute: value });
    if (ok) setEditingEventId(null);
  };

  const setPeriod = async (next: MatchPeriod) => {
    if (saving) return;
    setSelectedAction(null);
    resetPick();
    await call(matchUrl, "PATCH", { period: next });
  };

  const setStatus = async (status: "en_curso" | "finalizado") => {
    if (saving) return;
    setConfirmEnd(false);
    await call(matchUrl, "PATCH", { status });
  };

  // Un partido decisivo (cuadro de eliminación) no puede terminar empatado: mientras siga
  // así, la pantalla ofrece pasar de fase en vez de "Finalizar partido" (especificación 007).
  const tied = homeScore === awayScore;
  const showPhaseButton = match.decisive && tied && match.phase !== "penales" && !inFirstHalf && !onBreak;
  const nextPhase: MatchPhase = match.phase === "regulacion" ? "tiempo_extra" : "penales";
  const nextPhaseLabel = match.phase === "regulacion" ? "Ir a tiempo extra" : "Ir a penales";

  const advancePhase = async () => {
    if (saving) return;
    await call(matchUrl, "PATCH", { phase: nextPhase });
  };

  const registerPenalty = async (scored: boolean) => {
    if (saving) return;
    await call(`${matchUrl}/events`, "POST", {
      type: "penal_definicion",
      // El servidor no acepta más de 200 (ver api/matches/[id]/events).
      minute: Math.min(minutes, 200),
      teamId: activeClubId,
      scored,
    });
  };

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3">
        {/* Antes usaba router.back(): deshacía cada paso de navegación (partido → torneo →
            lista...) en vez de ir a un destino fijo, así que finalizar un partido y volver
            atrás dejaba a la persona haciendo varios clics para llegar a Partidos. */}
        <button
          onClick={() => router.push(inMesa ? "/mesa" : `/torneos/${params.id}`)}
          className="flex cursor-pointer items-center gap-1 font-heading text-sm font-semibold text-text-primary"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180">
            <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver
        </button>

        {/* Terminar el partido: se pide confirmación en el mismo lugar, sin ventanas emergentes.
            Un partido decisivo que sigue empatado ofrece pasar de fase en su lugar. */}
        {live &&
          (confirmEnd ? (
            <div className="flex items-center gap-3">
              <span className="font-body text-xs text-text-secondary">
                {inFirstHalf ? "¿Finalizar en el 1.er tiempo?" : onBreak ? "¿Finalizar en el descanso?" : "¿Finalizar?"}
              </span>
              <button
                onClick={() => setStatus("finalizado")}
                disabled={saving}
                className="cursor-pointer font-heading text-sm font-bold text-text-primary underline disabled:opacity-40"
              >
                Sí
              </button>
              <button
                onClick={() => setConfirmEnd(false)}
                className="cursor-pointer font-heading text-sm font-semibold text-text-secondary underline"
              >
                No
              </button>
            </div>
          ) : showPhaseButton ? (
            <button
              onClick={advancePhase}
              disabled={saving}
              className="cursor-pointer rounded-lg bg-surface-secondary px-3 py-1.5 font-heading text-xs font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:opacity-40"
            >
              {nextPhaseLabel}
            </button>
          ) : (
            <button
              onClick={() => setConfirmEnd(true)}
              className="cursor-pointer rounded-lg border border-border-primary px-3 py-1.5 font-heading text-xs font-bold text-text-primary transition-colors hover:bg-btn-regular"
            >
              Finalizar partido
            </button>
          ))}
      </header>

      {/* Match card with scores */}
      <div className="mx-4 mb-4 rounded-xl border border-border-primary overflow-hidden">
        <div className="bg-btn-regular px-4 py-2">
          <span className="font-heading text-xs font-bold text-text-primary">
            {match.groupName || "General"}
          </span>
        </div>

        <div className="flex items-center px-4 py-3">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-2">
              <ClubCrest club={match.homeTeam} size="h-7 w-7" textSize="text-[9px]" />
              <span className="font-body text-sm text-text-primary">{match.homeTeam?.name ?? "Por definir"}</span>
              <span className="ml-auto font-heading text-base font-bold text-text-primary">{homeScore}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ClubCrest club={match.awayTeam} size="h-7 w-7" textSize="text-[9px]" />
              <span className="font-body text-sm text-text-primary">{match.awayTeam?.name ?? "Por definir"}</span>
              <span className="ml-auto font-heading text-base font-bold text-text-primary">{awayScore}</span>
            </div>
          </div>

          <div className="mx-3 h-12 w-px bg-border-primary" />

          <div className="text-right">
            <p className="font-heading text-sm font-bold text-brand-500">
              {minutes}:{seconds.toString().padStart(2, "0")}&quot;
            </p>
            <p className="font-body text-xs text-text-secondary">
              {match.decisive && match.phase !== "regulacion"
                ? match.phase === "tiempo_extra"
                  ? "Tiempo extra"
                  : "Penales"
                : live && period
                  ? PERIOD_LABELS[period]
                  : `Fecha ${match.matchday}`}
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar. field-green (no brand-500, un gris casi igual al riel) para que el avance
          se note; al finalizar pulsa una vez sola (animate-progress-complete, ver globals.css). */}
      <div className="mx-4 mb-5 flex items-center gap-2">
        <div className={`h-2 flex-1 rounded-full bg-border-primary overflow-hidden${finished ? " animate-progress-complete" : ""}`}>
          <div
            className="h-full rounded-full bg-field-green transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="font-heading text-sm font-bold text-field-dark">{matchDuration}&apos;</span>
      </div>

      {/* Los dos tiempos: terminar el primero, el descanso y empezar el segundo. */}
      {inFirstHalf && !stale && (
        <div className="mx-4 mb-5">
          <button
            onClick={() => setPeriod("descanso")}
            disabled={saving}
            className="w-full cursor-pointer rounded-lg bg-surface-secondary py-3 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:opacity-40"
          >
            Finalizar 1.er tiempo
          </button>
        </div>
      )}
      {onBreak && (
        <div className="mx-4 mb-5 rounded-xl bg-btn-regular px-4 py-4 text-center">
          <p className="font-heading text-sm font-bold text-text-primary">Descanso</p>
          <p className="mb-3 mt-1 font-body text-xs text-text-secondary">
            El cronómetro está detenido en {minutes}&apos;. El 2.º tiempo sigue desde el minuto {halfMinutes(minutesPerHalf)}.
          </p>
          <button
            onClick={() => setPeriod("segundo_tiempo")}
            disabled={saving}
            className="w-full cursor-pointer rounded-lg bg-surface-secondary py-3 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:opacity-40"
          >
            Iniciar 2.º tiempo
          </button>
          <button
            onClick={() => setPeriod("primer_tiempo")}
            disabled={saving}
            className="mt-3 cursor-pointer font-heading text-xs font-semibold text-text-secondary underline disabled:opacity-40"
          >
            Volver al 1.er tiempo
          </button>
        </div>
      )}

      {/* Un partido que lleva muchísimo en vivo se olvidó sin finalizar: se avisa en vez de seguir
          contando (y dejando el minuto de las jugadas fuera de rango). */}
      {stale && (
        <div role="alert" className="mx-4 mb-5 rounded-xl border border-border-primary bg-btn-regular px-4 py-3">
          <p className="font-heading text-sm font-bold text-text-primary">Este partido lleva {formatLiveFor(match.startedAt, now)} en juego</p>
          <p className="mt-1 font-body text-xs text-text-secondary">
            El cronómetro se detuvo en {minutes}&apos;. Si ya terminó, finalízalo para cerrar el marcador.
          </p>
          {!showPhaseButton && (
            <button
              onClick={() => setStatus("finalizado")}
              disabled={saving}
              className="mt-3 w-full cursor-pointer rounded-lg bg-surface-secondary py-2.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:opacity-40"
            >
              Finalizar con {homeScore}-{awayScore}
            </button>
          )}
        </div>
      )}

      {/* Estado del partido: sin empezar o terminado, en lugar de los controles de jugadas */}
      {match.status === "programado" && (
        <div className="mx-4 mb-5 rounded-xl bg-btn-regular px-4 py-4 text-center">
          <p className="mb-3 font-body text-sm text-text-secondary">El partido todavía no empezó.</p>
          <button
            onClick={() => setStatus("en_curso")}
            disabled={saving}
            className="w-full cursor-pointer rounded-lg bg-surface-secondary py-3 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:opacity-40"
          >
            Iniciar partido
          </button>
        </div>
      )}
      {finished && (
        <div className="mx-4 mb-5 rounded-xl bg-btn-regular px-4 py-4 text-center">
          <p className={match.decisive && match.winnerTeamId && homeScore === awayScore ? "mb-1 font-heading text-sm font-bold text-text-primary" : "mb-3 font-heading text-sm font-bold text-text-primary"}>
            Partido finalizado
          </p>
          {match.decisive && match.winnerTeamId && homeScore === awayScore && (
            <p className="mb-3 font-body text-xs text-text-secondary">
              Se definió por penales: {match.penaltyHomeScore ?? 0}-{match.penaltyAwayScore ?? 0}
            </p>
          )}
          {!inMesa && (
            <button
              onClick={() => setStatus("en_curso")}
              disabled={saving}
              className="cursor-pointer font-heading text-sm font-semibold text-text-primary underline disabled:opacity-40"
            >
              Reabrir para corregir
            </button>
          )}
        </div>
      )}
      {live && !onBreak && match.phase !== "penales" && events.length > 0 && !selectedAction && (
        <button
          onClick={undoLast}
          disabled={saving}
          className="mx-4 mb-3 cursor-pointer self-end font-heading text-xs font-semibold text-text-secondary underline disabled:opacity-40"
        >
          Deshacer última jugada
        </button>
      )}

      {/* Team toggle */}
      <div className={`mx-4 mb-5 flex gap-3${live && !onBreak ? "" : " hidden"}`}>
        <button
          onClick={() => { setActiveTeam("local"); resetPick(); }}
          className={`flex-1 cursor-pointer rounded-lg py-2.5 font-heading text-sm font-bold transition-colors ${
            activeTeam === "local"
              ? "bg-surface-secondary text-text-invert"
              : "border border-border-primary text-text-primary"
          }`}
        >
          Local
        </button>
        <button
          onClick={() => { setActiveTeam("visitante"); resetPick(); }}
          className={`flex-1 cursor-pointer rounded-lg py-2.5 font-heading text-sm font-bold transition-colors ${
            activeTeam === "visitante"
              ? "bg-surface-secondary text-text-invert"
              : "border border-border-primary text-text-primary"
          }`}
        >
          Visitante
        </button>
      </div>

      {/* Action icons (no aplican en la tanda de penales: ver PenaltyShootout más abajo) */}
      <div className={`mx-4 mb-4 flex justify-between${live && !onBreak && match.phase !== "penales" ? "" : " hidden"}`}>
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => {
              setSelectedAction(selectedAction === action.id ? null : action.id);
              resetPick();
            }}
            className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg p-2 transition-colors ${
              selectedAction === action.id
                ? "bg-btn-regular"
                : "hover:bg-btn-regular"
            }`}
          >
            <span className="text-text-primary">{action.icon}</span>
            <span className="font-body text-xs text-text-secondary">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Tanda de penales, lista de jugadores, o cronología/vacío */}
      {live && match.phase === "penales" ? (
        <PenaltyShootout
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          activeTeam={activeTeam}
          events={apiEvents ?? []}
          penaltyHomeScore={match.penaltyHomeScore}
          penaltyAwayScore={match.penaltyAwayScore}
          saving={saving}
          onKick={registerPenalty}
          onUndo={undoLast}
        />
      ) : selectedAction ? (
        <div className="flex-1 px-4 pb-2">
          <div className="flex flex-col">
            {isCambio && (
              <div className="mb-1 flex items-center justify-between gap-3 px-1 py-2">
                <p className="font-heading text-sm font-bold text-text-primary">{pickingIn ? "¿Quién entra?" : "¿Quién sale?"}</p>
                {pickingIn && (
                  <button type="button" onClick={() => { setChoosingIn(false); setSelectedPlayerIn(null); }} className="cursor-pointer font-body text-xs text-text-secondary underline">
                    Sale: {outPlayer ? `${outPlayer.user.firstName} ${outPlayer.user.lastName}` : "—"} · Cambiar
                  </button>
                )}
              </div>
            )}
            {listPlayers.map((player) => {
              const cards = playerCards(player.id);
              return (
                <button
                  key={player.id}
                  onClick={() => pick(player.id)}
                  className="flex cursor-pointer items-center gap-3 border-b border-border-primary px-1 py-3 transition-colors hover:bg-btn-regular"
                >
                  {/* Radio button */}
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    pickedId === player.id
                      ? "border-surface-secondary bg-surface-secondary"
                      : "border-border-primary"
                  }`}>
                    {pickedId === player.id && (
                      <div className="h-2 w-2 rounded-full bg-surface-primary" />
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-300">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="6" r="3" fill="currentColor" className="text-text-secondary" />
                      <path d="M3 15c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.2" className="text-text-secondary" />
                    </svg>
                  </div>

                  {/* Name + position */}
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-heading text-sm font-semibold text-text-primary">
                        {player.user.firstName} {player.user.lastName}
                      </span>
                      {/* Card indicators */}
                      {cards.red > 0 && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                          <rect x="3" y="1.5" width="8" height="11" rx="1.5" fill="#E53935" />
                        </svg>
                      )}
                      {cards.yellow > 0 && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                          <rect x="3" y="1.5" width="8" height="11" rx="1.5" fill="#FFC107" />
                        </svg>
                      )}
                    </div>
                    <span className="font-body text-xs text-text-secondary">{player.position}</span>
                  </div>

                  {/* Jersey number */}
                  <span className="font-heading text-base font-bold text-text-primary">{player.number}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <h2 className="font-heading text-lg font-bold text-text-primary mb-2">
            Registra la primera jugada
          </h2>
          <p className="font-body text-sm text-text-secondary leading-relaxed max-w-[300px]">
            Registra las acciones dentro del campo y transmite en vivo el partido a los hinchas
          </p>
        </div>
      ) : (
        <div className="flex-1 px-4">
          <div className="flex flex-col gap-3">
            {events.map((event, i) => {
              const isGol = event.type === "gol";
              // El fondo de un gol es el color del equipo que lo metió (antes siempre azul,
              // sin importar de quién era), para poder distinguir de un vistazo quién anota.
              const teamColor = (event.team === "local" ? match.homeTeam?.color : match.awayTeam?.color) ?? "#1B1B1B";
              const cardStyle = isGol
                ? "text-white"
                : "bg-surface-primary border border-border-primary text-text-primary";
              const minuteStyle = isGol ? "text-white" : "text-text-secondary";
              const descStyle = isGol ? "text-white/80" : "text-text-secondary";
              const teamName = event.team === "local" ? match.homeTeam?.name ?? "Por definir" : match.awayTeam?.name ?? "Por definir";

              return (
                <div
                  key={i}
                  className={`rounded-xl px-4 py-3 ${cardStyle}`}
                  style={isGol ? { backgroundColor: teamColor } : undefined}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 ${minuteStyle}`}>
                      {event.type === "gol" && (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M10 2.5l1.8 3.2h-3.6L10 2.5zM5 7l3.2 1.8-1.4 3.2L3.6 10.2 5 7zM15 7l-3.2 1.8 1.4 3.2 3.2-1.8L15 7z" fill="currentColor" />
                        </svg>
                      )}
                      {event.type === "amarilla" && (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <rect x="6" y="3" width="8" height="13" rx="1.5" fill="#FFC107" stroke="#1B1B1B" strokeWidth="1" />
                        </svg>
                      )}
                      {event.type === "roja" && (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <rect x="6" y="3" width="8" height="13" rx="1.5" fill="#E53935" stroke="#1B1B1B" strokeWidth="1" />
                        </svg>
                      )}
                      {event.type === "cambio" && event.rawType !== "penal_definicion" && (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M5 7h7l-2.5-2.5M15 13H8l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {(event.type === "penal" || event.rawType === "penal_definicion") && (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M4 7l6-4 6 4v8l-6 4-6-4V7z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                          <circle cx="10" cy="11" r="2" fill="currentColor" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {editingEventId === event.id ? (
                          <span className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              value={editMinute}
                              onChange={(e) => setEditMinute(e.target.value)}
                              autoFocus
                              className={`w-12 rounded border border-current/40 bg-transparent px-1 py-0.5 font-heading text-xs font-bold ${minuteStyle}`}
                            />
                            <button
                              onClick={() => saveEditedMinute(event.id)}
                              disabled={saving}
                              className="cursor-pointer disabled:opacity-40"
                              aria-label="Guardar minuto"
                            >
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={minuteStyle}>
                                <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setEditingEventId(null)}
                              className="cursor-pointer"
                              aria-label="Cancelar edición"
                            >
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={minuteStyle}>
                                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => live && startEditMinute(event)}
                            disabled={!live}
                            className={`font-heading text-xs font-bold ${minuteStyle} ${live ? "cursor-pointer underline decoration-dotted underline-offset-2" : ""}`}
                          >
                            {event.minute}&apos;
                          </button>
                        )}
                        <span className="font-heading text-sm font-bold">
                          {isEventType(event.rawType) ? EVENT_TITLES[event.rawType] : "Cambio"}
                        </span>
                      </div>
                      <p className={`font-body text-xs ${descStyle}`}>
                        {event.type === "cambio" && event.rawType === "sustitucion" && event.playerName
                          ? `Sale ${event.playerName}${event.playerInName ? ` · Entra ${event.playerInName}` : ""} - ${teamName}`
                          : event.playerName ? `${event.playerName} - ${teamName}` : teamName}
                        {event.recordedBy ? ` · por ${event.recordedBy}` : ""}
                      </p>
                    </div>
                    {live && editingEventId !== event.id && (
                      <button
                        onClick={() => undoEvent(event.id)}
                        disabled={saving}
                        className={`shrink-0 cursor-pointer font-body text-xs underline disabled:opacity-40 ${descStyle}`}
                      >
                        Deshacer
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="mx-4 mb-2 font-body text-sm text-red-600">{error}</p>}

      {/* Bottom button (la tanda de penales tiene sus propios botones, ver PenaltyShootout) */}
      <div className={`sticky bottom-0 bg-surface-primary px-4 pb-6 pt-3${live && !onBreak && match.phase !== "penales" ? "" : " hidden"}`}>
        <button
          onClick={handleSave}
          className={`w-full cursor-pointer rounded-lg py-3.5 font-heading text-sm font-bold transition-colors ${
            selectedAction && !waitingIn
              ? "bg-surface-secondary text-text-invert hover:bg-brand-700"
              : "bg-surface-secondary/50 text-text-invert/50 cursor-not-allowed"
          }`}
        >
          {goToIn ? "Siguiente: ¿quién entra?" : "Guardar jugada"}
        </button>
      </div>
    </div>
  );
}
