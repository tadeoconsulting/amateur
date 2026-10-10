import type { RequestAction, RequestKind, RequestStatus } from "@/_lib/tournament-request";

const BASE = typeof window !== "undefined" ? "" : "http://localhost:3000";

async function fetcher<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export interface TournamentListItem {
  id: string;
  name: string;
  /** Segundo tramo de la URL pública; null en torneos anteriores a las URLs con nombre. */
  slug: string | null;
  format: string;
  status: string;
  category: string | null;
  modality: string | null;
  gender: string | null;
  maxTeams: number | null;
  teamsCount: number;
  matchesCount: number;
  startDate: string;
  endDate: string | null;
  location: string;
  logoUrl: string | null;
  organizerId: string;
  organizer: { firstName: string; lastName: string; organizerSlug: string | null };
}

export interface TournamentDetail {
  id: string;
  name: string;
  format: string;
  status: string;
  category: string | null;
  modality: string | null;
  gender: string | null;
  maxTeams: number | null;
  minTeams: number | null;
  startDate: string;
  endDate: string | null;
  location: string;
  organizerId: string;
  registrationFee: string | null;
  refereeFee: string | null;
  rules: string[];
  minutesPerHalf: number | null;
  playersPerTeam: number | null;
  assignDelegates: boolean;
  // Solo aplican a eliminacion/relampago/copa (especificación 007).
  extraTimeMinutes: number | null;
  groupsAdvancePerGroup: number | null;
  /** Foto del torneo; null si no tiene. */
  logoUrl: string | null;
  /** Solo "liga": cuántos de la tabla pasan a llaves (2, 4, 8 o 16); null = la liga no tiene llaves. */
  playoffTeams: number | null;
  /** Segundo tramo de la URL pública; null en torneos anteriores a las URLs con nombre. */
  slug: string | null;
  organizer: { id: string; firstName: string; lastName: string; organizerSlug: string | null };
  sponsors: SponsorSummary[];
  teams: {
    id: string;
    groupName: string | null;
    club: {
      id: string;
      name: string;
      shortName: string;
      logoUrl: string | null;
      color: string | null;
      isTemporary: boolean;
      delegadoNombre: string | null;
    };
  }[];
  _count: { matches: number; teams: number };
}

/** Como aparece un sponsor colgado de un torneo (convocatoria pública, detalle de torneo). */
export interface SponsorSummary {
  id: string;
  name: string;
  logoUrl: string | null;
  website: string | null;
}

/** Un sponsor tal como lo ve el admin en /admin/sponsors. */
export interface SponsorRow extends SponsorSummary {
  tournamentsCount: number;
  createdAt: string;
}

/** Un equipo de un cuadro de eliminación: null ("por definir") hasta que se conoce el
 * ganador del cruce anterior. Fuera de un cuadro (liga/grupos), siempre viene definido. */
export type MatchTeamRef = { id: string; name: string; shortName: string; logoUrl: string | null; color: string | null } | null;

export interface MatchListItem {
  id: string;
  tournamentId: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  date: string;
  time: string;
  location: string;
  matchday: number;
  groupName: string | null;
  /** Cuándo empezó el partido; null si todavía no. El cronómetro en vivo se calcula desde acá. */
  startedAt?: string | null;
  /** Los dos tiempos (especificación 010): null en un partido sin tiempos (ver match-live.ts). */
  period?: "primer_tiempo" | "descanso" | "segundo_tiempo" | null;
  firstHalfEndedAt?: string | null;
  secondHalfStartedAt?: string | null;
  homeTeam: MatchTeamRef;
  awayTeam: MatchTeamRef;
  _count: { events: number };
  /** Solo viene en GET /api/matches (la lista), no en el detalle de un partido. */
  tournament?: { id: string; name: string; minutesPerHalf: number | null; logoUrl?: string | null; slug?: string | null; organizer?: { organizerSlug: string | null } };
  // ─── Cuadro de eliminación (especificación 007) ───
  /** ¿Este partido es parte de un cuadro de eliminación? Si no, siempre admite empate. */
  decisive: boolean;
  phase: "regulacion" | "tiempo_extra" | "penales";
  winnerTeamId: string | null;
  nextMatchId: string | null;
  nextMatchSlot: "home" | "away" | null;
  penaltyHomeScore: number | null;
  penaltyAwayScore: number | null;
}

/** Jugada tal como la devuelve GET /api/matches/:id/events. */
export interface MatchEventItem {
  id: string;
  type: string;
  minute: number;
  playerId: string | null;
  playerName: string | null;
  teamId: string | null;
  detail: string | null;
  phase: string;
  /** En qué tiempo ocurrió (1 o 2); null en un partido sin tiempos. */
  half?: number | null;
  /** Solo para el tipo "penal_definicion": ¿convirtió el intento? */
  scored: boolean | null;
}

/** Partido con su torneo, como lo devuelve GET /api/matches/:id. */
export interface MatchDetail extends MatchListItem {
  tournament: { id: string; name: string; format: string; minutesPerHalf: number | null; extraTimeMinutes: number | null };
}

export interface StandingsRow {
  position: number;
  clubId: string;
  clubName: string;
  shortName: string;
  logoUrl: string | null;
  color: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  groupName: string | null;
}

export interface ScorerRow {
  position: number;
  playerId: string;
  /** Su club (para enlazar a su página); null si ya no tiene. */
  clubId: string | null;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  /** Su puesto en la cancha; null = no se muestra. (`position` es el lugar en la tabla.) */
  playerPosition: string | null;
  clubName: string;
  goals: number;
  matchesPlayed: number;
}

export interface ClubListItem {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  color: string | null;
  delegadoNombre: string | null;
  ownerId: string;
  playerCount: number;
  categoriesCount: number;
  owner: { firstName: string; lastName: string };
}

export interface ClubDetail {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  color: string | null;
  delegadoNombre: string | null;
  delegadoTel: string | null;
  delegadoEmail: string | null;
  owner: { id: string; firstName: string; lastName: string };
  categories: { id: string; name: string; gender: string; _count: { players: number } }[];
  staff: { id: string; firstName: string; lastName: string; role: string; phone: string | null; email: string | null }[];
}

export interface PlayerListItem {
  id: string;
  number: number | null;
  position: string | null;
  status: string;
  /** Sin cuenta todavía (jugador provisional, especificación 009). */
  provisional?: boolean;
  user: { firstName: string; lastName: string; avatarUrl: string | null; birthDate?: string | null };
  category: { id: string; name: string } | null;
}

export interface PlayerItem {
  id: string;
  userId: string;
  number: number | null;
  position: string | null;
  status: string;
  user: { firstName: string; lastName: string; email: string; avatarUrl: string | null; phone: string | null };
  club: { id: string; name: string; shortName: string } | null;
  category: { id: string; name: string; gender: string } | null;
}

export interface UserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  gender: string | null;
  department: string | null;
  birthDate: string | null;
  organization: string | null;
  createdAt: string;
  roles: string[];
  ownedClubs: { id: string; name: string }[];
  /** Una ficha por club donde juega (puede ser más de uno). */
  playerProfiles: { id: string; position: string | null; club: { id: string; name: string } | null }[];
  tournamentsCount: number;
}

export function getTournaments(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetcher<TournamentListItem[]>(`/api/tournaments${qs}`);
}

/** "7 vs 7" → "Fútbol 7". Los torneos anteriores al asistente no tienen modalidad. */
export function modalityLabel(modality: string | null | undefined) {
  const players = modality?.split(" ")[0];
  return players ? `Fútbol ${players}` : null;
}

export function getTournament(id: string) {
  return fetcher<TournamentDetail>(`/api/tournaments/${id}`);
}

export function getMatches(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetcher<MatchListItem[]>(`/api/matches${qs}`);
}

export function getStandings(tournamentId: string) {
  return fetcher<StandingsRow[]>(`/api/tournaments/${tournamentId}/standings`);
}

/** La página pública de un club dentro de un torneo (`GET /api/tournaments/:id/teams/:clubId`). */
export interface ClubInTournament {
  club: { id: string; name: string; shortName: string; logoUrl: string | null; color: string | null };
  groupName: string | null;
  tournament: { id: string; name: string; format: string; playoffTeams: number | null; slug: string | null; organizerSlug: string | null };
  /** `name` ya viene listo para mostrar: un menor de 18 sale abreviado ("Luigui F."). */
  players: { id: string; name: string; position: string | null; number: number | null; goals: number }[];
}

export async function getClubInTournament(tournamentId: string, clubId: string): Promise<ClubInTournament | null> {
  const res = await fetch(`/api/tournaments/${tournamentId}/teams/${clubId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function getScorers(tournamentId: string) {
  return fetcher<ScorerRow[]>(`/api/tournaments/${tournamentId}/scorers`);
}

export function getClubs(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetcher<ClubListItem[]>(`/api/clubs${qs}`);
}

export function getClub(id: string) {
  return fetcher<ClubDetail>(`/api/clubs/${id}`);
}

export function getClubPlayers(clubId: string, params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetcher<PlayerListItem[]>(`/api/clubs/${clubId}/players${qs}`);
}

export function getClubCategories(clubId: string) {
  return fetcher<{ id: string; name: string; gender: string; playerCount: number }[]>(`/api/clubs/${clubId}/categories`);
}

export function getClubStaff(clubId: string) {
  return fetcher<{ id: string; firstName: string; lastName: string; role: string; phone: string | null; email: string | null }[]>(`/api/clubs/${clubId}/staff`);
}

export function getPlayers(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetcher<PlayerItem[]>(`/api/players${qs}`);
}

export function searchUsers(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetcher<UserItem[]>(`/api/users${qs}`);
}

export interface UserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  gender: string | null;
  department: string | null;
  birthDate: string | null;
  organization: string | null;
  roles: string[];
  /** Una ficha por club donde juega, la más antigua primero. Una ficha sin `club` es la "libre"
   * (solo posición: todavía sin equipo). */
  playerProfiles: {
    id: string;
    position: string | null;
    number: number | null;
    status: string;
    club: { id: string; name: string; shortName: string; color: string | null; logoUrl: string | null } | null;
    category: { id: string; name: string; gender: string } | null;
    /** Por torneo. matchesPlayed y assists no se incrementan todavía en ningún lado (ver
     * pendientes-y-decisiones.md): siempre en 0. */
    stats: {
      goals: number;
      assists: number;
      yellowCards: number;
      redCards: number;
      matchesPlayed: number;
      tournament: { id: string; name: string };
    }[];
  }[];
  /** El equipo con el que sale hoy (el que eligió, o el más antiguo); null si no tiene equipo. */
  activeClubId: string | null;
}

export function getUser(id: string) {
  return fetcher<UserDetail>(`/api/users/${id}`);
}

/** Elige con qué equipo sale a la cancha el jugador (el que muestra Actividad). Debe ser uno de sus equipos. */
export async function setActiveClub(userId: string, clubId: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activeClubId: clubId }),
  });
  if (res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  return { ok: false, error: data.error ?? "No se pudo cambiar de equipo" };
}

// ─── Solicitudes e invitaciones de equipos a un torneo (especificación 006) ────

/** Lo que ve el organizador en las pestañas Solicitudes e Invitados. */
export interface TournamentRequestItem {
  id: string;
  kind: RequestKind;
  status: RequestStatus;
  createdAt: string;
  resolvedAt: string | null;
  club: {
    id: string;
    name: string;
    shortName: string;
    color: string | null;
    logoUrl: string | null;
    isTemporary: boolean;
    delegadoNombre: string | null;
  };
  createdBy: { id: string; firstName: string; lastName: string };
}

/** Lo que ve el dueño de un club en su pestaña Solicitudes. */
export interface MyRequestItem {
  id: string;
  kind: RequestKind;
  status: RequestStatus;
  createdAt: string;
  club: { id: string; name: string; shortName: string; color: string | null };
  tournament: {
    id: string;
    name: string;
    logoUrl: string | null;
    category: string | null;
    startDate: string;
    location: string;
    format: string;
    modality: string | null;
    status: string;
    maxTeams: number | null;
    teamsCount: number;
    organizer: { firstName: string; lastName: string };
  };
}

export function getTournamentRequests(tournamentId: string, params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetcher<TournamentRequestItem[]>(`/api/tournaments/${tournamentId}/requests${qs}`);
}

export function getMyRequests(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetcher<MyRequestItem[]>(`/api/tournament-requests/mine${qs}`);
}

export function getSponsors(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetcher<SponsorRow[]>(`/api/sponsors${qs}`);
}

export function getTournamentSponsors(tournamentId: string) {
  return fetcher<SponsorSummary[]>(`/api/tournaments/${tournamentId}/sponsors`);
}

export type MutationResult<T = unknown> = { ok: boolean; status: number; data: T; error: string | null };

async function send<T>(method: string, path: string, body?: unknown): Promise<MutationResult<T>> {
  try {
    const res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    return { ok: res.ok, status: res.status, data, error: res.ok ? null : (data.error ?? "No se pudo completar la acción") };
  } catch {
    return { ok: false, status: 0, data: {} as T, error: "No se pudo conectar. Inténtalo de nuevo." };
  }
}

/** Aceptar, rechazar o cancelar una solicitud o invitación. */
export function resolveRequest(requestId: string, action: RequestAction) {
  return send("POST", `/api/tournament-requests/${requestId}/${action}`, {});
}

/** El dueño del club solicita entrar; el organizador invita a un club. Lo decide el servidor. */
export function createRequest(tournamentId: string, clubId: string) {
  return send<{ id: string; kind: RequestKind; alreadyPending?: boolean }>(
    "POST",
    `/api/tournaments/${tournamentId}/requests`,
    { clubId }
  );
}
