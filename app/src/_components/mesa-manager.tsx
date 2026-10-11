"use client";

import { useState } from "react";
import { PageSpinner } from "@/_components/spinner";
import { btnOutline, btnSolid } from "@/_components/button-styles";
import { useApi } from "@/_lib/use-api";

// Las mesas de un torneo (especificación 011): quienes gestionan el partido en vivo los días de juego. La usan el
// organizador (en su torneo) y el admin (en el panel de Torneos). Cada cambio se guarda al momento.

type Mesa = { userId: string; name: string; email: string };
type Created = { name: string; email: string; temporaryPassword?: string };
type MesaAccount = { id: string; firstName: string; lastName: string; email?: string };

const EMAIL_OK = /^\S+@\S+\.\S+$/;
const input = "w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-base text-text-primary outline-none focus:border-brand-500";

export function MesaManager({ tournamentId, admin = false }: { tournamentId: string; admin?: boolean }) {
  const { data: mesas, loading, refetchSilently } = useApi<Mesa[]>(() => fetch(`/api/tournaments/${tournamentId}/mesa`).then((r) => (r.ok ? r.json() : [])));

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const typed = email.trim();
  const emailInvalid = typed !== "" && !EMAIL_OK.test(typed);
  const canAdd = firstName.trim() !== "" && EMAIL_OK.test(typed) && !busy;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!canAdd) return;
    setBusy(true);
    setError(null);
    setCreated(null);
    setCopied(false);
    const res = await fetch(`/api/tournaments/${tournamentId}/mesa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), email: typed }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "No se pudo agregar la mesa");
    setCreated({ name: body.name, email: body.email, temporaryPassword: body.temporaryPassword });
    setFirstName("");
    setLastName("");
    setEmail("");
    refetchSilently();
  }

  async function remove(userId: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/tournaments/${tournamentId}/mesa/${userId}`, { method: "DELETE" });
    setBusy(false);
    setRemoving(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return setError(body.error ?? "No se pudo quitar la mesa");
    }
    refetchSilently();
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError("No se pudo copiar solo: selecciona la contraseña y cópiala.");
    }
  }

  // Solo un admin: asignar una cuenta de mesa que ya existe (por ejemplo la que creó desde Usuarios).
  const { data: accounts } = useApi<MesaAccount[]>(() => (admin ? fetch("/api/users?role=MESA").then((r) => (r.ok ? r.json() : [])) : Promise.resolve([])));
  const [pick, setPick] = useState("");
  const options = (accounts ?? []).filter((a) => !(mesas ?? []).some((m) => m.userId === a.id));

  async function assignExisting() {
    if (!pick) return;
    setBusy(true);
    setError(null);
    setCreated(null);
    const res = await fetch(`/api/tournaments/${tournamentId}/mesa`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: pick }) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "No se pudo asignar la mesa");
    setPick("");
    refetchSilently();
  }

  return (
    <div className="flex flex-col gap-6">
    {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-2.5 font-body text-sm text-red-700">{error}</p>}

    {created && (
      <div role="status" className="flex flex-col gap-2 rounded-xl border border-border-primary bg-btn-regular p-4">
        <p className="font-heading text-sm font-bold text-text-primary">Listo: {created.name} ya es mesa de este torneo</p>
        {created.temporaryPassword ? (
          <>
            <p className="font-body text-sm text-text-secondary">
              Entrégale estos datos. <strong className="text-text-primary">La contraseña no se vuelve a mostrar</strong>; la cambia al entrar.
            </p>
            <p className="font-body text-sm text-text-primary">Correo: <strong>{created.email}</strong></p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 select-all rounded-lg border border-border-primary bg-surface-primary px-3 py-2 font-mono text-sm text-text-primary">{created.temporaryPassword}</code>
              <button type="button" onClick={() => void copy(`${created.email} / ${created.temporaryPassword}`)} className={`${btnOutline} !min-h-10 shrink-0 !px-3 !text-xs`}>
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </>
        ) : (
          <p className="font-body text-sm text-text-secondary">Esa cuenta ya existía: entra con su contraseña de siempre.</p>
        )}
      </div>
    )}

    <section aria-labelledby="mesas-h" className="flex flex-col gap-2">
      <h2 id="mesas-h" className="font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Mesas asignadas</h2>
      {loading || !mesas ? (
        <PageSpinner />
      ) : mesas.length === 0 ? (
        <p className="rounded-xl bg-btn-regular px-4 py-5 font-body text-sm text-text-secondary">Todavía no hay una mesa. Agrega una abajo.</p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-border-primary">
          {mesas.map((m, i) => (
            <li key={m.userId} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border-primary" : ""}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-sm font-bold text-text-primary">{m.name}</p>
                <p className="truncate font-body text-xs text-text-secondary">{m.email}</p>
              </div>
              {removing === m.userId ? (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => void remove(m.userId)} disabled={busy} className="min-h-10 cursor-pointer rounded-lg bg-red-700 px-3 font-heading text-xs font-bold text-white disabled:opacity-50">Sí, quitar</button>
                  <button type="button" onClick={() => setRemoving(null)} className="min-h-10 cursor-pointer px-2 font-heading text-xs font-semibold text-text-secondary underline">No</button>
                </div>
              ) : (
                <button type="button" onClick={() => setRemoving(m.userId)} className="min-h-10 cursor-pointer px-2 font-heading text-xs font-semibold text-text-secondary underline">Quitar</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>

    <form onSubmit={add} className="flex flex-col gap-3" noValidate>
      <h2 className="font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Agregar una mesa</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="mesa-nombre" className="font-body text-xs font-medium text-text-secondary">Nombre</label>
          <input id="mesa-nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="off" className={input} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="mesa-apellido" className="font-body text-xs font-medium text-text-secondary">Apellido</label>
          <input id="mesa-apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="off" className={input} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="mesa-correo" className="font-body text-xs font-medium text-text-secondary">Correo</label>
        <input id="mesa-correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" aria-invalid={emailInvalid || undefined} aria-describedby="mesa-correo-ayuda" className={`${input} ${emailInvalid ? "border-red-500" : ""}`} placeholder="mesa@correo.com" />
        <p id="mesa-correo-ayuda" className={`font-body text-xs ${emailInvalid ? "text-red-700" : "text-text-secondary"}`}>
          {emailInvalid ? "Escribe un correo válido (nombre@dominio.com)." : "Si no tiene cuenta, la creamos con una contraseña temporal que verás una sola vez. Una cuenta de mesa es solo mesa."}
        </p>
      </div>
      <button type="submit" disabled={!canAdd} className={`${btnSolid} self-start`}>
        {busy ? "Agregando..." : "Agregar mesa"}
      </button>
    </form>

      {admin && options.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">O asignar una cuenta de mesa que ya existe</h2>
          <div className="flex gap-2">
            <label htmlFor="mesa-existente" className="sr-only">Cuenta de mesa</label>
            <select id="mesa-existente" value={pick} onChange={(e) => setPick(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary">
              <option value="">Elegir una mesa...</option>
              {options.map((a) => (
                <option key={a.id} value={a.id}>{a.firstName} {a.lastName}{a.email ? ` (${a.email})` : ""}</option>
              ))}
            </select>
            <button type="button" onClick={() => void assignExisting()} disabled={busy || !pick} className={`${btnOutline} shrink-0 !min-h-10 !px-4 !text-xs`}>
              Asignar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
