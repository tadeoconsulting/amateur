"use client";

import Link from "next/link";

const LINKS = [
  { href: "#torneos", label: "Torneos" },
  { href: "#plataforma", label: "La plataforma" },
  { href: "#como-funciona", label: "Cómo funciona" },
];

/**
 * Barra fija. El acceso (Iniciar sesión y Crear mi torneo) se ve siempre, también en el celular; ahí los enlaces a las
 * secciones pasan a una segunda fila en vez de esconderse tras un menú.
 */
export function Navbar({ onOpenAuth }: { onOpenAuth: (view: "login" | "register") => void }) {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-[var(--lc-line)] bg-[var(--lc-bg)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link href="/" className="lc-display text-2xl sm:text-3xl">
          Amateur<span className="text-[var(--lc-lime)]">.</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-[var(--lc-muted)] transition-colors hover:text-[var(--lc-white)]">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-1 sm:gap-3">
          <button onClick={() => onOpenAuth("login")} className="cursor-pointer px-3 py-2 text-sm font-medium hover:text-[var(--lc-lime)] sm:px-4">
            Iniciar sesión
          </button>
          <button onClick={() => onOpenAuth("register")} className="lc-btn lc-btn-lime !px-4 !py-2 text-sm sm:!px-5 sm:!py-2.5">
            <span className="sm:hidden">Crear torneo</span>
            <span className="hidden sm:inline">Crear mi torneo</span>
          </button>
        </div>
      </div>

      <div className="no-scrollbar flex gap-6 overflow-x-auto border-t border-[var(--lc-line)] px-4 md:hidden">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} className="shrink-0 py-2.5 text-sm font-medium text-[var(--lc-muted)] hover:text-[var(--lc-white)]">
            {l.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
