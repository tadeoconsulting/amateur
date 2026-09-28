"use client";

import { useState } from "react";
import Link from "next/link";
import { getClubCategories, getClubStaff } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { useMyClub } from "@/_lib/use-my-club";
import { notifyChanged } from "@/_lib/notifications-changed";
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

interface StaffInvitationRow {
  token: string;
  role: StaffRole;
  invitedBy: string;
  club: { id: string; name: string; shortName: string; color: string | null };
}

/**
 * Invitaciones de staff (DT, delegado, asistente) dirigidas al correo de quien tiene la sesión.
 * Van al club que diga la invitación, no necesariamente al que se está viendo acá — por eso no
 * depende del `clubId` de la página, solo de la sesión.
 */
function StaffInvitations({ onJoined }: { onJoined: () => void }) {
  const { data: invitations, refetch } = useApi<StaffInvitationRow[]>(() =>
    fetch("/api/staff-invitations/mine").then((r) => (r.ok ? r.json() : []))
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function respond(inv: StaffInvitationRow, action: "accept" | "decline") {
    setBusy(inv.token);
    setError("");
    try {
      const res = await fetch(`/api/staff-invitations/${inv.token}/${action}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo completar la acción");
        return;
      }
      refetch();
      notifyChanged();
      if (action === "accept") onJoined();
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setBusy(null);
    }
  }

  if (!invitations || invitations.length === 0) return null;

  return (
    <div className="mt-4 px-4">
      <h2 className="font-heading text-sm font-bold text-text-primary">Invitaciones</h2>
      <div className="mt-2 space-y-2">
        {invitations.map((inv) => (
          <div key={inv.token} className="rounded-lg border border-brand-200 bg-btn-regular px-4 py-3">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: (inv.club.color || "#E5E7EB") + "20" }}
              >
                <span className="font-heading text-xs font-bold" style={{ color: inv.club.color || "#6B7280" }}>
                  {inv.club.shortName}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {inv.club.name} te invitó como {roleLabels[inv.role] ?? inv.role}
                </p>
                <p className="truncate text-xs text-text-secondary">Invitó {inv.invitedBy}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => respond(inv, "accept")}
                disabled={busy === inv.token}
                className="flex-1 cursor-pointer rounded-lg bg-surface-secondary py-2 text-sm font-semibold text-text-invert disabled:opacity-50"
              >
                Aceptar
              </button>
              <button
                onClick={() => respond(inv, "decline")}
                disabled={busy === inv.token}
                className="flex-1 cursor-pointer rounded-lg border border-border-primary py-2 text-sm font-semibold text-text-primary disabled:opacity-50"
              >
                Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default function ClubEquipoPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Categorías");
  const { club, loading: loadingClub } = useMyClub();

  if (loadingClub) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="px-4 py-20 text-center font-body text-sm text-text-secondary">
        Todavía no tienes un club.
      </div>
    );
  }

  // `key` fuerza a remontar si alguna vez cambia de club (por ejemplo al elegir "Otro club"),
  // así el useApi de abajo no se queda pegado al id anterior.
  return <ClubEquipoContent key={club.id} clubId={club.id} activeTab={activeTab} setActiveTab={setActiveTab} />;
}

function ClubEquipoContent({
  clubId,
  activeTab,
  setActiveTab,
}: {
  clubId: string;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}) {
  // Se monta solo cuando ya se conoce el club: el useApi de acá abajo pide una sola vez, al
  // montar, así que necesita el id correcto desde el primer render (ver "use-api.ts").
  const { data: teamCategories, loading: loadingCategories } = useApi(() => getClubCategories(clubId));
  const { data: staffMembers, loading: loadingStaff, refetch: refetchStaff } = useApi(() => getClubStaff(clubId));

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
          <Link href="/club/torneos?tab=solicitudes" className="text-text-primary">
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

      <StaffInvitations onJoined={refetchStaff} />

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
