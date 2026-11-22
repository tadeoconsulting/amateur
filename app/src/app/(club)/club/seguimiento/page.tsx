"use client";

import { useMyClub, type MyClub } from "@/_lib/use-my-club";
import { useUrlTab } from "@/_lib/use-url-tab";
import { PageSpinner } from "@/_components/spinner";
import { ClubSection } from "../../_components/club-section";
import { AsistenciaView } from "./_components/asistencia-view";
import { SesionesView } from "./_components/sesiones-view";

// Seguimiento del equipo (especificación 023): de inicio, las sesiones de entrenamiento y la asistencia, que antes vivían en
// Gestión. Aquí caben más adelante los demás seguimientos del equipo.
const TABS = [
  { key: "sesiones", label: "Sesiones" },
  { key: "asistencia", label: "Asistencia" },
] as const;
type Tab = (typeof TABS)[number]["key"];
const KEYS = TABS.map((t) => t.key);

export default function ClubSeguimientoPage() {
  const { club, loading } = useMyClub();
  if (loading) return <PageSpinner />;
  if (!club) return <div className="px-4 py-20 text-center font-body text-sm text-text-secondary">Todavía no tienes un club.</div>;
  return <SeguimientoContent key={club.id} club={club} />;
}

function SeguimientoContent({ club }: { club: MyClub }) {
  const [tab, setTab] = useUrlTab<Tab>(KEYS, "sesiones");
  return (
    <ClubSection
      title="Seguimiento"
      icon={
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2zM9 14l2 2 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      }
      club={club}
      tabs={TABS}
      tab={tab}
      onTab={setTab}
    >
      {tab === "sesiones" ? <SesionesView clubId={club.id} /> : <AsistenciaView clubId={club.id} onOpenSesiones={() => setTab("sesiones")} />}
    </ClubSection>
  );
}
