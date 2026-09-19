"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";

type AuthView = "login" | "register";

export function AuthModal({
  open,
  onClose,
  initialView = "login",
}: {
  open: boolean;
  onClose: () => void;
  initialView?: AuthView;
}) {
  const { login, register } = useAuth();
  const [view, setView] = useState<AuthView>(initialView);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      setEmail("");
      setPassword("");
      setName("");
      setError("");
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (view === "login") {
        const result = await login(email, password);
        if (!result.ok) {
          setError(result.error ?? "Error al iniciar sesión");
          return;
        }
      } else {
        const result = await register(name, email);
        if (!result.ok) {
          setError(result.error ?? "Error al crear cuenta");
          return;
        }
      }
      onClose();
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={view === "login" ? "Iniciar sesión" : "Crear cuenta"}
    >
      <div className="relative w-full sm:max-w-md bg-surface-primary rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 pt-6 pb-8">
          {/* Close button row */}
          <div className="flex justify-end mb-4">
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              aria-label="Cerrar"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="4" y1="16" x2="16" y2="4" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-brand-300 rounded-lg p-1 mb-8">
            <button
              onClick={() => { setView("login"); setError(""); }}
              className={`flex-1 py-2.5 text-sm font-heading font-bold rounded-md transition-colors cursor-pointer ${
                view === "login"
                  ? "bg-surface-primary text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => { setView("register"); setError(""); }}
              className={`flex-1 py-2.5 text-sm font-heading font-bold rounded-md transition-colors cursor-pointer ${
                view === "register"
                  ? "bg-surface-primary text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Crear cuenta
            </button>
          </div>

          {/* Header */}
          <h2 className="font-heading text-xl font-bold text-text-primary mb-1">
            {view === "login" ? "Bienvenid@ de vuelta" : "Crea tu cuenta"}
          </h2>
          <p className="font-body text-sm text-text-secondary mb-6">
            {view === "login"
              ? "Inicia sesión para gestionar tus torneos."
              : "Regístrate y crea tu primer torneo gratis."}
          </p>

          {/* Google button */}
          <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-primary bg-white px-4 py-3 transition-colors hover:bg-brand-300 cursor-pointer">
            <Image src="/google-icon.svg" alt="" width={20} height={20} />
            <span className="font-heading text-sm font-semibold text-text-primary">
              Continuar con Google
            </span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-brand-200" />
            <span className="font-heading text-xs text-text-secondary">o</span>
            <div className="h-px flex-1 bg-brand-200" />
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {view === "register" && (
              <input
                type="text"
                placeholder="Nombre completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg bg-brand-300 px-4 py-3 font-body text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-field-green"
              />
            )}
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg bg-brand-300 px-4 py-3 font-body text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-field-green"
            />
            {view === "login" && (
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg bg-brand-300 px-4 py-3 font-body text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-field-green"
              />
            )}

            {error && (
              <p className="text-sm text-red-600 font-body">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-surface-secondary py-3 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 cursor-pointer disabled:opacity-50"
            >
              {loading ? "Cargando..." : view === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </button>
          </form>

          {/* Test credentials hint */}
          {view === "login" && (
            <div className="mt-4 rounded-lg bg-field-light border border-field-green/20 px-4 py-3">
              <p className="font-heading text-xs font-bold text-field-dark mb-1">Usuario de prueba</p>
              <p className="font-body text-xs text-text-secondary">
                demo@amateur.app / amateur123
              </p>
            </div>
          )}

          {/* Footer links */}
          {view === "login" && (
            <button
              onClick={() => {}}
              className="mt-4 w-full text-center font-heading text-sm font-semibold text-text-primary underline cursor-pointer"
            >
              Olvidé mi contraseña
            </button>
          )}

          <p className="mt-4 text-center text-xs text-text-secondary font-heading leading-relaxed">
            Al continuar aceptas nuestros{" "}
            <Link href="/terminos" className="font-bold underline text-text-primary">
              Términos
            </Link>{" "}
            y{" "}
            <Link href="/privacidad" className="font-bold underline text-text-primary">
              Privacidad
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
