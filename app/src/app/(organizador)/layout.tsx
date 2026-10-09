"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/_components/top-nav";
import { BottomNav, isOrganizadorNavActive, organizadorNavItems } from "./_components/bottom-nav";

export default function OrganizadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isFixtureView = /^\/torneos\/[^/]+\/(partidos|manual|iniciar|fixture)/.test(pathname);
  const isDetailView = !isFixtureView && (/^\/torneos\/.+/.test(pathname) || /^\/jugadores/.test(pathname) || /^\/ajustes\/.+/.test(pathname));
  // Escritorio: la pantalla de un torneo es ancha (fixture con la tabla al lado); el resto, una columna
  // cómoda de lectura. En el celular todo sigue en 430 px.
  const wide = /^\/torneos\/[^/]+(\/editar(\/paso-[23])?)?$/.test(pathname);

  const items = organizadorNavItems.map((item) => ({
    href: item.href,
    label: item.label,
    active: isOrganizadorNavActive(item.href, pathname),
  }));

  return (
    <div className="flex min-h-dvh flex-col bg-surface-primary">
      {/* Escritorio: las secciones van arriba. En el celular, la barra inferior (y solo fuera de las pantallas de detalle). */}
      <TopNav items={items} homeHref="/torneos" label="Organizador" />
      <main className={`mx-auto w-full max-w-[430px] flex-1 ${wide ? "md:max-w-4xl lg:max-w-6xl" : "md:max-w-2xl"} ${isDetailView ? "" : "pb-20 md:pb-8"}`}>{children}</main>
      {!isDetailView && <BottomNav />}
    </div>
  );
}
