"use client";

import { useState } from "react";

const inputClass =
  "w-full rounded-lg bg-brand-300 px-4 py-3 font-body text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-field-green";

/** "Olvidé mi contraseña": pide el correo y avisa que, si hay una cuenta, le llega un enlace. */
export function ForgotPasswordPanel({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo enviar. Inténtalo de nuevo.");
        return;
      }
      setSent(true);
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h2 className="mb-1 font-heading text-xl font-bold text-text-primary">Recupera tu contraseña</h2>

      {sent ? (
        <>
          {/* Es la misma respuesta exista o no la cuenta: no dice si el correo está registrado. */}
          <p role="status" className="mb-6 font-body text-sm text-text-secondary">
            Si <strong className="text-text-primary">{email}</strong> tiene una cuenta, te enviamos un enlace para elegir una contraseña nueva. Vale una hora. Revisa también la carpeta de spam.
          </p>
          <button
            onClick={onBack}
            className="w-full cursor-pointer rounded-lg bg-surface-secondary py-3 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700"
          >
            Volver a iniciar sesión
          </button>
        </>
      ) : (
        <>
          <p className="mb-6 font-body text-sm text-text-secondary">Ingresa el correo de tu cuenta y te enviamos un enlace para elegir una contraseña nueva.</p>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={inputClass}
            />
            {error && <p role="alert" className="font-body text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={sending || !email}
              className="w-full cursor-pointer rounded-lg bg-surface-secondary py-3 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {sending ? "Enviando..." : "Enviarme el enlace"}
            </button>
          </form>
          <button
            onClick={onBack}
            className="mt-4 w-full cursor-pointer text-center font-heading text-sm font-semibold text-text-primary underline"
          >
            Volver a iniciar sesión
          </button>
        </>
      )}
    </div>
  );
}
