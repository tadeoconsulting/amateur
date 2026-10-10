import Link from "next/link";
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
  clubHref,
}: {
  teams: TournamentDetail["teams"];
  standings: StandingsRow[];
  showDelegate?: boolean;
  /** Si se pasa, cada equipo lleva a su página (partidos, jugadores y resultados). */
  clubHref?: (clubId: string) => string;
}) {
  const byClub = new Map(standings.map((s) => [s.clubId, s]));
  const rows = [...teams].sort((a, b) => a.club.name.localeCompare(b.club.name, "es"));

  if (rows.length === 0) {
    return <p className="mt-4 px-4 py-8 text-center font-body text-sm text-text-secondary">Este torneo todavía no tiene equipos.</p>;
  }

  return (
    // Columna ancha (escritorio): la lista se centra y ocupa el 70 % de la pantalla (sin pasar del contenedor).
    <div className="mt-4 px-4 @4xl:mx-auto @4xl:w-[70vw] @4xl:max-w-full @4xl:px-0">
      <p className="mb-2 font-heading text-xs font-bold uppercase tracking-wider text-text-secondary">
        {rows.length} {rows.length === 1 ? "equipo" : "equipos"}
      </p>
      <ul className="flex flex-col">
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
            <li key={team.id} className="border-b border-brand-200 last:border-0">
              {(() => {
                const content = (
                  <>
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
                    {clubHref && (
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="shrink-0 text-text-secondary" aria-hidden="true">
                        <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </>
                );
                const row = "flex items-center gap-3 py-3.5";
                return clubHref ? (
                  <Link href={clubHref(team.club.id)} className={`${row} -mx-2 rounded-lg px-2 transition-colors hover:bg-btn-regular focus-visible:outline-2 focus-visible:outline-text-primary`}>
                    {content}
                  </Link>
                ) : (
                  <div className={row}>{content}</div>
                );
              })()}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
