"use client";

import { useState } from "react";

export interface InvitationSummary {
  id: string;
  token: string;
  email: string | null;
  /** pending | expired | review | locked */
  status: string;
  expiresAt: string;
  acceptedBy: { name: string; email: string } | null;
}

const EMAIL_OK = /^\S+@\S+\.\S+$/;
const longDate = (iso: string) => new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "long" });
const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
const linkOf = (token: string) => `${window.location.origin}/jugador/invitacion/perfil/${token}`;

/**
 * La pestaña "Invitar" de Asignar cuenta (especificación 009, entrega 3): para una persona que todavía no tiene
 * cuenta. El admin le manda un correo o crea solo un enlace (para WhatsApp); al abrirlo, la persona entra o
 * crea su cuenta y confirma su DNI, y su cuenta queda vinculada al perfil. Vale 7 días.
 */
export function InvitePlayerPanel({
  player,
  invitation,
  onChanged,
  onReview,
}: {
  player: { id: string; firstName: string; lastName: string };
  invitation: InvitationSummary | null;
  /** Se creó, renovó o canceló una invitación: la lista se vuelve a pedir. */
  onChanged: () => void;
  /** Quien aceptó ya tiene una ficha en el equipo: el admin pasa a unir los perfiles con esa cuenta. */
  onReview: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"view" | "change" | "cancel">("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
    onChanged();
  }

  /** Crea una invitación nueva (la anterior, si había, deja de funcionar). Con correo, lo manda. */
  const create = (to: string) =>
    call(
      () => fetch(`/api/players/${player.id}/invitation`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: to || null }) }),
      (d) =>
        d.emailed === "sent"
          ? `Enviamos la invitación a ${to}. Vence el ${longDate(d.expiresAt as string)}.`
          : d.emailed === "skipped"
            ? "El correo no está configurado en este entorno: copia el enlace y compártelo."
            : d.emailed === "failed"
              ? "No se pudo enviar el correo. Copia el enlace y compártelo a mano."
              : `Enlace creado. Cópialo y compártelo (por ejemplo por WhatsApp). Vence el ${longDate(d.expiresAt as string)}.`
    );

  const resend = () =>
    call(
      () => fetch(`/api/players/${player.id}/invitation`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "resend" }) }),
      (d) => (d.emailed === "sent" ? `Volvimos a enviar el correo. Ahora vence el ${longDate(d.expiresAt as string)}.` : "No se pudo enviar el correo. Comparte el enlace a mano.")
    );

  const cancel = () => call(() => fetch(`/api/players/${player.id}/invitation`, { method: "DELETE" }), () => "Invitación cancelada: su enlace ya no funciona.");

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

  const name = `${player.firstName} ${player.lastName}`;
  const status = invitation?.status;

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-sm text-text-secondary">
        Para quien todavía no tiene cuenta. Al abrir el enlace, <strong className="text-text-primary">{name}</strong> entra o crea su cuenta y confirma su DNI; entonces su cuenta queda vinculada a este perfil, con todo lo que ya tiene. Vale 7 días.
      </p>

      {error && <div role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 font-body text-sm text-red-700">{error}</div>}
      <div aria-live="polite">{notice && <div className="rounded-lg bg-brand-50 px-4 py-2.5 font-body text-sm text-text-primary">{notice}</div>}</div>

      {invitation && status !== "locked" && status !== "review" && (
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
              <input readOnly value={linkOf(invitation.token)} onFocus={(e) => e.currentTarget.select()} aria-label="Enlace de la invitación" className={`${input} min-w-0 flex-1 text-xs`} />
              <button onClick={() => void copy(linkOf(invitation.token))} className={`${ghost} shrink-0`}>Copiar enlace</button>
            </div>
          )}

          {mode === "view" && (
            <div className="flex flex-wrap gap-2">
              {invitation.email && <button onClick={() => void resend()} disabled={busy} className={ghost}>{status === "expired" ? "Renovar y reenviar" : "Reenviar correo"}</button>}
              <button onClick={() => { setMode("change"); setEmail(invitation.email ?? ""); setError(null); setNotice(null); }} disabled={busy} className={ghost}>{invitation.email ? "Cambiar correo" : "Agregar un correo"}</button>
              <button onClick={() => { setMode("cancel"); setError(null); setNotice(null); }} disabled={busy} className={`${ghost} border-red-200 text-red-700 hover:bg-red-50`}>Cancelar invitación</button>
            </div>
          )}

          {mode === "change" && (
            <div className="flex flex-col gap-2">
              <label htmlFor="ip-cambiar" className="font-body text-xs font-medium text-text-secondary">Nuevo correo</label>
              <input id="ip-cambiar" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" aria-invalid={emailInvalid || undefined} aria-describedby="ip-cambiar-ayuda" className={`${input} ${emailInvalid ? "border-red-500" : ""}`} placeholder="jugador@correo.com" />
              <p id="ip-cambiar-ayuda" className={`font-body text-xs ${emailInvalid ? "text-red-700" : "text-text-secondary"}`}>
                {emailInvalid ? "Escribe un correo válido (nombre@dominio.com)." : "Se crea un enlace nuevo y el anterior deja de funcionar."}
              </p>
              <div className="flex gap-2">
                <button onClick={() => void create(typed)} disabled={busy || !EMAIL_OK.test(typed)} className="min-h-10 cursor-pointer rounded-lg bg-surface-secondary px-4 py-2 font-heading text-xs font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {busy ? "Enviando..." : "Enviar a este correo"}
                </button>
                <button onClick={() => { setMode("view"); setEmail(""); }} disabled={busy} className={ghost}>Volver</button>
              </div>
            </div>
          )}

          {mode === "cancel" && (
            <div className="flex flex-col gap-2 rounded-lg bg-red-50 p-3">
              <p className="font-body text-sm text-red-800">¿Cancelar la invitación? El enlace deja de funcionar. {name} seguirá como provisional.</p>
              <div className="flex gap-2">
                <button onClick={() => void cancel()} disabled={busy} className="min-h-10 cursor-pointer rounded-lg bg-red-700 px-4 py-2 font-heading text-xs font-bold text-white disabled:opacity-50">{busy ? "Cancelando..." : "Sí, cancelar"}</button>
                <button onClick={() => setMode("view")} disabled={busy} className={ghost}>No</button>
              </div>
            </div>
          )}
        </div>
      )}

      {invitation && status === "review" && invitation.acceptedBy && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="font-heading text-sm font-bold text-amber-900">Falta unir los perfiles</p>
          <p className="font-body text-sm text-amber-900">
            <strong>{invitation.acceptedBy.name}</strong> ({invitation.acceptedBy.email}) aceptó la invitación y confirmó el DNI, pero su cuenta ya tiene una ficha en este equipo. Unir los perfiles lo decide un admin.
          </p>
          <div className="flex gap-2">
            <button onClick={() => onReview(invitation.acceptedBy!.email)} className="min-h-10 cursor-pointer rounded-lg bg-surface-secondary px-4 py-2 font-heading text-xs font-bold text-text-invert transition-colors hover:bg-brand-700">Revisar y unir</button>
          </div>
        </div>
      )}

      {invitation && status === "locked" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-heading text-sm font-bold text-red-800">Invitación bloqueada</p>
          <p className="font-body text-sm text-red-800">Se escribió un DNI equivocado demasiadas veces. Crea una nueva para volver a intentar.</p>
        </div>
      )}

      {/* Crear: sin invitación vigente, o para reemplazar una vencida o bloqueada. */}
      {(!invitation || status === "expired" || status === "locked") && mode !== "change" && (
        <div className="flex flex-col gap-2">
          <label htmlFor="ip-correo" className="font-body text-xs font-medium text-text-secondary">Correo del jugador (opcional)</label>
          <input id="ip-correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" aria-invalid={emailInvalid || undefined} aria-describedby="ip-correo-ayuda" className={`${input} ${emailInvalid ? "border-red-500" : ""}`} placeholder="jugador@correo.com" />
          <p id="ip-correo-ayuda" className={`font-body text-xs ${emailInvalid ? "text-red-700" : "text-text-secondary"}`}>
            {emailInvalid ? "Escribe un correo válido (nombre@dominio.com)." : "Con correo, lo enviamos y la invitación es para esa cuenta. Sin correo, solo se crea el enlace para compartirlo por WhatsApp."}
          </p>
          <button
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
