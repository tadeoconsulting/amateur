"use client";

import Link from "next/link";
import { getTournaments, getMatches, type TournamentListItem, type MatchListItem } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { UNSCHEDULED_LABEL } from "@/_lib/match-format";

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];
  return `${days[d.getUTCDay()]} ${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
}

type StatusFilter = "proximos" | "en_curso" | "finalizados";

export default function PartidosPage() {
  const { data: tournaments } = useApi(() => getTournaments());
  const { data: allMatchesData, loading } = useApi(() => getMatches());

  if (loading || !allMatchesData || !tournaments) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const allMatches = allMatchesData;

  const upcoming = allMatches.filter((m) => m.status === "programado");
  const live = allMatches.filter((m) => m.status === "en_curso");
  const finished = allMatches.filter((m) => m.status === "finalizado");

  const sections: { key: StatusFilter; label: string; matches: typeof allMatches }[] = [
    ...(live.length > 0 ? [{ key: "en_curso" as StatusFilter, label: "En vivo", matches: live }] : []),
    { key: "proximos", label: "Próximos", matches: upcoming },
    { key: "finalizados", label: "Finalizados", matches: finished },
  ];

  return (
    <div className="flex min-h-dvh flex-col pb-4">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-heading text-xl font-bold text-text-primary">
          Partidos
        </h1>
        <p className="mt-1 font-body text-sm text-text-secondary">
          Gestiona los partidos de tus torneos
        </p>
      </div>

      {/* Match sections */}
      <div className="flex flex-col gap-6 px-4 pt-2">
        {sections.map((section) => (
          <div key={section.key}>
            <div className="mb-3 flex items-center gap-2">
              {section.key === "en_curso" && (
                <span className="h-2 w-2 rounded-full bg-field-green animate-pulse" />
              )}
              <h2 className="font-heading text-base font-bold text-text-primary">
                {section.label}
              </h2>
              <span className="font-body text-sm text-text-secondary">
                ({section.matches.length})
              </span>
            </div>

            {section.matches.length === 0 ? (
              <p className="rounded-xl border border-border-primary px-4 py-6 text-center font-body text-sm text-text-secondary">
                No hay partidos {section.key === "proximos" ? "programados" : "en esta categoría"}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {section.matches.map((m) => {
                  const tournament = tournaments.find(
                    (t: TournamentListItem) => t.id === m.tournamentId
                  );
                  const href =
                    m.status === "finalizado"
                      ? `/torneos/${m.tournamentId}/resultado/${m.id}`
                      : `/torneos/${m.tournamentId}/en-vivo/${m.id}`;

                  return (
                    <Link
                      key={m.id}
                      href={href}
                      className="flex items-center rounded-xl border border-border-primary p-3 transition-colors hover:bg-btn-regular"
                    >
                      {/* Teams + scores */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-300 text-[8px] font-bold text-text-primary">
                            {m.homeTeam?.shortName ?? "?".slice(0, 2)}
                          </div>
                          <span className="flex-1 truncate font-body text-sm text-text-primary">
                            {m.homeTeam?.name ?? "Por definir"}
                          </span>
                          <span className="w-6 text-center font-heading text-base font-bold text-text-primary">
                            {m.homeScore ?? "-"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-300 text-[8px] font-bold text-text-primary">
                            {m.awayTeam?.shortName ?? "?".slice(0, 2)}
                          </div>
                          <span className="flex-1 truncate font-body text-sm text-text-primary">
                            {m.awayTeam?.name ?? "Por definir"}
                          </span>
                          <span className="w-6 text-center font-heading text-base font-bold text-text-primary">
                            {m.awayScore ?? "-"}
                          </span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="mx-3 h-10 w-px bg-brand-200" />

                      {/* Info + action */}
                      <div className="w-[90px] shrink-0 text-right">
                        {m.status === "en_curso" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-field-green/10 px-2 py-0.5 text-xs font-bold text-field-green">
                            <span className="h-1.5 w-1.5 rounded-full bg-field-green animate-pulse" />
                            En vivo
                          </span>
                        )}
                        {m.status === "programado" && (
                          <span className="font-heading text-xs font-bold text-brand-500">
                            Iniciar
                          </span>
                        )}
                        {m.status === "finalizado" && (
                          <span className="font-heading text-xs font-medium text-text-secondary">
                            Final
                          </span>
                        )}
                        <p className="mt-0.5 font-body text-[11px] text-text-secondary">
                          {m.time === "" ? UNSCHEDULED_LABEL : `${formatShortDate(m.date)} · ${m.time}`}
                        </p>
                        {tournament && (
                          <p className="font-body text-[11px] text-text-secondary truncate">
                            {tournament.name}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
