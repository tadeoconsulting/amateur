"use client";

import { useEffect, useRef } from "react";

/**
 * Aviso liviano de "algo pendiente cambió" (se aceptó/rechazó una invitación o solicitud),
 * para que los badges de los bottom nav (que viven en el layout y no se remontan al navegar
 * entre pantallas del mismo perfil) se refresquen sin tener que levantar un estado compartido.
 * No lleva payload: quien escucha simplemente vuelve a pedir lo suyo.
 */
const EVENT_NAME = "amateur:notifications-changed";

export function notifyChanged() {
  window.dispatchEvent(new Event(EVENT_NAME));
}

/** Vuelve a llamar `refetch` cada vez que algo (en cualquier pantalla) llama a `notifyChanged`. */
export function useRefetchOnChange(refetch: () => void) {
  // Ref en vez de dependencia: así el listener se registra una sola vez, sin importar que
  // `refetch` sea una función nueva en cada render (useApi no la memoiza). Se actualiza en un
  // efecto (no durante el render) porque React no deja tocar un ref mientras se renderiza.
  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  });

  useEffect(() => {
    const handler = () => refetchRef.current();
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);
}
