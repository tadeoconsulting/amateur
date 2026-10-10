"use client";

import { useEffect, useState } from "react";
import { InvitePlayerPanel, type InvitationSummary } from "./invite-player-panel";

interface AccountResult {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  dni?: string | null;
  roles: string[];
  playerProfiles: { id: string; club: { id: string; name: string } | null }[];
}

interface LinkSummary {
  mode: "link" | "merge";
  fromFree: boolean;
  club: string | null;
  account: { name: string; email: string };
  moves: { events: number; lineups: number; tournaments: number; goals: number };
  warnings: string[];
  grantPlayerRole: boolean;
}

/**
 * Asigna una cuenta a un jugador provisional (especificación 009, entrega 2). El admin busca la cuenta (por
 * correo, nombre o DNI), ve un resumen de lo que va a pasar —vincular el perfil o unirlo con una ficha que la
 * cuenta ya tiene— con los avisos, y recién entonces confirma. Nada se escribe hasta confirmar.
 */
export function LinkAccountModal({
  player,
  invitation,
  initialTab = "account",
  onClose,
  onDone,
  onInvitationChanged,
}: {
  player: { id: string; firstName: string; lastName: string; dni: string | null; clubName: string | null };
  /** La invitación vigente de este jugador (la lista se vuelve a pedir cuando cambia). */
  invitation: InvitationSummary | null;
  initialTab?: "account" | "invite";
  onClose: () => void;
  onDone: () => void;
  onInvitationChanged: () => void;
}) {
  const [tab, setTab] = useState<"account" | "invite">(initialTab);
  // Se abre buscando por el DNI del provisional: si la persona ya tiene cuenta con ese DNI, sale de una vez.
  const [query, setQuery] = useState(player.dni ?? "");
  const [results, setResults] = useState<AccountResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [chosen, setChosen] = useState<AccountResult | null>(null);
  const [summary, setSummary] = useState<LinkSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/users?search=${encodeURIComponent(text)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data: AccountResult[]) => { if (!cancelled) setResults(data); })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  const choose = async (account: AccountResult) => {
    setChosen(account);
    setSummary(null);
    setError(null);
    setLoadingSummary(true);
    const res = await fetch(`/api/players/${player.id}/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: account.id, dryRun: true }),
    });
    setLoadingSummary(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "No se pudo preparar la asignación");
      setChosen(null);
      return;
    }
    setSummary(data);
  };

  const confirm = async () => {
    if (!chosen) return;
    setWorking(true);
    setError(null);
    const res = await fetch(`/api/players/${player.id}/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: chosen.id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo asignar la cuenta");
      setWorking(false);
      return;
    }
    onDone();
  };

  const name = `${player.firstName} ${player.lastName}`;
  const visible = (results ?? []).slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div role="dialog" aria-modal="true" aria-label="Asignar cuenta" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface-primary p-6 shadow-xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-text-primary">Asignar cuenta</h2>
          <button onClick={onClose} aria-label="Cerrar" className="cursor-pointer p-1 text-text-secondary hover:text-text-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className="mb-4 font-body text-sm text-text-secondary">
          <strong className="text-text-primary">{name}</strong>
          {player.clubName ? ` · ${player.clubName}` : ""} · DNI {player.dni ?? "—"}. Sus goles, tarjetas y partidos pasan a la cuenta que elijas: no se pierde nada.
        </p>

        <div role="tablist" aria-label="Cómo asignar la cuenta" className="mb-4 flex gap-1 rounded-lg bg-brand-50 p-1">
          {([["account", "Cuenta existente"], ["invite", invitation && invitation.status !== "expired" ? "Invitar · activa" : "Invitar por correo o enlace"]] as const).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`min-h-10 flex-1 cursor-pointer rounded-md px-3 py-2 font-heading text-xs font-semibold transition-colors ${tab === key ? "bg-surface-primary text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "invite" ? (
          <>
            <InvitePlayerPanel
              player={{ id: player.id, firstName: player.firstName, lastName: player.lastName }}
              invitation={invitation}
              onChanged={onInvitationChanged}
              onReview={(email) => { setQuery(email); setChosen(null); setSummary(null); setError(null); setTab("account"); }}
            />
            <div className="mt-6 flex justify-end">
              <button onClick={onClose} className="cursor-pointer rounded-lg border border-border-primary px-5 py-2.5 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular">Cerrar</button>
            </div>
          </>
        ) : (
          <>
        {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 font-body text-sm text-red-700">{error}</div>}

        {!chosen && (
          <>
            <label htmlFor="la-buscar" className="mb-1 block font-body text-xs font-medium text-text-secondary">Buscar la cuenta (correo, nombre o DNI)</label>
            <input
              id="la-buscar"
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (e.target.value.trim().length < 3) setResults(null); }}
              autoComplete="off"
              className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2.5 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              placeholder="jugador@correo.com"
            />
            <div className="mt-3 flex flex-col gap-2" aria-live="polite">
              {searching && <p className="font-body text-sm text-text-secondary">Buscando...</p>}
              {!searching && results !== null && visible.length === 0 && (
                <p className="font-body text-sm text-text-secondary">
                  No hay ninguna cuenta con eso. Si la persona todavía no se registró, pídele que cree su cuenta (o créala desde Usuarios) y vuelve a buscar.
                </p>
              )}
              {visible.map((a) => {
                const isAdminAccount = a.roles.includes("ADMIN");
                return (
                  <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border-primary px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-heading text-sm font-semibold text-text-primary">{a.firstName} {a.lastName}</p>
                      <p className="truncate font-body text-xs text-text-secondary">{a.email}{a.dni ? ` · DNI ${a.dni}` : ""}</p>
                      <p className="font-body text-xs text-text-secondary">
                        {a.playerProfiles.length > 0
                          ? `Ya juega en: ${a.playerProfiles.map((p) => p.club?.name ?? "sin equipo").join(", ")}`
                          : "Todavía no tiene ficha de jugador"}
                      </p>
                    </div>
                    <button
                      onClick={() => void choose(a)}
                      disabled={isAdminAccount}
                      title={isAdminAccount ? "Una cuenta de administrador no puede ser jugadora" : undefined}
                      className="shrink-0 cursor-pointer rounded-lg border border-border-primary px-3 py-1.5 font-heading text-xs font-semibold text-text-primary transition-colors hover:bg-btn-regular disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Elegir
                    </button>
                  </div>
                );
              })}
              {(results?.length ?? 0) > visible.length && (
                <p className="font-body text-xs text-text-secondary">Hay más resultados: afina la búsqueda.</p>
              )}
            </div>
          </>
        )}

        {chosen && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-border-primary px-3 py-2.5">
              <p className="font-body text-xs text-text-secondary">Cuenta elegida</p>
              <p className="font-heading text-sm font-semibold text-text-primary">{chosen.firstName} {chosen.lastName}</p>
              <p className="font-body text-xs text-text-secondary">{chosen.email}</p>
            </div>

            {loadingSummary && <p className="font-body text-sm text-text-secondary">Preparando el resumen...</p>}

            {summary && (
              <>
                <div className="rounded-lg bg-brand-50 px-4 py-3 font-body text-sm text-text-primary">
                  {summary.mode === "link" ? (
                    <p>
                      El perfil de <strong>{name}</strong> pasa a ser la ficha de <strong>{summary.account.name}</strong>
                      {summary.club ? ` en ${summary.club}` : ""}. Es el mismo perfil: todo lo suyo se conserva.
                    </p>
                  ) : (
                    <p>
                      <strong>{summary.account.name}</strong> {summary.fromFree ? "ya tiene una ficha sin equipo" : `ya tiene su ficha${summary.club ? ` en ${summary.club}` : ""}`}: se <strong>unen los perfiles</strong>
                      {summary.fromFree && summary.club ? ` y esa ficha pasa a ser la de ${summary.club}` : ""}. Pasan a su ficha{" "}
                      <strong>{summary.moves.events}</strong> {summary.moves.events === 1 ? "jugada" : "jugadas"}
                      {summary.moves.tournaments > 0 && <> y las estadísticas de <strong>{summary.moves.tournaments}</strong> {summary.moves.tournaments === 1 ? "torneo" : "torneos"} ({summary.moves.goals} {summary.moves.goals === 1 ? "gol" : "goles"})</>}
                      {summary.moves.lineups > 0 && <>, y <strong>{summary.moves.lineups}</strong> {summary.moves.lineups === 1 ? "alineación" : "alineaciones"}</>}. El perfil provisional desaparece.
                    </p>
                  )}
                  {summary.grantPlayerRole && <p className="mt-2">A la cuenta se le agrega el perfil de jugador.</p>}
                </div>
                {summary.warnings.length > 0 && (
                  <ul className="flex flex-col gap-1.5 rounded-lg bg-amber-50 px-4 py-3 font-body text-sm text-amber-800">
                    {summary.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                )}
                <p className="font-body text-xs text-text-secondary">Esto no se puede deshacer.</p>
              </>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          {chosen ? (
            <button onClick={() => { setChosen(null); setSummary(null); setError(null); }} disabled={working} className="cursor-pointer rounded-lg border border-border-primary px-5 py-2.5 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular disabled:opacity-50">
              Elegir otra cuenta
            </button>
          ) : (
            <button onClick={onClose} className="cursor-pointer rounded-lg border border-border-primary px-5 py-2.5 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular">Cancelar</button>
          )}
          {chosen && (
            <button onClick={() => void confirm()} disabled={!summary || working} className="cursor-pointer rounded-lg bg-surface-secondary px-5 py-2.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:opacity-50">
              {working ? "Guardando..." : summary?.mode === "merge" ? "Unir perfiles" : "Vincular cuenta"}
            </button>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
