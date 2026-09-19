"use client";

import { useState } from "react";
import Link from "next/link";
import { getClubCategories, getClubStaff } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import type { StaffRole } from "@/_lib/types";

const tabs = ["Categorías", "Planilla"] as const;
type Tab = (typeof tabs)[number];

const roleLabels: Record<StaffRole, string> = {
  delegado: "Delegado",
  asistente: "Asistente",
  director_tecnico: "DT",
};

function AvatarPlaceholder({ initials }: { initials: string }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-300 text-sm font-semibold text-text-secondary">
      {initials}
    </div>
  );
}

export default function ClubEquipoPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Categorías");
  const { data: teamCategories, loading: loadingCategories } = useApi(() => getClubCategories("club-1"));
  const { data: staffMembers, loading: loadingStaff } = useApi(() => getClubStaff("club-1"));

  if ((loadingCategories && !teamCategories) || (loadingStaff && !staffMembers)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const categories = teamCategories ?? [];
  const staff = staffMembers ?? [];
  const hasCategories = categories.length > 0;

  const grouped = categories.reduce(
    (acc, cat) => {
      const key = cat.gender === "femenino" ? "Femenino" : cat.gender === "masculino" ? "Masculino" : "Mixto";
      if (!acc[key]) acc[key] = [];
      acc[key].push(cat);
      return acc;
    },
    {} as Record<string, typeof categories>,
  );

  return (
    <div className="w-full pb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-text-primary">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 2C12 2 8 6 8 12s4 10 4 10M12 2c0 0 4 4 4 10s-4 10-4 10M2 12h20" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <h1 className="font-heading text-xl font-bold text-text-primary">Equipo</h1>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === "Planilla" && (
            <button className="text-text-primary">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M15 15l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <Link href="/club/notificaciones" className="text-text-primary">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex border-b border-brand-200 px-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 cursor-pointer py-2.5 text-center text-sm font-medium transition-colors ${
              activeTab === tab
                ? "border-b-2 border-brand-900 text-text-primary"
                : "text-text-secondary"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Categorías Tab */}
      {activeTab === "Categorías" && (
        <>
          {hasCategories ? (
            <div className="px-4">
              {Object.entries(grouped).map(([gender, cats]) => (
                <div key={gender} className="mt-6">
                  <h2 className="font-heading text-lg font-bold text-text-primary">{gender}</h2>
                  <div className="mt-2">
                    {cats.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/club/jugadores/${cat.id}`}
                        className="flex items-center justify-between border-b border-brand-200 py-4 last:border-0"
                      >
                        <div>
                          <p className="font-heading font-bold text-text-primary">{cat.name}</p>
                          <p className="text-sm text-text-secondary">{cat.playerCount} integrantes</p>
                        </div>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-secondary">
                          <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center px-4 pt-6">
              <div className="flex h-56 w-56 items-center justify-center rounded-full bg-brand-100">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" className="text-brand-400">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 2C12 2 8 6 8 12s4 10 4 10M12 2c0 0 4 4 4 10s-4 10-4 10M2 12h20" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <h2 className="mt-6 text-center font-heading text-xl font-bold text-text-primary">
                ¡Agrega tu primer categoría!
              </h2>
              <p className="mt-2 text-center text-sm text-text-secondary">
                Para agregar jugadores y tener tu equipo ideal listo para competir con otros equipos.
              </p>
            </div>
          )}

          <div className="mt-6 px-4">
            <Link
              href="/club/equipo/crear-categoria"
              className="block w-full rounded-xl bg-brand-900 py-3.5 text-center font-heading text-sm font-semibold text-text-invert"
            >
              Agregar categoría
            </Link>
          </div>
        </>
      )}

      {/* Planilla Tab */}
      {activeTab === "Planilla" && (
        <>
          <div className="mt-2">
            {staff.map((member) => (
              <Link
                key={member.id}
                href={`/club/equipo/planilla/${member.id}`}
                className="flex items-center gap-3 border-b border-brand-200 px-4 py-3"
              >
                <AvatarPlaceholder
                  initials={`${member.firstName[0]}${member.lastName[0]}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-heading font-bold text-text-primary">
                      {member.firstName} {member.lastName}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary">
                    {roleLabels[member.role as StaffRole] ?? member.role}
                  </p>
                </div>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 text-text-secondary">
                  <path d="M10.5 3.75l-1.06 1.06L13.19 8.56H3v1.5h10.19L9.44 13.81l1.06 1.06 5.25-5.25-5.25-5.87z" fill="currentColor" />
                  <path d="M2.5 2.5L15 2.5L15 15.5L10.5 15.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M13.5 4L10 7.5M10 4h3.5V7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ))}
          </div>

          <div className="mt-6 px-4">
            <Link
              href="/club/equipo/buscar-delegado"
              className="block w-full rounded-xl bg-brand-900 py-3.5 text-center font-heading text-sm font-semibold text-text-invert"
            >
              Agregar planilla
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
