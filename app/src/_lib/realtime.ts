import Ably from "ably";

// El "seam" de la arquitectura (docs/arquitectura.md §9): el resto del código llama a
// `publicarEventoPartido` sin saber si detrás hay Ably u otra cosa. Sin ABLY_API_KEY (por
// ejemplo en desarrollo o pruebas) todo sigue funcionando: solo no hay empuje en vivo.

const CHANNEL_PREFIX = "match:";

let client: Ably.Rest | null | undefined;

function getClient(): Ably.Rest | null {
  if (client !== undefined) return client;
  const key = process.env.ABLY_API_KEY;
  client = key ? new Ably.Rest({ key }) : null;
  return client;
}

export function isRealtimeConfigured() {
  return getClient() !== null;
}

export function matchChannelName(matchId: string) {
  return `${CHANNEL_PREFIX}${matchId}`;
}

/**
 * Avisa a quienes están viendo este partido que hay novedades. No manda el detalle de la
 * jugada: el cliente vuelve a pedir el partido y sus jugadas por GET, que es la única fuente
 * de verdad (docs/arquitectura.md §7). Nunca lanza: una falla de Ably no debe tumbar una
 * request que ya persistió el cambio en la base.
 */
export async function publicarEventoPartido(matchId: string) {
  const ably = getClient();
  if (!ably) return;
  try {
    await ably.channels.get(matchChannelName(matchId)).publish("update", null);
  } catch (error) {
    console.error("No se pudo publicar en Ably:", error);
  }
}

/**
 * Token de solo lectura para un partido puntual: no sirve para suscribirse a otro canal.
 * `null` si el tiempo real no está configurado.
 */
export async function createMatchViewerToken(matchId: string) {
  const ably = getClient();
  if (!ably) return null;
  return ably.auth.createTokenRequest({
    capability: { [matchChannelName(matchId)]: ["subscribe"] },
    ttl: 60 * 60 * 1000,
  });
}

/**
 * Token de solo lectura para CUALQUIER partido (capability "match:*"), a diferencia de
 * `createMatchViewerToken` que ata el token a uno solo. Lo usan las pantallas de fixture de un
 * torneo (varios partidos a la vez, y cuál está en vivo cambia mientras la pantalla sigue
 * abierta): pedir un token nuevo cada vez que otro partido arranca sería más complejo que
 * simplemente cubrir todos — el aviso que se publica no lleva ningún dato (ver
 * `publicarEventoPartido`), así que no hay nada sensible que este alcance más amplio exponga.
 * `null` si el tiempo real no está configurado.
 */
export async function createTournamentViewerToken() {
  const ably = getClient();
  if (!ably) return null;
  return ably.auth.createTokenRequest({
    capability: { [`${CHANNEL_PREFIX}*`]: ["subscribe"] },
    ttl: 60 * 60 * 1000,
  });
}
