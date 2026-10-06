"use client";

import { useEffect, useRef } from "react";

/**
 * Se suscribe a los partidos de un torneo que todavía pueden tener novedades — programados o
 * en vivo, no finalizados — y llama a `onUpdate` cuando cualquiera cambia: sin decir cuál,
 * igual que `useMatchRealtime`; quien recibe vuelve a pedir el estado por GET.
 *
 * Importante: `matchIds` debe incluir los partidos PROGRAMADOS, no solo los que ya están en
 * vivo. Antes solo se pasaban los `en_curso`, así que cuando el organizador arrancaba un
 * partido nadie estaba escuchando ese canal todavía — la pantalla del club se enteraba recién
 * si alguien la recargaba a mano. Al estar suscripto desde que el partido está programado, el
 * evento que dispara `publicarEventoPartido` al arrancarlo sí llega.
 *
 * A diferencia de `useMatchRealtime` (un solo partido conocido de antemano), acá la lista de
 * partidos a mirar puede cambiar mientras la pantalla sigue abierta — un partido arranca, otro
 * termina — así que se re-suscribe cada vez que cambia el conjunto de ids (ver
 * `createTournamentViewerToken`: el token cubre cualquier partido, así que no hace falta pedir
 * uno nuevo por eso). Cliente lazy y silencioso, igual que `useMatchRealtime`.
 */
export function useTournamentRealtime(matchIds: string[], onUpdate: () => void) {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  // Se compara por contenido (ids ordenados), no por identidad del array: la lista de partidos
  // a mirar se recalcula en cada render a partir de la data ya cargada.
  const key = [...new Set(matchIds)].sort().join(",");

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
          // subscribe() devuelve la promesa de la conexión al canal; si la pantalla se cierra antes de
          // conectar, se rechaza ("Connection closed") — es esperado, no un error: se ignora.
          client.channels.get(`match:${id}`).subscribe(() => onUpdateRef.current()).catch(() => {});
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
