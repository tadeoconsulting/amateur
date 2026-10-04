"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePendingInvitations } from "@/_lib/use-pending-invitations";

function NavBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute -right-1 top-0 inline-flex min-w-4 items-center justify-center rounded-full bg-verification px-1 text-[9px] font-bold leading-4 text-surface-secondary"
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

/**
 * Los glifos son los exportados del diseño (public/icons/jugador-nav), de un solo color: se
 * usan como máscara para pintarlos con el color del estado (activo / inactivo).
 */
function NavIcon({ src }: { src: string }) {
  return (
    <span
      aria-hidden="true"
      className="block size-9 bg-current"
      style={{
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

// `match` son las rutas donde la pestaña se ve activa. "Perfil" lleva al hub de ajustes, que
// también es de donde se llega a Mis equipos, por eso cubre /jugador/equipos.
const navItems = [
  { href: "/jugador/torneos", label: "Actividad", icon: "/icons/jugador-nav/actividad.svg", match: ["/jugador/torneos"], exact: true },
  { href: "/jugador/mis-torneos", label: "Torneos", icon: "/icons/jugador-nav/torneos.svg", match: ["/jugador/mis-torneos"] },
  { href: "/jugador/ajustes", label: "Perfil", icon: "/icons/jugador-nav/perfil.svg", match: ["/jugador/ajustes", "/jugador/equipos"] },
];

export function JugadorBottomNav() {
  const pathname = usePathname();
  // Una invitación pendiente vive bajo Perfil (Ajustes › Mis equipos).
  const invitesPending = usePendingInvitations();
  const badgeByHref: Record<string, number> = { "/jugador/ajustes": invitesPending };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface-secondary">
      <div className="mx-auto flex max-w-[430px] items-center justify-between px-4 pb-4 pt-2">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : item.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex w-[60px] flex-col items-center gap-1 font-heading text-xs tracking-[0.24px] transition-colors ${
                active ? "text-[#fefefe]" : "text-[#6d6d6d]"
              }`}
            >
              <span className="relative">
                <NavIcon src={item.icon} />
                <NavBadge count={badgeByHref[item.href] ?? 0} />
              </span>
              <span className="leading-[18px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
