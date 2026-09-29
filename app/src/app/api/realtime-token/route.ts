import { createTournamentViewerToken, isRealtimeConfigured } from "@/_lib/realtime";

/**
 * Token de Ably (solo lectura, cualquier partido) para las pantallas de fixture de un torneo —
 * varios partidos a la vez, algunos en vivo — que reciben novedades sin recargar. No depende de
 * un torneo o partido puntual (ver `createTournamentViewerToken`), así que no lleva parámetros.
 * Público, como el resto de las lecturas de un torneo/partido (especificación 001, regla 19).
 */
export async function GET() {
  if (!isRealtimeConfigured()) {
    return Response.json({ error: "Tiempo real no configurado" }, { status: 503 });
  }
  const tokenRequest = await createTournamentViewerToken();
  return Response.json(tokenRequest);
}
