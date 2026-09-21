"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { safeInternalPath } from "@/_lib/safe-next";

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  roles: string[];
};

type Result = { ok: boolean; error?: string };

type RegisterInput = { name: string; email: string; password: string };

type AuthContextValue = {
  user: AuthUser | null;
  /** true mientras se consulta si ya hay una sesión abierta (al cargar la página). */
  loading: boolean;
  login: (email: string, password: string, next?: string | null) => Promise<Result>;
  register: (input: RegisterInput, next?: string | null) => Promise<Result>;
  logout: () => Promise<void>;
  /** Activa un perfil (ORGANIZADOR, CLUB_OWNER o JUGADOR) en la cuenta actual. */
  addRole: (role: "ORGANIZADOR" | "CLUB_OWNER" | "JUGADOR") => Promise<Result>;
  /** Vuelve a consultar la sesión (por ejemplo después de registrarse por otro camino). */
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const DEFAULT_LANDING = "/seleccion-perfil";

function safeNext(next: string | null | undefined) {
  return safeInternalPath(next, DEFAULT_LANDING);
}

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setUser(data.user ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string, next?: string | null): Promise<Result> => {
      const { res, data } = await postJson("/api/auth/login", { email, password });
      if (!res.ok) return { ok: false, error: data.error ?? "Error al iniciar sesión" };
      setUser(data);
      router.push(safeNext(next));
      return { ok: true };
    },
    [router]
  );

  const register = useCallback(
    async ({ name, email, password }: RegisterInput, next?: string | null): Promise<Result> => {
      const [firstName, ...rest] = name.trim().split(/\s+/);
      const { res, data } = await postJson("/api/auth/register", {
        email,
        password,
        firstName,
        lastName: rest.join(" "),
      });
      if (!res.ok) return { ok: false, error: data.error ?? "Error al crear cuenta" };
      setUser(data);
      router.push(safeNext(next));
      return { ok: true };
    },
    [router]
  );

  const logout = useCallback(async () => {
    await postJson("/api/auth/logout").catch(() => {});
    setUser(null);
    router.push("/");
  }, [router]);

  const addRole = useCallback(async (role: "ORGANIZADOR" | "CLUB_OWNER" | "JUGADOR"): Promise<Result> => {
    const { res, data } = await postJson("/api/auth/roles", { role });
    if (!res.ok) return { ok: false, error: data.error ?? "No se pudo activar el perfil" };
    setUser((prev) => (prev ? { ...prev, roles: data.roles } : prev));
    return { ok: true };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data.user ?? null);
    } catch {
      /* si falla se conserva lo que ya había */
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, addRole, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
