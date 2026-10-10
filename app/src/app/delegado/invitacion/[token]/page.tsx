"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useApi } from "@/_lib/use-api";
import { useAuth } from "@/lib/auth-context";
import { btnOutline, btnSolid } from "@/_components/button-styles";
import { PageSpinner } from "@/_components/spinner";

// Quien recibió una invitación a ser delegado de un equipo temporal (especificación 009, entrega 4). Es pública: la
// abre quien tiene el enlace, sin cuenta todavía. Muestra solo el equipo; para aceptar hay que iniciar sesión (o
// crear la cuenta) y confirmar. Al aceptar, su cuenta pasa a ser la dueña del equipo.

type Preview = { clubName: string; clubColor: string | null; clubLogoUrl: string | null; expiresAt: string; emailHint: string | null };
type Loaded = { ok: true; data: Preview } | { ok: false; error: string; code?: string };

export default function InvitacionDelegadoPage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: loadingAuth, refresh } = useAuth();
  const { data: loaded } = useApi<Loaded>(async () => {
    const res = await fetch(`/api/delegate-invitations/${token}`);
    const body = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, data: body as Preview } : { ok: false, error: body.error ?? "No se pudo abrir la invitación", code: body.code };
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const here = `/delegado/invitacion/${token}`;

  async function accept() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/delegate-invitations/${token}/accept`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "No se pudo completar. Inténtalo de nuevo.");
    setDone(true);
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
            {loaded.code === "expired" ? "La invitación venció" : loaded.code === "official" ? "Este equipo ya tiene delegado" : loaded.code === "used" ? "La invitación ya no está disponible" : "Esta invitación no existe"}
          </h1>
          <p className="mt-2 font-body text-sm text-text-secondary">{loaded.error}</p>
          <Link href="/" className={`${btnOutline} mt-6`}>
            Ir al inicio
          </Link>
        </section>
      ) : done ? (
        <section className="mt-10 text-center" aria-live="polite">
          <h1 className="font-heading text-xl font-bold text-text-primary">¡Listo! Ya eres el delegado</h1>
          <p className="mt-2 font-body text-sm text-text-secondary">
            {loaded.data.clubName} quedó a tu nombre: desde ahora manejas el equipo, sus jugadores y sus torneos con tu cuenta.
          </p>
          {/* Se refresca la sesión primero: así trae el perfil de delegado que acaba de agregarse. */}
          <Link href="/club" onClick={() => void refresh()} className={`${btnSolid} mt-6`}>
            Ir a mi equipo
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-4 overflow-hidden rounded-2xl border border-border-primary">
            <div className="h-2" style={{ backgroundColor: loaded.data.clubColor ?? "#1B1B1B" }} aria-hidden="true" />
            <div className="p-5">
              <p className="font-body text-xs text-text-secondary">Te invitaron a ser el delegado de</p>
              <h1 className="mt-1 font-heading text-2xl font-bold leading-tight text-text-primary">{loaded.data.clubName}</h1>
              <p className="mt-4 font-body text-sm text-text-primary">
                Al aceptar, el equipo pasa a tu cuenta: manejas sus jugadores, sus titulares y sus torneos. Sigue inscrito en los torneos donde ya juega.
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
              <Link href={`/?auth=register&rol=CLUB_OWNER&next=${encodeURIComponent(here)}`} className={btnOutline}>
                Crear cuenta
              </Link>
            </section>
          ) : (
            <section className="mt-6 flex flex-col gap-3">
              <p className="font-body text-xs text-text-secondary">
                Entraste como <strong className="text-text-primary">{user.email}</strong>
              </p>
              <p role="alert" className="min-h-5 font-body text-sm text-red-700">
                {error}
              </p>
              <button type="button" onClick={() => void accept()} disabled={busy} className={`${btnSolid} disabled:cursor-not-allowed disabled:opacity-50`}>
                {busy ? "Aceptando..." : "Aceptar y ser delegado"}
              </button>
              <p className="text-center font-body text-xs text-text-secondary">
                La invitación vence el {new Date(loaded.data.expiresAt).toLocaleDateString("es-PE", { day: "numeric", month: "long" })}.
              </p>
            </section>
          )}
        </>
      )}
    </main>
  );
}
