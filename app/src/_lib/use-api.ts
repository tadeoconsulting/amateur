"use client";

import { useState, useEffect } from "react";

export function useApi<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcher()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    data,
    loading,
    error,
    refetch: () => {
      setLoading(true);
      fetcher().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
    },
    /** Igual que `refetch`, pero sin pasar por `loading` — para no mostrar el spinner de carga
     * completa cuando la novedad llega por una suscripción en vivo (ver `use-match-realtime.ts`). */
    refetchSilently: () => {
      fetcher().then(setData).catch(() => {});
    },
  };
}
