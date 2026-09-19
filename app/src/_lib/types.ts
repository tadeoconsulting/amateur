export type TournamentFormat = "liga" | "eliminacion" | "grupos";
export type TournamentStatus = "draft" | "inscripcion" | "en_curso" | "finalizado";
export type MatchStatus = "programado" | "en_vivo" | "finalizado" | "suspendido";
export type CardType = "amarilla" | "roja";

export interface Tournament {
  id: string;
  name: string;
  format: TournamentFormat;
  status: TournamentStatus;
  sportType: "futbol";
  teamsCount: number;
  maxTeams: number;
  startDate: string;
  endDate: string | null;
  location: string;
  organizerId: string;
  matchesPlayed: number;
  totalMatches: number;
  category?: string;
  minTeams?: number;
}

export interface Club {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  ownerId: string;
  playerCount: number;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  number: number | null;
  position: string | null;
  clubId: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  matchesPlayed: number;
}

export interface Match {
  id: string;
  tournamentId: string;
  homeTeam: Club;
  awayTeam: Club;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  date: string;
  time: string;
  location: string;
  matchday: number;
  group?: string;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  type: "gol" | "tarjeta_amarilla" | "tarjeta_roja" | "sustitucion";
  minute: number;
  playerId: string;
  playerName: string;
  teamId: string;
}

export interface PlayerSanction {
  id: string;
  playerName: string;
  tournamentId: string;
  clubId: string;
  status: "habilitado" | "suspendido";
  suspensionFechas?: number;
  accumulatedCards: number;
  cardLimit: number;
  hasRedCard: boolean;
}

export type PlayerGender = "masculino" | "femenino" | "mixto";
export type PlayerStatus = "activo" | "en_espera";

export interface PlayerCategory {
  id: string;
  name: string;
  gender: PlayerGender;
  playerCount: number;
}

export interface RosterPlayer {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  age: number;
  avatarUrl: string | null;
  verified: boolean;
  status: PlayerStatus;
  categoryId: string;
  clubId: string;
}

export type StaffRole = "delegado" | "asistente" | "director_tecnico";

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  age: number;
  avatarUrl: string | null;
  verified: boolean;
  phone: string;
  email: string;
}

export interface TeamCategory {
  id: string;
  name: string;
  gender: PlayerGender;
  membersCount: number;
}

export interface StandingsRow {
  position: number;
  club: Club;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}
