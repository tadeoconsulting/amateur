"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useMyClub } from "@/_lib/use-my-club";
import { AccountMenu } from "@/_components/account-menu";
import { MobileTopBar } from "@/_components/mobile-top-bar";
import { TopNav } from "@/_components/top-nav";
import { navName } from "@/_lib/nav-identity";
import { ClubBottomNav, clubNavItems, isClubNavActive, useClubNavBadges } from "./_components/club-bottom-nav";

export default function ClubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { club } = useMyClub();
  const badges = useClubNavBadges();
  const isDetailView = pathname === "/club" || /^\/club\/torneos\/.+/.test(pathname) || /^\/club\/jugadores\/.+/.test(pathname) || /^\/club\/equipo\/.+/.test(pathname) || /^\/club\/ajustes\/.+/.test(pathname) || /^\/club\/gestion\/.+/.test(pathname);
  // Escritorio: la pantalla de un torneo es ancha (fixture con la tabla al lado); el resto, una columna
  // cómoda de lectura. En el celular todo sigue en 430 px.
  const wide = /^\/club\/torneos\/[^/]+(\/partido\/[^/]+)?$/.test(pathname);

  const items = clubNavItems.map((item) => ({
    href: item.href,
    label: item.label,
    active: isClubNavActive(item.href, pathname),
    badge: badges[item.href] ?? 0,
  }));

  // El nombre de su club, o el suyo mientras no tiene uno (especificación 001).
  const account = user ? <AccountMenu name={navName("club", user, club)} roleLabel="Delegado" role="CLUB_OWNER" settingsHref="/club/ajustes" /> : null;

  return (
    <div className="flex min-h-dvh flex-col bg-surface-primary">
      {/* Escritorio: las secciones y la cuenta van arriba. En el celular, una barra fina con la cuenta y la barra inferior (ambas solo fuera de las pantallas de detalle). */}
      {!isDetailView && <MobileTopBar homeHref="/club/torneos" account={account} />}
      <TopNav items={items} homeHref="/club/torneos" label="Club" account={account} />
      <main className={`mx-auto w-full max-w-[430px] flex-1 ${wide ? "md:max-w-4xl lg:max-w-6xl" : "md:max-w-2xl"} ${isDetailView ? "" : "pb-20 md:pb-8"}`}>{children}</main>
      {!isDetailView && <ClubBottomNav badges={badges} />}
    </div>
  );
}
