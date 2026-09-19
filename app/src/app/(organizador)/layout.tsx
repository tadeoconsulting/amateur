"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./_components/bottom-nav";

export default function OrganizadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isFixtureView = /^\/torneos\/[^/]+\/(partidos|manual|iniciar|fixture)/.test(pathname);
  const isDetailView = !isFixtureView && (/^\/torneos\/.+/.test(pathname) || /^\/jugadores/.test(pathname) || /^\/ajustes\/.+/.test(pathname));

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
      <BottomNav />
    </div>
  );
}
