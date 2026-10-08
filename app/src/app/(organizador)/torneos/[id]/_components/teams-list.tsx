import { ClubCrest } from "@/_components/club-crest";
import type { StandingsRow, TournamentDetail } from "@/_lib/api";

/**
 * Los equipos de un torneo que ya empezó, con su escudo, quién los lleva (o si son temporales),
 * el grupo si el torneo los tiene y cómo van (partidos jugados y puntos, de la tabla). Antes de
 * empezar, esos mismos equipos se ven y se quitan desde "Inscritos" (ver la convocatoria).
 */
export function TeamsList({ teams, standings }: { teams: TournamentDetail["teams"]; standings: StandingsRow[] }) {
  const byClub = new Map(standings.map((s) => [s.clubId, s]));
  const rows = [...teams].sort((a, b) => a.club.name.localeCompare(b.club.name, "es"));

  if (rows.length === 0) {
    return <p className="mt-4 px-4 py-8 text-center font-body text-sm text-text-secondary">Este torneo todavía no tiene equipos.</p>;
  }

  return (
    <div className="mt-4 px-4">
      <p className="mb-2 font-heading text-xs font-bold uppercase tracking-wider text-text-secondary">
        {rows.length} {rows.length === 1 ? "equipo" : "equipos"}
      </p>
      <ul className="flex flex-col">
        {rows.map((team) => {
          const s = byClub.get(team.club.id);
          const who = team.club.isTemporary
            ? "Equipo temporal"
            : team.club.delegadoNombre
              ? `Delegado ${team.club.delegadoNombre}`
              : "Sin delegado";
          return (
            <li key={team.id} className="flex items-center gap-3 border-b border-brand-200 py-3.5 last:border-0">
              <ClubCrest club={team.club} size="h-10 w-10" textSize="text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-sm font-bold text-text-primary">{team.club.name}</p>
                <p className="mt-0.5 truncate font-body text-xs text-text-secondary">
                  {team.groupName ? `${team.groupName} · ` : ""}
                  {who}
                </p>
              </div>
              {s && (
                <div className="shrink-0 text-right">
                  <p className="font-heading text-sm font-bold text-text-primary">{s.points} pts</p>
                  <p className="font-body text-xs text-text-secondary">{s.played} PJ</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
