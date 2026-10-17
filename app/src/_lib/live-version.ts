// La versión del último aviso en vivo que recibió esta pantalla (OBS-58). Lógica pura, sin dependencias: la usan los
// ganchos de tiempo real y el cliente de la API, y se prueba directo.
//
// El aviso de un gol lleva `{ v }`, la hora del servidor en que se registró. Cada pantalla pública guarda la mayor `v`
// que vio y la agrega a sus lecturas (`withPublicRead`): como todos los espectadores piden la misma dirección, el
// borde la atiende con una sola consulta a la base y todos ven el gol al instante, sin esperar a que venza la caché.

let current = 0;

/** La mayor versión recibida hasta ahora; 0 = todavía no llegó ningún aviso (primera carga). */
export function getLiveVersion(): number {
  return current;
}

/** Lee la versión de un aviso. Un aviso sin ella (de un servidor anterior) usa la hora de este navegador. */
export function versionOf(data: unknown, now: number = Date.now()): number {
  const v = typeof data === "object" && data !== null ? (data as { v?: unknown }).v : undefined;
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : now;
}

/** Anota un aviso que llegó: la versión sube, nunca baja (un aviso atrasado no hace volver a una lectura vieja). */
export function noteLiveVersion(data: unknown, now: number = Date.now()): number {
  current = Math.max(current, versionOf(data, now));
  return current;
}

/** Solo para las pruebas: vuelve a "ningún aviso todavía". */
export function resetLiveVersion() {
  current = 0;
}
