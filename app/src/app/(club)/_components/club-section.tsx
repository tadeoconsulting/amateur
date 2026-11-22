"use client";

import type { ReactNode } from "react";
import type { MyClub } from "@/_lib/use-my-club";
import { SubTabs } from "@/_components/sub-tabs";
import { MyClubCard } from "./my-club-card";
import { ClubSettingsLink } from "./club-settings-link";

/**
 * El marco de una sección del delegado con tabs (Seguimiento y Gestión; especificación 023): un solo encabezado (ícono, título y
 * ajustes), la tarjeta del club y los tabs de la sección, con el contenido del tab elegido debajo. Las pantallas que antes eran
 * páginas sueltas son ahora el contenido de un tab, sin encabezado propio.
 */
export function ClubSection<K extends string>({
  title,
  icon,
  club,
  tabs,
  tab,
  onTab,
  children,
}: {
  title: string;
  icon: ReactNode;
  club: MyClub;
  tabs: readonly { key: K; label: string }[];
  tab: K;
  onTab: (tab: K) => void;
  children: ReactNode;
}) {
  return (
    <div className="w-full pb-4">
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="text-text-primary" aria-hidden="true">
            {icon}
          </span>
          <h1 className="font-heading text-xl font-bold text-text-primary">{title}</h1>
        </div>
        <ClubSettingsLink />
      </div>

      <div className="mt-3 px-4">
        <MyClubCard club={club} />
      </div>

      <SubTabs label={title} value={tab} onChange={onTab} tabs={[...tabs]} />

      {children}
    </div>
  );
}
