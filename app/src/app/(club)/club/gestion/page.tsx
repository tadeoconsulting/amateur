"use client";

import Link from "next/link";
import { useMyClub } from "@/_lib/use-my-club";
import { PageSpinner } from "@/_components/spinner";
import { MyClubCard } from "../../_components/my-club-card";
import { ClubSettingsLink } from "../../_components/club-settings-link";

// Gestión del club (especificación 015). Cada módulo aparece cuando está construido: Pagos, Asistencia y Sesiones.
const modules = [
  {
    href: "/club/gestion/pagos",
    title: "Pagos",
    description: "Cuota mensual de cada jugador y quién ya pagó.",
  },
  {
    href: "/club/gestion/asistencia",
    title: "Asistencia",
    description: "Pasar lista en cada entrenamiento y ver los promedios.",
  },
  {
    href: "/club/gestion/sesiones",
    title: "Sesiones",
    description: "Días, horarios y lugares de entrenamiento.",
  },
];

export default function ClubGestionPage() {
  const { club, loading } = useMyClub();
  if (loading) return <PageSpinner />;
  if (!club) return <div className="px-4 py-20 text-center font-body text-sm text-text-secondary">Todavía no tienes un club.</div>;

  return (
    <div className="w-full pb-4">
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-text-primary" aria-hidden="true">
            <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="font-heading text-xl font-bold text-text-primary">Gestión</h1>
        </div>
        <ClubSettingsLink />
      </div>

      <div className="mt-3 px-4">
        <MyClubCard club={club} />
      </div>

      <ul className="mt-4 px-4">
        {modules.map((m) => (
          <li key={m.href}>
            <Link href={m.href} className="flex items-center justify-between gap-3 border-b border-brand-200 py-4">
              <span>
                <span className="block font-heading font-bold text-text-primary">{m.title}</span>
                <span className="block text-sm text-text-secondary">{m.description}</span>
              </span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 text-text-secondary" aria-hidden="true">
                <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
