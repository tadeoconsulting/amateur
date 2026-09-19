"use client";

import { usePathname } from "next/navigation";
import { JugadorBottomNav } from "./_components/jugador-bottom-nav";

export default function JugadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDetailView =
    /^\/jugador\/torneos\/.+/.test(pathname) ||
    /^\/jugador\/ajustes\/.+/.test(pathname);

  if (isDetailView) {
    return (
      <div className="flex min-h-dvh flex-col bg-surface-primary">
        <main className="mx-auto w-full max-w-[430px] flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-surface-primary">
      <main className="mx-auto w-full max-w-[430px] flex-1 pb-20">{children}</main>
      <JugadorBottomNav />
    </div>
  );
}
