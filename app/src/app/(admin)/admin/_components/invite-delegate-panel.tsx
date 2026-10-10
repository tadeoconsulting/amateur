"use client";

import { useState } from "react";
import { useApi } from "@/_lib/use-api";

interface DelegateInvitation {
  id: string;
  token: string;
  url: string;
  email: string | null;
  /** pending | expired */
  status: string;
  expiresAt: string;
}

const EMAIL_OK = /^\S+@\S+\.\S+$/;
const longDate = (iso: string) => new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "long" });
const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

/**
 * "Invitar al delegado" de un equipo temporal (especificación 009, entrega 4): el admin manda un correo o crea
 * solo un enlace (para WhatsApp); quien lo abre entra o crea su cuenta y, al aceptar, el equipo pasa a ser suyo
 * —lo mismo que "Oficializar"—. Vale 7 días y se usa una vez.
 */
export function InviteDelegatePanel({ club, onChanged }: { club: { id: string; name: string }; onChanged: () => void }) {
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"view" | "change" | "cancel">("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const endpoint = `/api/clubs/${club.id}/delegate-invitation`;

  const { data: invitation, loading, refetchSilently: load } = useApi<DelegateInvitation | null>(() => fetch(endpoint).then((r) => (r.ok ? r.json() : null)));

  const typed = email.trim();
  const emailInvalid = typed !== "" && !EMAIL_OK.test(typed);
  const input = "w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500";
  const ghost = "min-h-10 cursor-pointer rounded-lg border border-border-primary px-3 py-2 font-heading text-xs font-semibold text-text-primary transition-colors hover:bg-btn-regular disabled:cursor-not-allowed disabled:opacity-50";

  async function call(request: () => Promise<Response>, ok: (data: Record<string, unknown>) => string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await request();
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "No se pudo completar la acción");
    setNotice(ok(data));
    setMode("view");
    setEmail("");
    load();
    onChanged();
  }

  const create = (to: string) =>
    call(
      () => fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: to || null }) }),
      (d) =>
        d.emailed === "sent"
          ? `Enviamos la invitación a ${to}. Vence el ${longDate(d.expiresAt as string)}.`
          : d.emailed === "skipped"
            ? "El correo no está configurado en este entorno: copia el enlace y compártelo."
            : d.emailed === "failed"
              ? "No se pudo enviar el correo. Copia el enlace y compártelo a mano."
              : `Enlace creado. Cópialo y compártelo (por ejemplo por WhatsApp) solo con el delegado. Vence el ${longDate(d.expiresAt as string)}.`
    );

  const resend = () =>
    call(
      () => fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "resend" }) }),
      (d) => (d.emailed === "sent" ? `Volvimos a enviar el correo. Ahora vence el ${longDate(d.expiresAt as string)}.` : "No se pudo enviar el correo. Comparte el enlace a mano.")
    );

  const cancel = () => call(() => fetch(endpoint, { method: "DELETE" }), () => "Invitación cancelada: su enlace ya no funciona.");

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setError(null);
      setNotice("Enlace copiado.");
    } catch {
      setNotice(null);
      setError("No se pudo copiar solo: selecciona el enlace y cópialo.");
    }
  }

  if (loading) return <p className="font-body text-sm text-text-secondary">Cargando...</p>;
  const status = invitation?.status;

  return (
    <div className="flex flex-col gap-3">
      <p className="font-body text-sm text-text-secondary">
        Para un delegado que todavía no tiene cuenta. Al abrir el enlace entra o crea su cuenta y, al aceptar, <strong className="text-text-primary">{club.name}</strong> pasa a ser suyo: lo mismo que oficializarlo. Vale 7 días y se usa una sola vez.
      </p>

      {error && <div role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 font-body text-sm text-red-700">{error}</div>}
      <div aria-live="polite">{notice && <div className="rounded-lg bg-brand-50 px-4 py-2.5 font-body text-sm text-text-primary">{notice}</div>}</div>

      {invitation && (
        <div className="flex flex-col gap-3 rounded-xl border border-border-primary p-4">
          <div>
            <p className="font-heading text-sm font-bold text-text-primary">
              {status === "expired" ? `Venció el ${longDate(invitation.expiresAt)}` : `Invitación vigente · vence el ${longDate(invitation.expiresAt)}`}
              {status === "pending" && <span className="ml-2 font-body text-xs font-normal text-text-secondary">({daysLeft(invitation.expiresAt)} {daysLeft(invitation.expiresAt) === 1 ? "día" : "días"})</span>}
            </p>
            <p className="font-body text-sm text-text-secondary">
              {invitation.email ? <>Enviada a <strong className="text-text-primary">{invitation.email}</strong></> : "Enlace sin correo, para compartir por WhatsApp"}
            </p>
          </div>

          {status === "pending" && (
            <div className="flex gap-2">
              <input readOnly value={invitation.url} onFocus={(e) => e.currentTarget.select()} aria-label="Enlace de la invitación" className={`${input} min-w-0 flex-1 text-xs`} />
              <button type="button" onClick={() => void copy(invitation.url)} className={`${ghost} shrink-0`}>Copiar enlace</button>
            </div>
          )}

          {mode === "view" && (
            <div className="flex flex-wrap gap-2">
              {invitation.email && <button type="button" onClick={() => void resend()} disabled={busy} className={ghost}>{status === "expired" ? "Renovar y reenviar" : "Reenviar correo"}</button>}
              <button type="button" onClick={() => { setMode("change"); setEmail(invitation.email ?? ""); setError(null); setNotice(null); }} disabled={busy} className={ghost}>{invitation.email ? "Cambiar correo" : "Agregar un correo"}</button>
              <button type="button" onClick={() => { setMode("cancel"); setError(null); setNotice(null); }} disabled={busy} className={`${ghost} border-red-200 text-red-700 hover:bg-red-50`}>Cancelar invitación</button>
            </div>
          )}

          {mode === "change" && (
            <div className="flex flex-col gap-2">
              <label htmlFor="id-cambiar" className="font-body text-xs font-medium text-text-secondary">Nuevo correo</label>
              <input id="id-cambiar" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" aria-invalid={emailInvalid || undefined} aria-describedby="id-cambiar-ayuda" className={`${input} ${emailInvalid ? "border-red-500" : ""}`} placeholder="delegado@correo.com" />
              <p id="id-cambiar-ayuda" className={`font-body text-xs ${emailInvalid ? "text-red-700" : "text-text-secondary"}`}>
                {emailInvalid ? "Escribe un correo válido (nombre@dominio.com)." : "Se crea un enlace nuevo y el anterior deja de funcionar."}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => void create(typed)} disabled={busy || !EMAIL_OK.test(typed)} className="min-h-10 cursor-pointer rounded-lg bg-surface-secondary px-4 py-2 font-heading text-xs font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {busy ? "Enviando..." : "Enviar a este correo"}
                </button>
                <button type="button" onClick={() => { setMode("view"); setEmail(""); }} disabled={busy} className={ghost}>Volver</button>
              </div>
            </div>
          )}

          {mode === "cancel" && (
            <div className="flex flex-col gap-2 rounded-lg bg-red-50 p-3">
              <p className="font-body text-sm text-red-800">¿Cancelar la invitación? El enlace deja de funcionar y el equipo sigue temporal.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => void cancel()} disabled={busy} className="min-h-10 cursor-pointer rounded-lg bg-red-700 px-4 py-2 font-heading text-xs font-bold text-white disabled:opacity-50">{busy ? "Cancelando..." : "Sí, cancelar"}</button>
                <button type="button" onClick={() => setMode("view")} disabled={busy} className={ghost}>No</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Crear: sin invitación, o para reemplazar una vencida. */}
      {(!invitation || status === "expired") && mode !== "change" && (
        <div className="flex flex-col gap-2">
          <label htmlFor="id-correo" className="font-body text-xs font-medium text-text-secondary">Correo del delegado (opcional)</label>
          <input id="id-correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" aria-invalid={emailInvalid || undefined} aria-describedby="id-correo-ayuda" className={`${input} ${emailInvalid ? "border-red-500" : ""}`} placeholder="delegado@correo.com" />
          <p id="id-correo-ayuda" className={`font-body text-xs ${emailInvalid ? "text-red-700" : "text-text-secondary"}`}>
            {emailInvalid ? "Escribe un correo válido (nombre@dominio.com)." : "Con correo, lo enviamos y la invitación es para esa cuenta. Sin correo, solo se crea el enlace para compartirlo por WhatsApp: quien lo abra primero será el delegado, así que envíaselo solo a él."}
          </p>
          <button
            type="button"
            onClick={() => void create(typed)}
            disabled={busy || emailInvalid}
            className="min-h-11 cursor-pointer self-start rounded-lg bg-surface-secondary px-5 py-2.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Creando..." : typed ? "Enviar invitación por correo" : "Crear enlace"}
          </button>
        </div>
      )}
    </div>
  );
}
