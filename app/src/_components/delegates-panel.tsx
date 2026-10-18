"use client";

import { useState } from "react";
import { useApi } from "@/_lib/use-api";
import { useAuth } from "@/lib/auth-context";
import { btnOutline, btnSolid, btnText } from "@/_components/button-styles";
import { Spinner } from "@/_components/spinner";
import { Toast } from "@/_components/toast";

// Los delegados de un equipo (especificación 014): el principal, los co-delegados y, para quien los gestiona (el
// principal o un admin), las invitaciones pendientes y el formulario para invitar. Lo usan la pestaña Equipo → Delegados
// del club y el panel del admin, con lo mismo: lo que cambia lo decide la API (`role`, `canManage`, `canInvite`).

type Delegates = {
  role: "admin" | "principal" | "co";
  canManage: boolean;
  canInvite: boolean;
  isTemporary: boolean;
  max: number;
  slotsLeft: number;
  principal: { userId: string; name: string };
  coDelegates: { userId: string; name: string; email?: string }[];
  invitations: { id: string; url: string; email: string | null; expiresAt: string }[];
};

const day = (iso: string) => new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "long" });

export function DelegatesPanel({ clubId }: { clubId: string }) {
  const { user } = useAuth();
  const { data, loading, refetch } = useApi<Delegates | null>(async () => {
    const res = await fetch(`/api/clubs/${clubId}/delegates`);
    return res.ok ? ((await res.json()) as Delegates) : null;
  });
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [created, setCreated] = useState<{ url: string; emailed: boolean } | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  async function call(key: string, url: string, init: RequestInit, onOk?: (body: Record<string, unknown>) => void) {
    setBusy(key);
    setError("");
    try {
      const res = await fetch(url, init);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return setError(body.error ?? "No se pudo completar la acción");
      onOk?.(body);
      refetch();
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setBusy(null);
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setToast("Enlace copiado");
    } catch {
      setToast("No se pudo copiar: selecciona el enlace y cópialo a mano");
    }
  }

  const invite = () =>
    call(
      "invite",
      `/api/clubs/${clubId}/co-delegate-invitations`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(email.trim() ? { email: email.trim() } : {}) },
      (body) => {
        setCreated({ url: String(body.url), emailed: body.emailed === "sent" });
        setEmail("");
      }
    );

  const remove = (userId: string, leaving: boolean) =>
    call(`remove-${userId}`, `/api/clubs/${clubId}/delegates/${userId}`, { method: "DELETE" }, () => {
      setConfirming(null);
      setToast(leaving ? "Saliste del equipo" : "Co-delegado quitado");
      // Quien se sale deja de gestionar el equipo: la pantalla se recarga para reflejarlo.
      if (leaving) window.location.reload();
    });

  if (loading && !data) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }
  if (!data) {
    return <p className="px-4 py-6 font-body text-sm text-text-secondary">No se pudieron cargar los delegados.</p>;
  }

  const me = user?.id;

  return (
    <section className="px-4 pb-4" aria-label="Delegados del equipo">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      <p className="mt-4 font-body text-sm text-text-secondary">
        Los co-delegados manejan el equipo junto con su delegado: plantilla, jugadores y torneos. Hasta {data.max} por equipo.
      </p>

      <ul className="mt-4 divide-y divide-brand-200 rounded-xl border border-brand-200">
        <li className="flex items-center gap-3 px-4 py-3">
          <Initials name={data.principal.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-sm font-bold text-text-primary">
              {data.principal.name}
              {data.principal.userId === me && <span className="font-body font-normal text-text-secondary"> (tú)</span>}
            </p>
            <p className="font-body text-xs text-text-secondary">Delegado principal</p>
          </div>
        </li>

        {data.coDelegates.map((d) => {
          const isMe = d.userId === me;
          const asking = confirming === d.userId;
          return (
            <li key={d.userId} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <Initials name={d.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-sm font-bold text-text-primary">
                    {d.name}
                    {isMe && <span className="font-body font-normal text-text-secondary"> (tú)</span>}
                  </p>
                  <p className="truncate font-body text-xs text-text-secondary">Co-delegado{d.email ? ` · ${d.email}` : ""}</p>
                </div>
                {(data.canManage || isMe) && !asking && (
                  <button type="button" onClick={() => setConfirming(d.userId)} className={btnText}>
                    {isMe ? "Salir" : "Quitar"}
                  </button>
                )}
              </div>
              {asking && (
                <div className="mt-3 rounded-lg bg-btn-regular p-3">
                  <p className="font-body text-sm text-text-primary">
                    {isMe ? "¿Salir del equipo? Dejarás de manejarlo." : `¿Quitar a ${d.name}? Dejará de manejar el equipo.`}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => remove(d.userId, isMe)} disabled={busy !== null} className={btnSolid}>
                      {busy === `remove-${d.userId}` ? "Un momento..." : isMe ? "Sí, salir" : "Sí, quitar"}
                    </button>
                    <button type="button" onClick={() => setConfirming(null)} disabled={busy !== null} className={btnOutline}>
                      No
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}

        {data.coDelegates.length === 0 && (
          <li className="px-4 py-3 font-body text-sm text-text-secondary">Todavía no hay co-delegados.</li>
        )}
      </ul>

      {data.canManage ? (
        <>
          {data.invitations.length > 0 && (
            <div className="mt-6">
              <h2 className="font-heading text-sm font-bold text-text-primary">Invitaciones pendientes</h2>
              <ul className="mt-2 space-y-2">
                {data.invitations.map((i) => (
                  <li key={i.id} className="rounded-lg border border-brand-200 bg-btn-regular px-4 py-3">
                    <p className="font-body text-sm text-text-primary">{i.email ?? "Enlace para compartir"}</p>
                    <p className="font-body text-xs text-text-secondary">Vence el {day(i.expiresAt)}</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => copy(i.url)} className={btnOutline}>
                        Copiar enlace
                      </button>
                      <button
                        type="button"
                        onClick={() => call(`cancel-${i.id}`, `/api/clubs/${clubId}/co-delegate-invitations/${i.id}`, { method: "DELETE" }, () => setToast("Invitación cancelada"))}
                        disabled={busy !== null}
                        className={btnText}
                      >
                        {busy === `cancel-${i.id}` ? "Cancelando..." : "Cancelar"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6">
            <h2 className="font-heading text-sm font-bold text-text-primary">Invitar a un co-delegado</h2>
            {data.isTemporary ? (
              <p className="mt-2 font-body text-sm text-text-secondary">
                Este equipo todavía no tiene delegado. Cuando se oficialice podrás sumar co-delegados.
              </p>
            ) : !data.canInvite ? (
              <p className="mt-2 font-body text-sm text-text-secondary">
                El equipo ya tiene el máximo de {data.max} co-delegados, contando las invitaciones pendientes. Cancela una invitación o quita a un co-delegado para invitar a otra persona.
              </p>
            ) : (
              <form
                className="mt-2 flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (busy === null) void invite();
                }}
              >
                <label htmlFor="co-email" className="font-body text-sm text-text-secondary">
                  Correo (opcional: sin correo se crea un enlace para compartir)
                </label>
                <input
                  id="co-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  autoComplete="off"
                  maxLength={254}
                  className="min-h-12 w-full rounded-lg border border-transparent bg-btn-regular px-3 font-body text-base text-text-primary placeholder:text-text-primary/60 transition-colors hover:border-border-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none"
                />
                <button type="submit" disabled={busy !== null} className={btnSolid}>
                  {busy === "invite" ? "Creando..." : email.trim() ? "Enviar invitación" : "Crear enlace"}
                </button>
              </form>
            )}

            {created && (
              <div role="status" className="mt-3 rounded-lg bg-btn-regular p-3">
                <p className="font-body text-sm text-text-primary">
                  {created.emailed ? "Invitación enviada por correo. También puedes compartir este enlace:" : "Comparte este enlace (vale 7 días y se usa una sola vez):"}
                </p>
                <input readOnly value={created.url} onFocus={(e) => e.currentTarget.select()} aria-label="Enlace de la invitación" className="mt-2 w-full rounded border border-brand-200 bg-surface-primary px-2 py-2 font-body text-xs text-text-primary" />
                <button type="button" onClick={() => copy(created.url)} className={`${btnOutline} mt-2`}>
                  Copiar enlace
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="mt-6 font-body text-sm text-text-secondary">El delegado principal es quien suma o quita a los delegados.</p>
      )}

      <p role="alert" className="mt-3 min-h-5 font-body text-sm text-red-700">
        {error}
      </p>
    </section>
  );
}

function Initials({ name }: { name: string }) {
  const parts = name.split(/\s+/).filter(Boolean);
  const text = `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  return (
    <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-300 text-sm font-semibold text-text-secondary">
      {text}
    </div>
  );
}
