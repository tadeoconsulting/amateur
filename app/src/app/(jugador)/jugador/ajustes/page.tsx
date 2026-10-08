"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { usePendingInvitations } from "@/_lib/use-pending-invitations";

const menuItems = [
  { label: "Mi Perfil", href: "/jugador/ajustes/perfil" },
  { label: "Mis equipos", href: "/jugador/equipos" },
  { label: "Cambiar contraseña", href: "/jugador/ajustes/contrasena" },
  { label: "Centro de ayuda", href: "/ayuda" },
  { label: "Términos y condiciones", href: "/terminos" },
  { label: "Políticas de privacidad", href: "/privacidad" },
];

function MenuRow({ label, href, badge = 0 }: { label: string; href: string; badge?: number }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between border-b border-brand-200 py-4"
    >
      <span className="flex items-center gap-2 text-sm text-text-primary">
        {label}
        {badge > 0 && (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-verification px-1.5 text-[11px] font-bold leading-5 text-surface-secondary">
            {badge}
          </span>
        )}
      </span>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-secondary">
        <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

export default function JugadorAjustesPage() {
  const { logout } = useAuth();
  // Las invitaciones de un club se aceptan desde "Mis equipos".
  const invitesPending = usePendingInvitations();

  return (
    <div className="w-full pb-4">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-text-primary">
          <path
            d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <h1 className="font-heading text-xl font-bold text-text-primary">Ajustes</h1>
      </div>

      {/* Menu */}
      <div className="mt-6 px-4">
        {menuItems.map((item) => (
          <MenuRow key={item.label} label={item.label} href={item.href} badge={item.href === "/jugador/equipos" ? invitesPending : 0} />
        ))}
      </div>

      {/* Cerrar sesión */}
      <div className="mt-12 text-center">
        <button onClick={() => logout()} className="cursor-pointer text-sm font-medium text-text-primary underline">
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
