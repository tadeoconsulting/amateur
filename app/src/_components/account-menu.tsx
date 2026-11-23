"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Picklist, type PicklistItem } from "@/_components/picklist";
import { otherProfiles, type ProfileRole } from "@/_lib/profiles";
import { NAV_NAME_MAX_DESKTOP, NAV_NAME_MAX_MOBILE, navInitial, shortNavName } from "@/_lib/nav-identity";

/**
 * El nombre de quien tiene la sesión en la navegación principal (especificación 001), con su menú de cuenta: ir a su perfil,
 * pasar a otro de sus perfiles y cerrar sesión. `name` ya viene resuelto por pantalla (la organización del organizador, el
 * club del delegado, el nombre del jugador); `role` es el perfil de la pantalla en la que se está.
 *
 * El menú es el desplegable único de la plataforma (`Picklist`, variante `menu`): aquí solo se arman sus ítems, el botón con
 * el avatar y el nombre, y el encabezado.
 */
export function AccountMenu({ name, roleLabel, role, settingsHref }: { name: string; roleLabel: string; role: ProfileRole; settingsHref: string }) {
  const { user, logout } = useAuth();
  const [busy, setBusy] = useState(false);

  const { mine } = otherProfiles(user?.roles ?? [], role);
  const items: PicklistItem[] = [
    { key: "perfil", label: "Mi perfil y ajustes", href: settingsHref },
    ...mine.map((p) => ({ key: `cambiar-${p.role}`, label: `Cambiar a ${p.label.toLocaleLowerCase("es")}`, href: p.href })),
    {
      key: "salir",
      label: "Cerrar sesión",
      disabled: busy,
      onSelect: async () => {
        setBusy(true);
        await logout();
      },
    },
  ];

  return (
    <Picklist
      variant="menu"
      triggerStyle="ghost"
      label={`Cuenta de ${name}`}
      items={items}
      trigger={
        <>
          <span aria-hidden className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-xs font-bold text-text-invert">
            {navInitial(name)}
          </span>
          {/* 12 caracteres en el celular y 24 en escritorio; el nombre completo queda en `title`. */}
          <span title={name} className="max-w-[10rem] truncate md:hidden">{shortNavName(name, NAV_NAME_MAX_MOBILE)}</span>
          <span title={name} className="hidden max-w-[16rem] truncate md:inline">{shortNavName(name, NAV_NAME_MAX_DESKTOP)}</span>
          <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </>
      }
      header={
        <>
          <p className="truncate font-body text-base font-bold text-text-primary">{name}</p>
          <p className="font-body text-base text-text-secondary">{roleLabel}</p>
        </>
      }
    />
  );
}
