const BASE = typeof window !== "undefined" ? "" : "http://localhost:3000";

async function fetcher<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export interface TournamentListItem {
  id: string;
  name: string;
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
  organizer: { firstName: string; lastName: string };
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

export interface MatchListItem {
  id: string;
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  date: string;
  time: string;
  location: string;
  matchday: number;
  groupName: string | null;
  homeTeam: { id: string; name: string; shortName: string; logoUrl: string | null };
  awayTeam: { id: string; name: string; shortName: string; logoUrl: string | null };
  _count: { events: number };
}

export interface StandingsRow {
  position: number;
  clubId: string;
  clubName: string;
  shortName: string;
  logoUrl: string | null;
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
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
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
  owner: { id: string; firstName: string; lastName: string };
  categories: { id: string; name: string; gender: string; _count: { players: number } }[];
  staff: { id: string; firstName: string; lastName: string; role: string; phone: string | null; email: string | null }[];
}

export interface PlayerListItem {
  id: string;
  number: number | null;
  position: string | null;
  status: string;
  user: { firstName: string; lastName: string; avatarUrl: string | null };
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
  playerProfile: { id: string; position: string | null; club: { id: string; name: string } | null } | null;
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
