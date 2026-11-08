"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AccountMenu } from "@/_components/account-menu";
import { MobileTopBar } from "@/_components/mobile-top-bar";
import { TopNav } from "@/_components/top-nav";
import { navName } from "@/_lib/nav-identity";
import { BottomNav, isOrganizadorNavActive, organizadorNavItems } from "./_components/bottom-nav";

export default function OrganizadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isFixtureView = /^\/torneos\/[^/]+\/(partidos|manual|iniciar|fixture)/.test(pathname);
  const isDetailView = !isFixtureView && (/^\/torneos\/.+/.test(pathname) || /^\/jugadores/.test(pathname) || /^\/ajustes\/.+/.test(pathname));
  // Escritorio: la pantalla de un torneo es ancha (fixture con la tabla al lado); el resto, una columna
  // cómoda de lectura. En el celular todo sigue en 430 px.
  const wide = /^\/torneos\/[^/]+(\/editar(\/paso-[23])?|\/resultado\/[^/]+)?$/.test(pathname);

  const items = organizadorNavItems.map((item) => ({
    href: item.href,
    label: item.label,
    active: isOrganizadorNavActive(item.href, pathname),
  }));

  // El nombre de quien tiene la sesión: su organización, o su nombre si no la puso (especificación 001).
  const account = user ? <AccountMenu name={navName("organizador", user)} roleLabel="Organizador de torneo" role="ORGANIZADOR" settingsHref="/ajustes" /> : null;

  return (
    <div className="flex min-h-dvh flex-col bg-surface-primary">
      {/* Escritorio: las secciones y la cuenta van arriba. En el celular, una barra fina con la cuenta y la barra inferior (ambas solo fuera de las pantallas de detalle). */}
      {!isDetailView && <MobileTopBar homeHref="/torneos" account={account} />}
      <TopNav items={items} homeHref="/torneos" label="Organizador" account={account} />
      <main className={`mx-auto w-full max-w-[430px] flex-1 ${wide ? "md:max-w-4xl lg:max-w-6xl" : "md:max-w-2xl"} ${isDetailView ? "" : "pb-20 md:pb-8"}`}>{children}</main>
      {!isDetailView && <BottomNav />}
    </div>
  );
}
