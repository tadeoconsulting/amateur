import { MATCH_TONE } from "@/_lib/match-tone";

// Las marcas de la tabla en vivo: lo que se ve cuando algún equipo está jugando y la tabla ya cuenta su marcador de
// ahora. Compartidas por todas las tablas de posiciones (fan, jugador, club y organizador).

/** El punto rojo que marca a un equipo que está jugando ahora. */
export function LiveDot() {
  return (
    <span className="inline-flex shrink-0 items-center" title="Jugando ahora">
      <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${MATCH_TONE.live.dot} motion-reduce:animate-none`} aria-hidden="true" />
      <span className="sr-only">Jugando ahora</span>
    </span>
  );
}

/** ▲2 / ▼1: cuántos lugares subió o bajó el equipo respecto de la tabla oficial. */
export function PlaceMove({ change }: { change: number | undefined }) {
  if (!change) return null;
  const up = change > 0;
  return (
    <span
      className={`inline-flex items-center text-[9px] font-bold leading-none ${up ? "text-field-dark" : "text-text-secondary"}`}
      aria-label={up ? `Sube ${change} ${change === 1 ? "lugar" : "lugares"}` : `Baja ${-change} ${change === -1 ? "lugar" : "lugares"}`}
    >
      <span aria-hidden="true">{up ? "▲" : "▼"}{Math.abs(change)}</span>
    </span>
  );
}

/** "+3" junto a los puntos de un equipo: lo que le suma el marcador de ahora. */
export function PointsDelta({ delta }: { delta: number | undefined }) {
  if (!delta) return null;
  return <sup className={`ml-0.5 text-[9px] font-bold ${MATCH_TONE.live.text}`} aria-label={`más ${delta} por el partido en vivo`}>+{delta}</sup>;
}

/** El aviso sobre la tabla mientras hay algún partido en juego. */
export function LiveStandingsNotice() {
  return (
    <p role="status" className="mb-2 flex items-center gap-2 px-1 font-body text-xs text-text-secondary">
      <span className={`h-2 w-2 shrink-0 animate-pulse rounded-full ${MATCH_TONE.live.dot} motion-reduce:animate-none`} aria-hidden="true" />
      <span>
        <strong className="font-heading text-text-primary">Tabla en vivo</strong>: cuenta los partidos que se están jugando con el marcador de ahora. Se confirma al finalizar.
      </span>
    </p>
  );
}
