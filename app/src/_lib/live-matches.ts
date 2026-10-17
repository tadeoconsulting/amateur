// A qué partidos de un torneo vale la pena suscribirse para enterarse de novedades en vivo (OBS-36). Lógica pura, sin
// dependencias: la usan las pantallas con tiempo real y se prueba directo.

/**
 * Los ids de los partidos que todavía pueden tener novedades: los programados (para enterarse de que arrancan) y los
 * que están en juego (para sus goles y su final). Los finalizados no cambian solos, así que no se escuchan. El orden
 * no importa: `useTournamentRealtime` compara por contenido.
 *
 * Los partidos "por definir" de un cuadro (todavía sin equipos) también cuentan: ya están programados y su ganador
 * previo puede cambiar quién juega.
 */
export function watchableMatchIds(matches: readonly { id: string; status: string }[]): string[] {
  return matches.filter((m) => m.status !== "finalizado").map((m) => m.id);
}
