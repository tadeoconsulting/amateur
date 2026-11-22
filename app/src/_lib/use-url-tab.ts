"use client";

import { useCallback, useState } from "react";
import { tabFromSearch, withTab } from "@/_lib/url-tab";

/**
 * El tab de una sección guardado en la dirección (`?tab=…`), con la misma interfaz que `useState`. Las secciones del delegado
 * (Equipo, Seguimiento, Gestión) lo usan para que se pueda volver al tab desde una pantalla de detalle (especificación 023).
 * Se lee al montar (estas pantallas se montan ya en el navegador, tras cargar el club), y al cambiar se reescribe la
 * dirección sin agregar entradas al historial.
 */
export function useUrlTab<K extends string>(valid: readonly K[], fallback: K): [K, (tab: K) => void] {
  const [tab, setTabState] = useState<K>(() => (typeof window === "undefined" ? fallback : tabFromSearch(window.location.search, valid, fallback)));
  const setTab = useCallback(
    (next: K) => {
      setTabState(next);
      window.history.replaceState(null, "", `${window.location.pathname}${withTab(window.location.search, next, fallback)}${window.location.hash}`);
    },
    [fallback],
  );
  return [tab, setTab];
}
