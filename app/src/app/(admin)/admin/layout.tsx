"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    href: "/admin/usuarios",
    label: "Usuarios",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 17.5c0-3.5 3.1-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/admin/clubes",
    label: "Clubes",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M5 3h10v4.5a5 5 0 01-10 0V3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 12.5v2M13 12.5v2M6.5 14.5h7a1 1 0 011 1V17h-9v-1.5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/admin/jugadores",
    label: "Jugadores",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M1 16.5c0-3 2.5-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="14.5" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M19 16c0-2.5-2-4-4.5-4-1 0-1.8.3-2.5.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/admin/torneos",
    label: "Torneos",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M5 3h10v4.5a5 5 0 01-10 0V3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 5H3a1 1 0 00-1 1v1a3 3 0 003 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 5h2a1 1 0 011 1v1a3 3 0 01-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 12.5v2M13 12.5v2M6.5 14.5h7a1 1 0 011 1V17h-9v-1.5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/admin/sponsors",
    label: "Sponsors",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2l2.2 4.5 5 .7-3.6 3.5.85 5-4.45-2.3-4.45 2.3.85-5-3.6-3.5 5-.7L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  // La pantalla de ingreso va sin el panel (ni la verificación de admin: todavía no hay sesión).
  if (pathname === "/admin/login") return <>{children}</>;

  // La API ya rechaza a quien no es admin; esto evita mostrar un panel roto.
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-brand-50 font-body text-sm text-text-secondary">
        Cargando…
      </div>
    );
  }
  if (!user?.roles.includes("ADMIN")) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-brand-50 px-6 text-center">
        <p className="font-heading text-lg font-bold text-text-primary">Sin acceso</p>
        <p className="font-body text-sm text-text-secondary">Esta sección es solo para administradores.</p>
        <Link href="/admin/login" className="font-heading text-sm font-semibold text-text-primary underline">
          Ingresar como administrador
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-brand-50">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-dvh w-60 shrink-0 flex-col border-r border-border-primary bg-surface-primary">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-secondary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 2h8v4a4 4 0 01-8 0V2z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 10v2M10 10v2M5 12h6a1 1 0 011 1v1H4v-1a1 1 0 011-1z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="font-heading text-sm font-bold text-text-primary">Amateur</p>
            <p className="font-body text-[11px] text-text-secondary">Panel de admin</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-heading text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-surface-secondary text-text-invert"
                    : "text-text-secondary hover:bg-brand-100 hover:text-text-primary"
                }`}
              >
                <span className={isActive ? "text-text-invert" : "text-text-secondary"}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border-primary px-5 py-4">
          <button
            type="button"
            onClick={() => logout("/admin/login")}
            className="flex cursor-pointer items-center gap-2 font-body text-xs text-text-secondary transition-colors hover:text-text-primary"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 2.5H3.5a1 1 0 00-1 1v9a1 1 0 001 1H6M10.5 5.5L13 8l-2.5 2.5M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
