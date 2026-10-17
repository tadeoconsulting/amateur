"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useApi } from "@/_lib/use-api";
import { useAuth } from "@/lib/auth-context";
import { btnOutline, btnSolid } from "@/_components/button-styles";
import { PageSpinner } from "@/_components/spinner";
import { SwitchAccount } from "@/_components/switch-account";

// Quien recibió una invitación a ser delegado de un equipo temporal (especificación 009, entrega 4). Es pública: la
// abre quien tiene el enlace, sin cuenta todavía. Muestra solo el equipo. Sin sesión, crea su cuenta ahí mismo (nombre,
// contraseña) y acepta en el mismo paso; con sesión, solo confirma. Al aceptar, su cuenta pasa a ser la dueña del equipo.

type Preview = { clubName: string; clubColor: string | null; clubLogoUrl: string | null; expiresAt: string; emailHint: string | null };
type Loaded = { ok: true; data: Preview } | { ok: false; error: string; code?: string };

const field =
  "min-h-12 w-full rounded-lg border border-transparent bg-btn-regular px-3 font-body text-base text-text-primary placeholder:text-text-primary/60 transition-colors hover:border-border-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none disabled:cursor-not-allowed disabled:text-text-secondary";

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
  const [accountExists, setAccountExists] = useState(false);
  const [done, setDone] = useState(false);
  // Para crear la cuenta (solo sin sesión).
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const here = `/delegado/invitacion/${token}`;

  async function send(body?: Record<string, string>) {
    setBusy(true);
    setError(null);
    setAccountExists(false);
    const res = await fetch(`/api/delegate-invitations/${token}/accept`, {
      method: "POST",
      ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    });
    const result = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setAccountExists(result.code === "account_exists");
      return setError(result.error ?? "No se pudo completar. Inténtalo de nuevo.");
    }
    // Sin sesión, la cuenta se acaba de crear y la sesión ya está abierta: se trae para que la página lo sepa
    // (primero se marca como hecho, para no mostrar un instante "Entraste como…" antes del mensaje final).
    setDone(true);
    await refresh();
  }

  const hasFixedEmail = loaded?.ok === true && loaded.data.emailHint !== null;
  const canCreate = firstName.trim().length > 0 && password.length >= 8 && (hasFixedEmail || email.includes("@"));

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
            <form
              className="mt-6 flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (canCreate && !busy) void send({ firstName: firstName.trim(), lastName: lastName.trim(), password, ...(hasFixedEmail ? {} : { email: email.trim() }) });
              }}
            >
              <h2 className="font-heading text-base font-bold text-text-primary">Crea tu cuenta para aceptar</h2>
              <label className="sr-only" htmlFor="del-first">
                Nombre
              </label>
              <input id="del-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nombre" autoComplete="given-name" maxLength={80} className={field} />
              <label className="sr-only" htmlFor="del-last">
                Apellidos
              </label>
              <input id="del-last" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Apellidos" autoComplete="family-name" maxLength={80} className={field} />
              <label className="sr-only" htmlFor="del-email">
                Correo electrónico
              </label>
              {hasFixedEmail ? (
                <>
                  <input id="del-email" type="text" value={loaded.data.emailHint ?? ""} readOnly disabled aria-describedby="del-email-help" className={field} />
                  <p id="del-email-help" className="-mt-1 font-body text-xs text-text-secondary">
                    Es el correo al que te llegó la invitación: tu cuenta se crea con él.
                  </p>
                </>
              ) : (
                <input id="del-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico" autoComplete="email" maxLength={254} className={field} />
              )}
              <label className="sr-only" htmlFor="del-password">
                Contraseña
              </label>
              <input
                id="del-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña (mínimo 8 caracteres)"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                className={field}
              />

              <p role="alert" className="min-h-5 font-body text-sm text-red-700">
                {error}
              </p>
              <button type="submit" disabled={!canCreate || busy} className={`${btnSolid} disabled:cursor-not-allowed disabled:opacity-50`}>
                {busy ? "Creando tu cuenta..." : "Aceptar y crear mi cuenta"}
              </button>
              <p className="text-center font-body text-xs text-text-secondary">
                La invitación vence el {new Date(loaded.data.expiresAt).toLocaleDateString("es-PE", { day: "numeric", month: "long" })}.
              </p>

              <p className={`border-t border-border-primary pt-4 text-center font-body text-sm ${accountExists ? "text-text-primary" : "text-text-secondary"}`}>
                ¿Ya tienes cuenta?{" "}
                <Link href={`/?auth=login&next=${encodeURIComponent(here)}`} className="font-semibold text-text-primary underline">
                  Inicia sesión
                </Link>
              </p>
            </form>
          ) : (
            <section className="mt-6 flex flex-col gap-3">
              <p className="font-body text-xs text-text-secondary">
                Entraste como <strong className="text-text-primary">{user.email}</strong>
              </p>
              <p role="alert" className="min-h-5 font-body text-sm text-red-700">
                {error}
              </p>
              <button type="button" onClick={() => void send()} disabled={busy} className={`${btnSolid} disabled:cursor-not-allowed disabled:opacity-50`}>
                {busy ? "Aceptando..." : "Aceptar y ser delegado"}
              </button>
              <p className="text-center font-body text-xs text-text-secondary">
                La invitación vence el {new Date(loaded.data.expiresAt).toLocaleDateString("es-PE", { day: "numeric", month: "long" })}.
              </p>
              <SwitchAccount here={here} registerRole="CLUB_OWNER" />
            </section>
          )}
        </>
      )}
    </main>
  );
}
