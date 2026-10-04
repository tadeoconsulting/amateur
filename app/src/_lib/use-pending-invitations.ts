"use client";

import { useApi } from "@/_lib/use-api";
import { useRefetchOnChange } from "@/_lib/notifications-changed";

/** Cuántas invitaciones de un club esperan respuesta del jugador (se aceptan desde "Mis equipos"). */
export function usePendingInvitations() {
  const { data, refetch } = useApi<{ token: string }[]>(() =>
    fetch("/api/invitations/mine").then((r) => (r.ok ? r.json() : []))
  );
  useRefetchOnChange(refetch);
  return data?.length ?? 0;
}
