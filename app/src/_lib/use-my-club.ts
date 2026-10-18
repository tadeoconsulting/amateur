"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

export type MyClub = { id: string; name: string; shortName: string; logoUrl: string | null; color: string | null; ownerId?: string };

/**
 * El club de quien tiene la sesión, como delegado principal o co-delegado (si gestiona varios, el primero).
 * `club` es null si todavía no tiene uno; `loading` es true mientras se averigua.
 */
export function useMyClub() {
  const { user, loading: loadingAuth } = useAuth();
  const [club, setClub] = useState<MyClub | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch(`/api/clubs?delegateId=${user.id}`)
      .then((r) => r.json())
      .then((clubs: MyClub[]) => {
        if (!cancelled) setClub(Array.isArray(clubs) && clubs.length > 0 ? clubs[0] : null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadedFor(user.id);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // El delegado principal es el dueño del club; un co-delegado (especificación 014) gestiona lo mismo, salvo el contacto
  // público del delegado, que cambia solo el principal.
  const isPrincipal = !!club && !!user && club.ownerId === user.id;
  return { club, isPrincipal, loading: loadingAuth || (!!user && loadedFor !== user.id) };
}
