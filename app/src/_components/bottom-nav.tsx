"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/torneos", label: "Torneos", icon: TrophyIcon },
  { href: "/jugadores", label: "Jugadores", icon: PlayersIcon },
  { href: "/equipo", label: "Equipo", icon: TeamIcon },
  { href: "/perfil", label: "Perfil", icon: ProfileIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-brand-200 bg-white">
      <div className="mx-auto flex max-w-[430px] items-center justify-around py-2">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                active ? "text-text-primary" : "text-text-secondary"
              }`}
            >
              <item.icon active={active} />
              <span className={`text-[10px] ${active ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function TrophyIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 4h12v5a6 6 0 01-12 0V4zM5 5H3a1 1 0 00-1 1v1a3 3 0 003 3h.5M19 5h2a1 1 0 011 1v1a3 3 0 01-3 3h-.5M9 14v2M15 14v2M7 16h10a1 1 0 011 1v1H6v-1a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth={active ? "2" : "1.5"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayersIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3.46776C17.4817 4.20411 18.5 5.73314 18.5 7.5C18.5 9.26686 17.4817 10.7959 16 11.5322M18 16.7664C19.5115 17.4503 20.8725 18.565 22 20M2 20C3.94649 17.5226 6.58918 16 9.5 16C12.4108 16 15.0535 17.5226 17 20M14 7.5C14 9.98528 11.9853 12 9.5 12C7.01472 12 5 9.98528 5 7.5C5 5.01472 7.01472 3 9.5 3C11.9853 3 14 5.01472 14 7.5Z" />
    </svg>
  );
}

function TeamIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L3 7v7c0 5 4 8 9 10 5-2 9-5 9-10V7l-9-5z" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" />
    </svg>
  );
}
