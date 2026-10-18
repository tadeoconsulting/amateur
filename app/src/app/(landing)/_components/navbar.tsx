"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

const ICON = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

const LINKS: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: "#torneos",
    label: "Torneos",
    icon: (
      <svg {...ICON}>
        <path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4" />
      </svg>
    ),
  },
  {
    href: "#plataforma",
    label: "Plataforma",
    icon: (
      <svg {...ICON}>
        <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
        <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
        <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "#como-funciona",
    label: "Cómo funciona",
    icon: (
      <svg {...ICON}>
        <circle cx="12" cy="12" r="9" />
        <path d="M10 8.5l5 3.5-5 3.5v-7z" />
      </svg>
    ),
  },
];

const HOME_ICON = (
  <svg {...ICON}>
    <path d="M3 11l9-7 9 7M5 10v10h14V10" />
  </svg>
);

/**
 * Barra fija de arriba con el acceso (Iniciar sesión y Crear mi torneo) siempre a la vista. En el celular, los
 * enlaces a las secciones van en una barra inferior con íconos, a la altura del pulgar; en escritorio, en la de arriba.
 */
export function Navbar({ onOpenAuth }: { onOpenAuth: (view: "login" | "register") => void }) {
  // La sección que se está viendo, para marcarla en la barra de abajo.
  const [current, setCurrent] = useState<string>("");

  useEffect(() => {
    // Se buscan las secciones en cada scroll, no una sola vez: la de torneos aparece recién cuando cargan los datos.
    const update = () => {
      const line = window.innerHeight * 0.4;
      let found = "";
      for (const id of ["torneos", "plataforma", "como-funciona"]) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) found = `#${id}`;
      }
      setCurrent(found);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <>
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
      </nav>

      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--lc-line)] bg-[var(--lc-bg)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <ul className="grid grid-cols-4">
          {[{ href: "#", label: "Inicio", icon: HOME_ICON }, ...LINKS].map((l) => {
            const active = (l.href === "#" && current === "") || l.href === current;
            return (
              <li key={l.label}>
                <a
                  href={l.href}
                  aria-current={active ? "true" : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                    active ? "text-[var(--lc-lime)]" : "text-[var(--lc-muted)]"
                  }`}
                >
                  {l.icon}
                  {l.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
