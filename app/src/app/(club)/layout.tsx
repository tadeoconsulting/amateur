"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/_components/top-nav";
import { ClubBottomNav, clubNavItems, isClubNavActive, useClubNavBadges } from "./_components/club-bottom-nav";

export default function ClubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const badges = useClubNavBadges();
  const isDetailView = pathname === "/club" || /^\/club\/torneos\/.+/.test(pathname) || /^\/club\/jugadores\/.+/.test(pathname) || /^\/club\/equipo\/.+/.test(pathname) || /^\/club\/ajustes\/.+/.test(pathname);
  // Escritorio: la pantalla de un torneo es ancha (fixture con la tabla al lado); el resto, una columna
  // cómoda de lectura. En el celular todo sigue en 430 px.
  const wide = /^\/club\/torneos\/[^/]+$/.test(pathname);

  const items = clubNavItems.map((item) => ({
    href: item.href,
    label: item.label,
    active: isClubNavActive(item.href, pathname),
    badge: badges[item.href] ?? 0,
  }));

  return (
    <div className="flex min-h-dvh flex-col bg-surface-primary">
      {/* Escritorio: las secciones van arriba. En el celular, la barra inferior (y solo fuera de las pantallas de detalle). */}
      <TopNav items={items} homeHref="/club/torneos" label="Club" />
      <main className={`mx-auto w-full max-w-[430px] flex-1 ${wide ? "md:max-w-4xl lg:max-w-6xl" : "md:max-w-2xl"} ${isDetailView ? "" : "pb-20 md:pb-8"}`}>{children}</main>
      {!isDetailView && <ClubBottomNav badges={badges} />}
    </div>
  );
}
