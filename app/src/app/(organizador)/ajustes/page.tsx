"use client";

import Link from "next/link";

const menuItems = [
  { label: "Mi Perfil", href: "/ajustes/perfil" },
  { label: "Mis sedes", href: "/ajustes/sedes" },
  { label: "Centro de ayuda", href: "#" },
  { label: "Términos y condiciones", href: "#" },
  { label: "Políticas de privacidad", href: "#" },
];

export default function AjustesPage() {
  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-text-primary">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <h1 className="font-heading text-xl font-bold text-text-primary">Ajustes</h1>
      </div>

      {/* Menu items */}
      <div className="mt-4 flex flex-col">
        {menuItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center justify-between px-4 py-4 transition-colors hover:bg-btn-regular"
          >
            <span className="font-body text-base text-text-primary">{item.label}</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-secondary">
              <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Cerrar sesión */}
      <div className="px-4 pb-6 pt-8 text-center">
        <button className="cursor-pointer font-heading text-base font-bold text-text-primary underline underline-offset-2">
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
