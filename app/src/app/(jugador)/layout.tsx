"use client";

import { usePathname } from "next/navigation";
import { usePendingInvitations } from "@/_lib/use-pending-invitations";
import { TopNav } from "@/_components/top-nav";
import { JugadorBottomNav, isJugadorNavActive, jugadorNavItems } from "./_components/jugador-bottom-nav";

export default function JugadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const invitesPending = usePendingInvitations();
  const isDetailView =
    /^\/jugador\/torneos\/.+/.test(pathname) ||
    // Mis equipos (¿con qué equipo sales hoy?) y la búsqueda de equipos van sin barra, como en el diseño.
    /^\/jugador\/equipos/.test(pathname) ||
    /^\/jugador\/ajustes\/.+/.test(pathname);
  // Escritorio: la pantalla de un torneo es ancha (fixture con la tabla al lado); el resto, una columna
  // cómoda de lectura. La ficha de un partido también es ancha. En el celular todo sigue en 430 px.
  const wide = /^\/jugador\/torneos\/[^/]+(\/partido\/[^/]+)?$/.test(pathname);

  const items = jugadorNavItems.map((item) => ({
    href: item.href,
    label: item.label,
    active: isJugadorNavActive(item, pathname),
    badge: item.href === "/jugador/ajustes" ? invitesPending : 0,
  }));

  return (
    <div className="flex min-h-dvh flex-col bg-surface-primary">
      {/* Escritorio: las secciones van arriba. En el celular, la barra inferior (y solo fuera de las pantallas de detalle). */}
      <TopNav items={items} homeHref="/jugador/torneos" label="Jugador" />
      <main className={`mx-auto w-full max-w-[430px] flex-1 ${wide ? "md:max-w-4xl lg:max-w-6xl" : "md:max-w-2xl"} ${isDetailView ? "" : "pb-24 md:pb-8"}`}>{children}</main>
      {!isDetailView && <JugadorBottomNav invitesPending={invitesPending} />}
    </div>
  );
}
