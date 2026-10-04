"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { otherProfiles } from "@/lib/profiles";

const menuItems = [
  { label: "Mi Ajustes", href: "/club/ajustes/perfil" },
  { label: "Cambiar contraseña", href: "/club/ajustes/contrasena" },
  { label: "Centro de ayuda", href: "/ayuda" },
  { label: "Términos y condiciones", href: "/terminos" },
];

function MenuRow({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between border-b border-brand-200 py-4"
    >
      <span className="text-sm text-text-primary">{label}</span>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-secondary">
        <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

export default function ClubAjustesPage() {
  const { user, logout } = useAuth();
  const { mine, missing } = otherProfiles(user?.roles ?? [], "CLUB_OWNER");

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

      {/* Main menu */}
      <div className="mt-6 px-4">
        {menuItems.map((item) => (
          <MenuRow key={item.label} label={item.label} href={item.href} />
        ))}
      </div>

      {/* Switch profile section: solo los perfiles que la cuenta ya tiene, más la
          opción de crear uno nuevo si le falta alguno. */}
      {(mine.length > 0 || missing.length > 0) && (
        <div className="mt-8 px-4">
          <h2 className="font-heading text-lg font-bold text-text-primary">
            Cambiar de perfil
          </h2>
          <div className="mt-2">
            {mine.map((p) => (
              <MenuRow key={p.role} label={p.label} href={p.href} />
            ))}
            {missing.length > 0 && (
              <MenuRow label="Crear nuevo perfil" href="/seleccion-perfil" />
            )}
          </div>
        </div>
      )}

      {/* Otro club: no es un perfil, es otro club que la misma cuenta administre. */}
      <div className="mt-8 px-4">
        <h2 className="font-heading text-lg font-bold text-text-primary">
          Otros clubes
        </h2>
        <div className="mt-2">
          <MenuRow label="Otro club" href="/club/ajustes/otro-club" />
        </div>
      </div>

      {/* Cerrar sesión */}
      <div className="mt-12 text-center">
        <button onClick={logout} className="cursor-pointer text-sm font-medium text-text-primary underline">
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
