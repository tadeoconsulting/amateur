// La vista de equipos del admin (Admin → Torneos → Equipos): cada equipo una sola vez, con los torneos donde juega.
// Lógica pura y sin dependencias: la usan la API y las pruebas.

/** Una inscripción: un equipo en un torneo. Lo que la API lee de la base. */
export interface TeamEnrollment {
  club: { id: string; name: string; shortName: string; logoUrl: string | null; color: string | null; isTemporary: boolean; playerCount: number };
  tournament: { id: string; name: string; status: string; organizerId: string; organizerName: string };
}

/** Un equipo con todos sus torneos. */
export interface AdminTeam {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  color: string | null;
  isTemporary: boolean;
  playerCount: number;
  tournaments: { id: string; name: string; status: string; organizerId: string; organizerName: string }[];
}

/**
 * Junta las inscripciones por equipo: un equipo que juega en varios torneos sale una vez, con todos ellos. Los equipos
 * salen ordenados por nombre y sus torneos también, sin repetir uno que llegue dos veces.
 */
export function groupTeams(enrollments: readonly TeamEnrollment[]): AdminTeam[] {
  const byClub = new Map<string, AdminTeam>();
  for (const { club, tournament } of enrollments) {
    let team = byClub.get(club.id);
    if (!team) {
      team = { ...club, tournaments: [] };
      byClub.set(club.id, team);
    }
    if (!team.tournaments.some((t) => t.id === tournament.id)) team.tournaments.push(tournament);
  }
  const collator = new Intl.Collator("es", { sensitivity: "base", numeric: true });
  return [...byClub.values()]
    .map((t) => ({ ...t, tournaments: [...t.tournaments].sort((a, b) => collator.compare(a.name, b.name)) }))
    .sort((a, b) => collator.compare(a.name, b.name));
}

/** Los organizadores de un equipo (los de los torneos donde juega), sin repetir. */
export function organizersOf(team: Pick<AdminTeam, "tournaments">): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const t of team.tournaments) if (!seen.has(t.organizerId)) seen.set(t.organizerId, t.organizerName);
  return [...seen.entries()].map(([id, name]) => ({ id, name }));
}
