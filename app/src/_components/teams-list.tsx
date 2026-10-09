import { ClubCrest } from "@/_components/club-crest";
import type { StandingsRow, TournamentDetail } from "@/_lib/api";

/**
 * Los equipos de un torneo, con su escudo (la imagen que tengan), el grupo si el torneo los tiene y
 * cómo van (partidos jugados y puntos, de la tabla). Con `showDelegate` (el organizador) dice además
 * quién lleva cada equipo o si es temporal; la pantalla pública no muestra esos datos de contacto.
 * Antes de empezar, el organizador ve y quita esos equipos desde "Inscritos".
 */
export function TeamsList({
  teams,
  standings,
  showDelegate = false,
}: {
  teams: TournamentDetail["teams"];
  standings: StandingsRow[];
  showDelegate?: boolean;
}) {
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
      <ul className="flex flex-col @2xl:grid @2xl:grid-cols-2 @2xl:gap-x-10">
        {rows.map((team) => {
          const s = byClub.get(team.club.id);
          const who = !showDelegate
            ? null
            : team.club.isTemporary
              ? "Equipo temporal"
              : team.club.delegadoNombre
                ? `Delegado ${team.club.delegadoNombre}`
                : "Sin delegado";
          const subtitle = [team.groupName, who].filter(Boolean).join(" · ");
          return (
            <li key={team.id} className="flex items-center gap-3 border-b border-brand-200 py-3.5 last:border-0">
              <ClubCrest club={team.club} size="h-10 w-10" textSize="text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-sm font-bold text-text-primary">{team.club.name}</p>
                {subtitle && <p className="mt-0.5 truncate font-body text-xs text-text-secondary">{subtitle}</p>}
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
