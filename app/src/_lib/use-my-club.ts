"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

export type MyClub = { id: string; name: string };

/**
 * El club de quien tiene la sesión (si gestiona varios, el primero).
 * `club` es null si todavía no tiene uno; `loading` es true mientras se averigua.
 */
export function useMyClub() {
  const { user, loading: loadingAuth } = useAuth();
  const [club, setClub] = useState<MyClub | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch(`/api/clubs?ownerId=${user.id}`)
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

  return { club, loading: loadingAuth || (!!user && loadedFor !== user.id) };
}
