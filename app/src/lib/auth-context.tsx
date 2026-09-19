"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string;
  email: string;
};

type AuthContextValue = {
  user: User | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (name: string, email: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
};

const TEST_USER = {
  id: "test-001",
  name: "Demo Amateur",
  email: "demo@amateur.app",
  password: "amateur123",
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  const login = useCallback(async (email: string, password: string) => {
    await new Promise((r) => setTimeout(r, 600));

    if (email === TEST_USER.email && password === TEST_USER.password) {
      setUser({ id: TEST_USER.id, name: TEST_USER.name, email: TEST_USER.email });
      router.push("/seleccion-perfil");
      return { ok: true };
    }
    return { ok: false, error: "Correo o contraseña incorrectos" };
  }, [router]);

  const register = useCallback(async (name: string, email: string) => {
    await new Promise((r) => setTimeout(r, 600));
    setUser({ id: "new-" + Date.now(), name, email });
    router.push("/seleccion-perfil");
    return { ok: true };
  }, [router]);

  const logout = useCallback(() => {
    setUser(null);
    router.push("/");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
