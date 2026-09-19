"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/jugador/torneos",
    label: "Torneos",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M6 3h12v5a6 6 0 01-12 0V3zM5 4H3a1 1 0 00-1 1v1.5a3 3 0 003 3h.5M19 4h2a1 1 0 011 1v1.5a3 3 0 01-3 3h-.5M8 14v3M16 14v3M7 17h10a1 1 0 011 1v2H6v-2a1 1 0 011-1z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={active ? "currentColor" : "none"}
        />
      </svg>
    ),
  },
  {
    href: "/jugador/equipos",
    label: "Equipos",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L3 7v2h18V7l-9-5zM5 11v6a2 2 0 002 2h10a2 2 0 002-2v-6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={active ? "currentColor" : "none"}
        />
        <path
          d="M12 9v6M8 12h8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/jugador/ajustes",
    label: "Ajustes",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill={active ? "currentColor" : "none"} />
        <path
          d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export function JugadorBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-brand-200 bg-surface-primary">
      <div className="mx-auto flex max-w-[430px] items-center justify-around py-2">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-heading font-semibold transition-colors ${
                active ? "text-text-primary" : "text-text-secondary"
              }`}
            >
              {item.icon(active)}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
