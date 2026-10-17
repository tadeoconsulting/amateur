"use client";

import { useState } from "react";
import Link from "next/link";

const LINKS = [
  { href: "#torneos", label: "Torneos" },
  { href: "#plataforma", label: "La plataforma" },
  { href: "#como-funciona", label: "Cómo funciona" },
];

export function Navbar({ onOpenAuth }: { onOpenAuth: (view: "login" | "register") => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  function handleAuth(view: "login" | "register") {
    onOpenAuth(view);
    setMenuOpen(false);
  }

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-[var(--lc-line)] bg-[var(--lc-bg)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="lc-display text-3xl">
          Amateur<span className="text-[var(--lc-lime)]">.</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-[var(--lc-muted)] transition-colors hover:text-[var(--lc-white)]">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <button onClick={() => handleAuth("login")} className="cursor-pointer px-4 py-2 text-sm font-medium text-[var(--lc-white)] hover:text-[var(--lc-lime)]">
            Iniciar sesión
          </button>
          <button onClick={() => handleAuth("register")} className="lc-btn lc-btn-lime !px-5 !py-2.5 text-sm">
            Crear mi torneo
          </button>
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="cursor-pointer p-2 md:hidden"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {menuOpen ? (
              <>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </>
            ) : (
              <>
                <line x1="3" y1="7" x2="21" y2="7" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="17" x2="21" y2="17" />
              </>
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-[var(--lc-line)] bg-[var(--lc-bg)]/95 backdrop-blur-md md:hidden">
          <div className="flex flex-col gap-1 px-4 py-4">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="py-2.5 text-base font-medium text-[var(--lc-muted)]">
                {l.label}
              </a>
            ))}
            <button onClick={() => handleAuth("login")} className="cursor-pointer py-2.5 text-left text-base font-medium">
              Iniciar sesión
            </button>
            <button onClick={() => handleAuth("register")} className="lc-btn lc-btn-lime mt-2">
              Crear mi torneo
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
