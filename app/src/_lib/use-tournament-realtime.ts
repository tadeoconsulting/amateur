"use client";

import { useEffect, useRef } from "react";

/**
 * Se suscribe a los partidos EN VIVO de un torneo (puede haber varios a la vez) y llama a
 * `onUpdate` cuando cualquiera tiene novedades — sin decir cuál, igual que
 * `useMatchRealtime`: quien recibe vuelve a pedir el estado por GET.
 *
 * A diferencia de `useMatchRealtime` (un solo partido conocido de antemano), acá la lista de
 * partidos en vivo puede cambiar mientras la pantalla sigue abierta — un partido arranca, otro
 * termina — así que se re-suscribe cada vez que cambia el conjunto de ids en vivo (ver
 * `createTournamentViewerToken`: el token cubre cualquier partido, así que no hace falta pedir
 * uno nuevo por eso). Cliente lazy y silencioso, igual que `useMatchRealtime`.
 */
export function useTournamentRealtime(liveMatchIds: string[], onUpdate: () => void) {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  // Se compara por contenido (ids ordenados), no por identidad del array: la lista de partidos
  // en vivo se recalcula en cada render a partir de la data ya cargada.
  const key = [...new Set(liveMatchIds)].sort().join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    let client: import("ably").Realtime | null = null;

    import("ably")
      .then(({ default: Ably }) => {
        if (cancelled) return;
        client = new Ably.Realtime({
          authUrl: "/api/realtime-token",
          autoConnect: true,
        });
        for (const id of key.split(",")) {
          client.channels.get(`match:${id}`).subscribe(() => onUpdateRef.current());
        }
      })
      .catch(() => {
        // Sin el paquete, sin red o sin tiempo real configurado: la pantalla se queda con lo
        // que trajo la carga inicial, igual que useMatchRealtime.
      });

    return () => {
      cancelled = true;
      client?.close();
    };
  }, [key]);
}
