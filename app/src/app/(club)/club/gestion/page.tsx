"use client";

import { useMyClub, type MyClub } from "@/_lib/use-my-club";
import { useUrlTab } from "@/_lib/use-url-tab";
import { PageSpinner } from "@/_components/spinner";
import { ClubSection } from "../../_components/club-section";
import { DashboardView } from "./_components/dashboard-view";
import { PagosView } from "./_components/pagos-view";

// Gestión del club (especificaciones 015 y 023): Dashboard y Pagos, como tabs. Asistencia y Sesiones pasaron a Seguimiento.
const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "pagos", label: "Pagos" },
] as const;
type Tab = (typeof TABS)[number]["key"];
const KEYS = TABS.map((t) => t.key);

export default function ClubGestionPage() {
  const { club, loading } = useMyClub();
  if (loading) return <PageSpinner />;
  if (!club) return <div className="px-4 py-20 text-center font-body text-sm text-text-secondary">Todavía no tienes un club.</div>;
  // `key` remonta la sección si cambia el club (al elegir «Otro club»): así sus pedidos no se quedan pegados al id anterior.
  return <GestionContent key={club.id} club={club} />;
}

function GestionContent({ club }: { club: MyClub }) {
  const [tab, setTab] = useUrlTab<Tab>(KEYS, "dashboard");
  return (
    <ClubSection
      title="Gestión"
      icon={
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      }
      club={club}
      tabs={TABS}
      tab={tab}
      onTab={setTab}
    >
      {tab === "dashboard" ? <DashboardView clubId={club.id} onOpenPagos={() => setTab("pagos")} /> : <PagosView clubId={club.id} />}
    </ClubSection>
  );
}
