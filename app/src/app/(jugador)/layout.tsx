"use client";

import { usePathname } from "next/navigation";
import { usePendingInvitations } from "@/_lib/use-pending-invitations";
import { useAuth } from "@/lib/auth-context";
import { AccountMenu } from "@/_components/account-menu";
import { MobileTopBar } from "@/_components/mobile-top-bar";
import { TopNav } from "@/_components/top-nav";
import { navName } from "@/_lib/nav-identity";
import { JugadorBottomNav, isJugadorNavActive, jugadorNavItems } from "./_components/jugador-bottom-nav";

export default function JugadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const invitesPending = usePendingInvitations();
  const isDetailView =
    /^\/jugador\/torneos\/.+/.test(pathname) ||
    // Mis equipos (¿con qué equipo sales hoy?) y la búsqueda de equipos van sin barra, como en el diseño.
    /^\/jugador\/equipos/.test(pathname) ||
    // Mi club (entrenamientos, asistencia y pagos): pantalla de detalle con su flecha para volver.
    /^\/jugador\/mi-club/.test(pathname) ||
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

  // Su nombre y apellido (especificación 001).
  const account = user ? <AccountMenu name={navName("jugador", user)} roleLabel="Jugador" role="JUGADOR" settingsHref="/jugador/ajustes" /> : null;

  return (
    <div className="flex min-h-dvh flex-col bg-surface-primary">
      {/* Escritorio: las secciones y la cuenta van arriba. En el celular, una barra fina con la cuenta y la barra inferior (ambas solo fuera de las pantallas de detalle). */}
      {!isDetailView && <MobileTopBar homeHref="/jugador/torneos" account={account} />}
      <TopNav items={items} homeHref="/jugador/torneos" label="Jugador" account={account} />
      <main className={`mx-auto w-full max-w-[430px] flex-1 ${wide ? "md:max-w-4xl lg:max-w-6xl" : "md:max-w-2xl"} ${isDetailView ? "" : "pb-24 md:pb-8"}`}>{children}</main>
      {!isDetailView && <JugadorBottomNav invitesPending={invitesPending} />}
    </div>
  );
}
