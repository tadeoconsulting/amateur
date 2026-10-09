"use client";

import { useSyncExternalStore } from "react";

/**
 * ¿Se cumple esta media query? Falso en el servidor y en la primera pintura; después se mantiene al día
 * si la ventana cambia de tamaño. Sirve para montar (y pedir datos de) piezas que solo existen en
 * pantallas anchas, en vez de montarlas ocultas con CSS.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
