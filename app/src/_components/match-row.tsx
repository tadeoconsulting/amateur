import Link from "next/link";
import type { MatchListItem } from "@/_lib/api";
import { formatTime12, UNSCHEDULED_LABEL } from "@/_lib/match-format";
import { isUnscheduled } from "@/_lib/fixture";
import { ClubCrest } from "@/_components/club-crest";

/**
 * La fila de un partido en las listas de fixture: los dos equipos con su escudo y marcador, y a la
 * derecha su estado — la hora si falta jugarse, "En vivo" si se está jugando, "Final" si terminó,
 * "Por definir" si todavía no tiene día y hora. El día no se repite acá: lo da el encabezado de la
 * sección en la que está la fila (ver `FixtureTabs`).
 *
 * Es la única definición de esta fila: el fixture del fan, el jugador, el club y el organizador la
 * usan, así un partido se ve igual en todas las pantallas.
 */
export function MatchRow({
  match,
  href,
  mine = false,
  first = false,
  onEdit,
}: {
  match: MatchListItem;
  /** Si no se pasa (vista pública de un fan: ningún rol tiene una ficha de partido sin sesión),
   * la fila se muestra igual pero sin link. */
  href?: string;
  /** Resalta (fondo) los partidos donde juega el club logueado. */
  mine?: boolean;
  /** Es la primera fila de su sección: sin línea arriba. */
  first?: boolean;
  /** Si se pasa (el organizador) y el partido todavía no empezó, se ofrece un botón para editarlo. */
  onEdit?: (match: MatchListItem) => void;
}) {
  const live = match.status === "en_curso";
  const border = first ? "" : "border-t border-border-primary";

  // Estado: lo que se muestra en el centro (marcador u hora) y la etiqueta de abajo.
  const played = match.status === "finalizado" || live;
  const statusLabel = live ? (
    <span className="inline-flex items-center gap-1 font-heading text-xs font-bold text-field-dark">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-field-green motion-reduce:animate-none" aria-hidden="true" />
      En vivo
    </span>
  ) : match.status === "finalizado" ? (
    <span className="font-heading text-xs font-bold text-text-secondary">Final</span>
  ) : isUnscheduled(match) ? (
    <span className="font-body text-xs text-text-secondary">{UNSCHEDULED_LABEL}</span>
  ) : (
    <span className="font-heading text-xs font-bold tabular-nums text-text-primary">{formatTime12(match.time)}</span>
  );

  const content = (
    <>
      {/* Tarjeta angosta (celular): los equipos en dos líneas y el estado a la derecha. */}
      <div className="flex items-center gap-3 @xl:hidden">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <ClubCrest club={match.homeTeam} />
            <span className="truncate font-body text-sm text-text-primary">{match.homeTeam?.name ?? UNSCHEDULED_LABEL}</span>
            <span className="ml-auto shrink-0 font-heading text-sm font-bold tabular-nums text-text-primary">{match.homeScore ?? "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <ClubCrest club={match.awayTeam} />
            <span className="truncate font-body text-sm text-text-primary">{match.awayTeam?.name ?? UNSCHEDULED_LABEL}</span>
            <span className="ml-auto shrink-0 font-heading text-sm font-bold tabular-nums text-text-primary">{match.awayScore ?? "-"}</span>
          </div>
        </div>
        <div className="w-20 shrink-0 text-right">
          {statusLabel}
          {match.groupName && <p className="mt-0.5 truncate font-body text-[11px] text-text-secondary">{match.groupName}</p>}
        </div>
      </div>

      {/* Tarjeta ancha (escritorio): simétrica — local, escudo, marcador u hora, escudo, visitante. */}
      <div className="mx-auto hidden max-w-2xl grid-cols-[1fr_auto_1fr] items-center gap-4 @xl:grid">
        <div className="flex min-w-0 items-center justify-end gap-3">
          <span className="truncate text-right font-body text-sm text-text-primary">{match.homeTeam?.name ?? UNSCHEDULED_LABEL}</span>
          <ClubCrest club={match.homeTeam} size="h-7 w-7" textSize="text-[9px]" />
        </div>
        <div className="flex min-w-24 flex-col items-center gap-0.5">
          <span
            className={`rounded-md px-3 py-1 text-center font-heading text-sm font-bold tabular-nums ${
              played ? "bg-surface-secondary text-text-invert" : "border border-border-primary text-text-primary"
            }`}
          >
            {played ? `${match.homeScore ?? "-"} - ${match.awayScore ?? "-"}` : isUnscheduled(match) ? "vs" : formatTime12(match.time)}
          </span>
          {(played || isUnscheduled(match)) && statusLabel}
          {match.groupName && <span className="font-body text-[11px] text-text-secondary">{match.groupName}</span>}
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <ClubCrest club={match.awayTeam} size="h-7 w-7" textSize="text-[9px]" />
          <span className="truncate font-body text-sm text-text-primary">{match.awayTeam?.name ?? UNSCHEDULED_LABEL}</span>
        </div>
      </div>
    </>
  );

  const label = `${match.homeTeam?.name ?? "Por definir"} contra ${match.awayTeam?.name ?? "por definir"}`;

  if (href && onEdit && match.status === "programado") {
    return (
      <div className={`flex items-stretch ${mine ? "bg-field-light" : ""} ${border}`}>
        <Link href={href} className="block min-w-0 flex-1 px-4 py-3 transition-colors hover:bg-btn-regular focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-text-primary">
          {content}
        </Link>
        <button
          type="button"
          onClick={() => onEdit(match)}
          aria-label={`Editar el partido ${label}`}
          className="flex min-w-11 shrink-0 cursor-pointer items-center justify-center border-l border-border-primary px-3 text-text-secondary transition-colors hover:bg-btn-regular hover:text-text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-text-primary"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M3 17l1-4L14.5 2.5a1.4 1.4 0 012 0l1 1a1.4 1.4 0 010 2L7 16l-4 1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    );
  }

  const rowClass = `block px-4 py-3 ${href ? "transition-colors hover:bg-btn-regular focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-text-primary" : ""} ${mine ? "bg-field-light" : ""} ${border}`;
  return href ? (
    <Link href={href} className={rowClass}>
      {content}
    </Link>
  ) : (
    <div className={rowClass}>{content}</div>
  );
}
