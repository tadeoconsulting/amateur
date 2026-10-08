"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { safeInternalPath } from "@/_lib/safe-next";

const input =
  "w-full rounded-lg bg-brand-300 px-4 py-3 font-body text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-field-green";

export function AdminLoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Solo se vuelve a una página del panel; cualquier otro destino se ignora.
  const target = (() => {
    const path = safeInternalPath(next, "/admin");
    return path === "/admin" || path.startsWith("/admin/") ? path : "/admin";
  })();

  // Quien ya tiene sesión de administrador entra directo.
  useEffect(() => {
    if (!loading && user?.roles.includes("ADMIN")) router.replace(target);
  }, [loading, user, router, target]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar sesión");
        return;
      }
      await refresh();
      router.push(target);
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-brand-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface-primary px-6 py-8 shadow-xl">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-secondary">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 2h8v4a4 4 0 01-8 0V2z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 10v2M10 10v2M5 12h6a1 1 0 011 1v1H4v-1a1 1 0 011-1z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="font-heading text-sm font-bold text-text-primary">Amateur</p>
            <p className="font-body text-[11px] text-text-secondary">Panel de administración</p>
          </div>
        </div>

        <h1 className="mb-1 font-heading text-xl font-bold text-text-primary">Ingreso de administrador</h1>
        <p className="mb-6 font-body text-sm text-text-secondary">Solo para cuentas de administración.</p>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Correo electrónico"
            aria-label="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            className={input}
          />
          <input
            type="password"
            placeholder="Contraseña"
            aria-label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            maxLength={72}
            autoComplete="current-password"
            className={input}
          />
          {error && (
            <p role="alert" className="font-body text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full cursor-pointer rounded-lg bg-surface-secondary py-3 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
