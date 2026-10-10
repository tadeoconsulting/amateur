"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useApi } from "@/_lib/use-api";
import { useAuth } from "@/lib/auth-context";
import { btnOutline, btnSolid } from "@/_components/button-styles";
import { PageSpinner } from "@/_components/spinner";

// Quien recibió una invitación a reclamar su perfil de jugador (especificación 009, entrega 3). Es pública: la
// abre quien tiene el enlace, sin cuenta todavía. Muestra solo el nombre del perfil y el equipo; para vincularlo
// hay que iniciar sesión (o crear la cuenta) y confirmar el DNI.

type Preview = { playerName: string; clubName: string | null; clubColor: string | null; expiresAt: string; emailHint: string | null };
type Loaded = { ok: true; data: Preview } | { ok: false; error: string; code?: string };
type Outcome = { kind: "accepted" } | { kind: "review" };

export default function ReclamarPerfilPage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: loadingAuth, refresh } = useAuth();
  const { data: loaded } = useApi<Loaded>(async () => {
    const res = await fetch(`/api/profile-invitations/${token}`);
    const body = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, data: body as Preview } : { ok: false, error: body.error ?? "No se pudo abrir la invitación", code: body.code };
  });

  const [dni, setDni] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const here = `/jugador/invitacion/perfil/${token}`;

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/profile-invitations/${token}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dni }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "No se pudo vincular tu perfil. Inténtalo de nuevo.");
    setOutcome({ kind: body.status === "review" ? "review" : "accepted" });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-4 pb-10">
      <header className="py-3">
        <Link href="/" className="font-heading text-lg font-bold text-text-primary">
          Amateur
        </Link>
      </header>

      {!loaded || loadingAuth ? (
        <PageSpinner />
      ) : !loaded.ok ? (
        <section className="mt-10 text-center" aria-live="polite">
          <h1 className="font-heading text-xl font-bold text-text-primary">
            {loaded.code === "expired" ? "La invitación venció" : loaded.code === "locked" ? "La invitación se bloqueó" : loaded.code === "used" ? "La invitación ya no está disponible" : "Esta invitación no existe"}
          </h1>
          <p className="mt-2 font-body text-sm text-text-secondary">{loaded.error}</p>
          <Link href="/" className={`${btnOutline} mt-6`}>
            Ir al inicio
          </Link>
        </section>
      ) : outcome ? (
        <section className="mt-10 text-center" aria-live="polite">
          <h1 className="font-heading text-xl font-bold text-text-primary">{outcome.kind === "accepted" ? "¡Listo! Tu perfil ya es tuyo" : "Recibimos tu confirmación"}</h1>
          <p className="mt-2 font-body text-sm text-text-secondary">
            {outcome.kind === "accepted"
              ? `El perfil de ${loaded.data.playerName}${loaded.data.clubName ? ` en ${loaded.data.clubName}` : ""} quedó vinculado a tu cuenta, con todo lo que ya tenía.`
              : "Como tu cuenta ya tiene una ficha en este equipo, un administrador unirá los dos perfiles. No tienes que hacer nada más."}
          </p>
          {/* Se refresca la sesión primero: así trae el perfil de jugador que acaba de agregarse. */}
          <Link href="/jugador/torneos" onClick={() => void refresh()} className={`${btnSolid} mt-6`}>
            Ir a mis torneos
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-4 overflow-hidden rounded-2xl border border-border-primary">
            <div className="h-2" style={{ backgroundColor: loaded.data.clubColor ?? "#1B1B1B" }} aria-hidden="true" />
            <div className="p-5">
              <p className="font-body text-xs text-text-secondary">Tu perfil de jugador</p>
              <h1 className="mt-1 font-heading text-2xl font-bold leading-tight text-text-primary">{loaded.data.playerName}</h1>
              {loaded.data.clubName && <p className="mt-1 font-body text-sm text-text-secondary">{loaded.data.clubName}</p>}
              <p className="mt-4 font-body text-sm text-text-primary">
                Ya cargaron tu perfil en Amateur. Vincúlalo a tu cuenta para ver tus goles y tus partidos.
              </p>
            </div>
          </section>

          {!user ? (
            <section className="mt-6 flex flex-col gap-3">
              <p className="font-body text-sm text-text-secondary">
                {loaded.data.emailHint ? (
                  <>
                    Entra o crea tu cuenta con el correo <strong className="text-text-primary">{loaded.data.emailHint}</strong>: la invitación es para ese correo.
                  </>
                ) : (
                  "Entra con tu cuenta, o crea una si todavía no tienes."
                )}
              </p>
              <Link href={`/?auth=login&next=${encodeURIComponent(here)}`} className={btnSolid}>
                Iniciar sesión
              </Link>
              <Link href={`/?auth=register&rol=JUGADOR&next=${encodeURIComponent(here)}`} className={btnOutline}>
                Crear cuenta
              </Link>
            </section>
          ) : (
            <form onSubmit={confirm} className="mt-6 flex flex-col gap-3" noValidate>
              <p className="font-body text-xs text-text-secondary">
                Entraste como <strong className="text-text-primary">{user.email}</strong>
              </p>
              <label htmlFor="rp-dni" className="font-heading text-sm font-semibold text-text-primary">
                Confirma tu DNI
              </label>
              <input
                id="rp-dni"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                maxLength={11}
                aria-describedby="rp-dni-ayuda rp-dni-error"
                aria-invalid={error ? true : undefined}
                className={`min-h-12 w-full rounded-lg border bg-surface-primary px-3 font-body text-base tabular-nums tracking-wide text-text-primary outline-none focus:border-brand-500 ${error ? "border-red-500" : "border-border-primary"}`}
                placeholder="8 dígitos"
              />
              <p id="rp-dni-ayuda" className="font-body text-xs text-text-secondary">
                Es el DNI con el que cargaron tu perfil. No lo mostramos a nadie.
              </p>
              <p id="rp-dni-error" role="alert" className="min-h-5 font-body text-sm text-red-700">
                {error}
              </p>
              <button type="submit" disabled={busy || dni.replace(/\D/g, "").length < 8} className={`${btnSolid} disabled:cursor-not-allowed disabled:opacity-50`}>
                {busy ? "Confirmando..." : "Confirmar mi perfil"}
              </button>
              <p className="text-center font-body text-xs text-text-secondary">
                La invitación vence el {new Date(loaded.data.expiresAt).toLocaleDateString("es-PE", { day: "numeric", month: "long" })}.
              </p>
            </form>
          )}
        </>
      )}
    </main>
  );
}
