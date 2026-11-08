"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { otherProfiles, type ProfileRole } from "@/_lib/profiles";
import { navInitial } from "@/_lib/nav-identity";

/**
 * El nombre de quien tiene la sesión en la navegación principal (especificación 001), con su menú de cuenta: ir a su perfil,
 * pasar a otro de sus perfiles y cerrar sesión. `name` ya viene resuelto por pantalla (la organización del organizador, el
 * club del delegado, el nombre del jugador); `role` es el perfil de la pantalla en la que se está.
 */
export function AccountMenu({ name, roleLabel, role, settingsHref }: { name: string; roleLabel: string; role: ProfileRole; settingsHref: string }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const { mine } = otherProfiles(user?.roles ?? [], role);
  const itemClass =
    "flex min-h-11 w-full cursor-pointer items-center rounded-lg px-3 text-left font-heading text-sm font-semibold text-text-primary transition-colors hover:bg-btn-regular focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-text-primary";

  return (
    <div ref={root} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Cuenta de ${name}`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 max-w-full cursor-pointer items-center gap-2 rounded-lg px-2 font-heading text-sm font-semibold text-text-primary transition-colors hover:bg-btn-regular focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
      >
        <span aria-hidden className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-xs font-bold text-text-invert">
          {navInitial(name)}
        </span>
        <span className="max-w-[10rem] truncate md:max-w-[16rem]">{name}</span>
        <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div id={menuId} role="menu" aria-label="Cuenta" className="absolute right-0 top-full z-50 mt-1 w-64 rounded-xl border border-brand-200 bg-surface-primary p-1.5 shadow-lg">
          <div className="border-b border-brand-200 px-3 pb-2.5 pt-2">
            <p className="truncate font-heading text-sm font-bold text-text-primary">{name}</p>
            <p className="font-body text-xs text-text-secondary">{roleLabel}</p>
          </div>
          <div className="pt-1.5">
            <Link role="menuitem" href={settingsHref} onClick={() => setOpen(false)} className={itemClass}>
              Mi perfil y ajustes
            </Link>
            {mine.map((p) => (
              <Link key={p.role} role="menuitem" href={p.href} onClick={() => setOpen(false)} className={itemClass}>
                Cambiar a {p.label.toLocaleLowerCase("es")}
              </Link>
            ))}
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await logout();
              }}
              className={`${itemClass} disabled:opacity-60`}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
