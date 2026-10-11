"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

// El área de la mesa (especificación 011): sin el menú del organizador. Un encabezado con quién es y cómo salir.
export default function MesaLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  // La pantalla en vivo y el cambio de contraseña traen su propio encabezado ("Volver").
  const bare = /^\/mesa\/(torneos|contrasena)\b/.test(pathname);

  return (
    <div className="flex min-h-dvh flex-col bg-surface-primary">
      {!bare && (
        <header className="mx-auto flex w-full max-w-[430px] items-center justify-between gap-3 px-4 py-3 md:max-w-2xl">
          <Link href="/mesa" className="font-heading text-lg font-bold text-text-primary">
            Amateur <span className="font-body text-sm font-normal text-text-secondary">· Mesa</span>
          </Link>
          <div className="flex items-center gap-3">
            {user && <span className="hidden font-body text-sm text-text-secondary sm:inline">{user.firstName}</span>}
            <button
              type="button"
              onClick={() => void logout("/")}
              className="min-h-11 cursor-pointer px-1 font-heading text-sm font-semibold text-text-primary underline underline-offset-2"
            >
              Salir
            </button>
          </div>
        </header>
      )}
      <main className="mx-auto w-full max-w-[430px] flex-1 md:max-w-2xl">{children}</main>
    </div>
  );
}
