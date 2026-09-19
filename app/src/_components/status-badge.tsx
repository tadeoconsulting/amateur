import type { TournamentStatus, MatchStatus } from "@/_lib/types";

const tournamentStatusConfig: Record<TournamentStatus, { label: string; className: string }> = {
  draft: { label: "Borrador", className: "bg-brand-200 text-text-primary" },
  inscripcion: { label: "Inscripción", className: "bg-yellow/20 text-brand-900" },
  en_curso: { label: "En curso", className: "bg-verification/15 text-brand-900" },
  finalizado: { label: "Finalizado", className: "bg-brand-300 text-brand-500" },
};

const matchStatusConfig: Record<MatchStatus, { label: string; className: string }> = {
  programado: { label: "Programado", className: "bg-brand-200 text-text-primary" },
  en_vivo: { label: "En vivo", className: "bg-red/15 text-red" },
  finalizado: { label: "Finalizado", className: "bg-brand-300 text-brand-500" },
  suspendido: { label: "Suspendido", className: "bg-yellow/20 text-brand-900" },
};

export function TournamentStatusBadge({ status }: { status: TournamentStatus }) {
  const config = tournamentStatusConfig[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {status === "en_curso" && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-verification" />}
      {config.label}
    </span>
  );
}

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const config = matchStatusConfig[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {status === "en_vivo" && <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-red" />}
      {config.label}
    </span>
  );
}
