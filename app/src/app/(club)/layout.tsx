"use client";

import { usePathname } from "next/navigation";
import { ClubBottomNav } from "./_components/club-bottom-nav";

export default function ClubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDetailView = pathname === "/club" || /^\/club\/torneos\/.+/.test(pathname) || /^\/club\/jugadores\/.+/.test(pathname) || /^\/club\/equipo\/.+/.test(pathname) || /^\/club\/ajustes\/.+/.test(pathname);

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
      <ClubBottomNav />
    </div>
  );
}
