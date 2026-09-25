"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { getTournament } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { WizardProvider } from "@/app/crear-torneo/_components/wizard-context";
import { wizardStateFromTournament } from "@/app/crear-torneo/_components/tournament-to-wizard";

// Editar un torneo reutiliza los tres pasos de crear-torneo, ya cargados con lo registrado.
export default function EditarTorneoLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const { data: tournament, loading } = useApi(() => getTournament(id));

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="font-body text-sm text-text-secondary">No se pudo cargar el torneo.</p>
        <Link href="/torneos" className="font-heading text-sm font-bold text-text-primary underline">
          Volver a Mis Torneos
        </Link>
      </div>
    );
  }

  return (
    <WizardProvider tournamentId={id} initial={wizardStateFromTournament(tournament)}>
      {children}
    </WizardProvider>
  );
}
