"use client";

import { useEffect, useRef } from "react";

/**
 * Se suscribe a las novedades de un partido y llama a `onUpdate` cada vez que hay una (sin decir
 * cuál: quien la recibe vuelve a pedir el estado por GET). Cliente lazy — Ably solo se carga si
 * esta pantalla se abre — y silenciosa: si el tiempo real no está configurado o falla la
 * conexión, no pasa nada más que quedarse sin empuje en vivo; la carga inicial ya trajo el
 * estado, y una recarga manual sigue funcionando.
 */
export function useMatchRealtime(matchId: string, onUpdate: () => void) {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  useEffect(() => {
    let cancelled = false;
    let client: import("ably").Realtime | null = null;

    import("ably")
      .then(({ default: Ably }) => {
        if (cancelled) return;
        client = new Ably.Realtime({
          authUrl: `/api/matches/${matchId}/realtime-token`,
          // El endpoint ya devuelve un TokenRequest (POJO); nada de reintentar con una API key.
          autoConnect: true,
        });
        // La promesa de conexión al canal se rechaza si la pantalla se cierra antes de conectar: se ignora.
        client.channels.get(`match:${matchId}`).subscribe(() => onUpdateRef.current()).catch(() => {});
      })
      .catch(() => {
        // Sin el paquete o sin red: la ficha se queda con lo que trajo la carga inicial.
      });

    return () => {
      cancelled = true;
      client?.close();
    };
  }, [matchId]);
}
