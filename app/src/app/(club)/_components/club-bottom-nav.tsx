"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApi } from "@/_lib/use-api";
import { getMyRequests } from "@/_lib/api";
import { useRefetchOnChange } from "@/_lib/notifications-changed";

interface StaffInvitationRow {
  token: string;
}

export const clubNavItems = [
  {
    href: "/club/torneos",
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
    href: "/club/jugadores",
    label: "Jugadores",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
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
    href: "/club/equipo",
    label: "Equipo",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
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
    href: "/club/ajustes",
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

function NavBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute -right-2 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-verification px-1 text-[9px] font-bold leading-4 text-text-primary"
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

/** ¿La pestaña se ve activa en esta ruta? Lo usan la barra inferior (celular) y la superior (escritorio). */
export function isClubNavActive(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/** Los pendientes de cada pestaña, por ruta: invitaciones de torneos y de staff. */
export function useClubNavBadges(): Record<string, number> {
  // Invitaciones de un organizador a un torneo (pestaña "Solicitudes" de /club/torneos).
  const { data: requests, refetch: refetchRequests } = useApi(() => getMyRequests());
  useRefetchOnChange(refetchRequests);
  const invitesPending = requests?.filter((r) => r.kind === "invite").length ?? 0;
  // Invitaciones de staff (DT, delegado, asistente) — se aceptan desde "Equipo".
  const { data: staffInvitations, refetch: refetchStaffInvitations } = useApi<StaffInvitationRow[]>(() =>
    fetch("/api/staff-invitations/mine").then((r) => (r.ok ? r.json() : []))
  );
  useRefetchOnChange(refetchStaffInvitations);
  const staffInvitesPending = staffInvitations?.length ?? 0;

  return {
    "/club/torneos": invitesPending,
    "/club/equipo": staffInvitesPending,
  };
}

export function ClubBottomNav({ badges }: { badges: Record<string, number> }) {
  const pathname = usePathname();
  const badgeByHref = badges;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-brand-200 bg-surface-primary md:hidden">
      <div className="mx-auto flex max-w-[430px] items-center justify-around py-2">
        {clubNavItems.map((item) => {
          const active = isClubNavActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-heading font-semibold transition-colors ${
                active ? "text-text-primary" : "text-text-secondary"
              }`}
            >
              <span className="relative">
                {item.icon(active)}
                <NavBadge count={badgeByHref[item.href] ?? 0} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
