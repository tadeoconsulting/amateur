"use client";

import Link from "next/link";
import { useState } from "react";
import { useApi } from "@/_lib/use-api";
import { organizersOf, type AdminTeam } from "@/_lib/admin-teams";
import { ClubCrest } from "@/_components/club-crest";
import { MultiSelect } from "../../_components/multi-select";
import { SortTh, useSort } from "../../_components/sortable";

type StatusLabels = Record<string, { label: string; color: string }>;

const KIND = { oficial: "Oficial", temporal: "Temporal" } as const;

const organizerNames = (t: AdminTeam) => organizersOf(t).map((o) => o.name).join(", ");

const accessors = {
  team: (t: AdminTeam) => t.name,
  tournaments: (t: AdminTeam) => t.tournaments.length,
  organizer: (t: AdminTeam) => organizerNames(t),
  kind: (t: AdminTeam) => (t.isTemporary ? KIND.temporal : KIND.oficial),
  players: (t: AdminTeam) => t.playerCount,
};

const countBy = <T,>(rows: T[], keys: (r: T) => string[]) => {
  const counts = new Map<string, number>();
  for (const r of rows) for (const k of new Set(keys(r))) counts.set(k, (counts.get(k) ?? 0) + 1);
  return counts;
};

/**
 * Admin → Torneos → Equipos: los equipos inscritos en los torneos de la plataforma, cada uno una sola vez, con los
 * torneos donde juega y su organizador. Solo para consultar; para editar, oficializar o invitar al delegado cada equipo
 * lleva a su ficha en Admin → Clubes.
 */
export function TorneosEquipos({ statusLabels }: { statusLabels: StatusLabels }) {
  const [search, setSearch] = useState("");
  const [organizerFilter, setOrganizerFilter] = useState<string[]>([]);
  const [tournamentFilter, setTournamentFilter] = useState<string[]>([]);
  const [kindFilter, setKindFilter] = useState<string[]>([]);

  const { data, loading, refetch } = useApi<AdminTeam[]>(() => fetch("/api/admin/equipos").then((r) => (r.ok ? r.json() : [])));
  const teams = data ?? [];

  const filtered = data?.filter((t) => {
    if (kindFilter.length > 0 && !kindFilter.includes(t.isTemporary ? "temporal" : "oficial")) return false;
    if (organizerFilter.length > 0 && !organizersOf(t).some((o) => organizerFilter.includes(o.id))) return false;
    if (tournamentFilter.length > 0 && !t.tournaments.some((x) => tournamentFilter.includes(x.id))) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.shortName.toLowerCase().includes(q);
  });
  const { sorted, sort, toggle } = useSort(filtered, accessors);

  const organizerCounts = countBy(teams, (t) => organizersOf(t).map((o) => o.id));
  const organizerOptions = [...organizerCounts.entries()]
    .map(([value, n]) => {
      const name = teams.flatMap(organizersOf).find((o) => o.id === value)?.name ?? value;
      return { value, label: name, hint: String(n) };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
  const tournamentCounts = countBy(teams, (t) => t.tournaments.map((x) => x.id));
  const tournamentOptions = [...tournamentCounts.entries()]
    .map(([value, n]) => ({ value, label: teams.flatMap((t) => t.tournaments).find((x) => x.id === value)?.name ?? value, hint: String(n) }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
  const kindCounts = countBy(teams, (t) => [t.isTemporary ? "temporal" : "oficial"]);
  const kindOptions = (["oficial", "temporal"] as const)
    .filter((k) => kindCounts.has(k))
    .map((k) => ({ value: k, label: KIND[k], hint: String(kindCounts.get(k)) }));

  const hasFilters = organizerFilter.length + tournamentFilter.length + kindFilter.length > 0 || search !== "";

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" aria-hidden="true">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar equipo"
            className="w-full rounded-lg border border-border-primary bg-surface-primary py-2.5 pl-9 pr-3 font-body text-sm text-text-primary outline-none focus:border-brand-500"
            placeholder="Buscar equipo..."
          />
        </div>

        <MultiSelect allLabel="Todos los organizadores" noun="organizadores" options={organizerOptions} selected={organizerFilter} onChange={setOrganizerFilter} searchPlaceholder="Buscar organizador..." />
        <MultiSelect allLabel="Todos los torneos" noun="torneos" options={tournamentOptions} selected={tournamentFilter} onChange={setTournamentFilter} searchPlaceholder="Buscar torneo..." />
        <MultiSelect allLabel="Oficiales y temporales" noun="tipos" options={kindOptions} selected={kindFilter} onChange={setKindFilter} />
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setSearch(""); setOrganizerFilter([]); setTournamentFilter([]); setKindFilter([]); }}
            className="cursor-pointer font-heading text-xs font-bold text-text-primary underline"
          >
            Quitar filtros
          </button>
        )}
        <button
          onClick={refetch}
          aria-label="Actualizar lista"
          className="cursor-pointer rounded-lg border border-border-primary p-2.5 text-text-secondary transition-colors hover:bg-btn-regular hover:text-text-primary"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 8a6 6 0 0110.89-3.48M14 8a6 6 0 01-10.89 3.48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M14 2v3h-3M2 14v-3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {loading || !sorted ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <p role="status" className="mb-2 font-body text-xs text-text-secondary">
            {hasFilters ? `${sorted.length} de ${teams.length} equipos` : `${teams.length} ${teams.length === 1 ? "equipo" : "equipos"}`}
          </p>
          <div className="overflow-x-auto rounded-xl border border-border-primary bg-surface-primary">
            <table className="w-full min-w-[900px] [&_td]:px-2.5 [&_th]:px-2.5">
              <thead>
                <tr className="border-b border-border-primary bg-brand-50">
                  <SortTh label="Equipo" sortKey="team" sort={sort} onToggle={toggle} />
                  <SortTh label="Torneos" sortKey="tournaments" sort={sort} onToggle={toggle} />
                  <SortTh label="Organizador" sortKey="organizer" sort={sort} onToggle={toggle} />
                  <SortTh label="Tipo" sortKey="kind" sort={sort} onToggle={toggle} align="center" />
                  <SortTh label="Jugadores" sortKey="players" sort={sort} onToggle={toggle} align="center" />
                  <th className="px-4 py-3 text-right font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Ficha</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => (
                  <tr key={t.id} className="border-b border-border-primary last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <ClubCrest club={t} size="h-9 w-9" textSize="text-[10px]" />
                        <div className="min-w-0">
                          <p className="truncate font-heading text-sm font-bold text-text-primary">{t.name}</p>
                          <p className="font-body text-xs text-text-secondary">{t.shortName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <ul className="flex flex-col gap-1">
                        {t.tournaments.map((x) => {
                          const st = statusLabels[x.status] ?? { label: x.status, color: "bg-gray-100 text-gray-600" };
                          return (
                            <li key={x.id} className="flex items-center gap-2 font-body text-sm text-text-primary">
                              <span className="truncate">{x.name}</span>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.color}`}>{st.label}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </td>
                    <td className="py-3 font-body text-sm text-text-primary">{organizerNames(t) || "—"}</td>
                    <td className="py-3 text-center">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${t.isTemporary ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                        {t.isTemporary ? KIND.temporal : KIND.oficial}
                      </span>
                    </td>
                    <td className="py-3 text-center font-body text-sm text-text-primary">{t.playerCount}</td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/admin/clubes?buscar=${encodeURIComponent(t.name)}`}
                        aria-label={`Ver la ficha de ${t.name} en Clubes`}
                        className="font-heading text-xs font-bold text-text-primary underline underline-offset-2 hover:text-brand-700"
                      >
                        Ver en Clubes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sorted.length === 0 && (
              <p className="px-4 py-12 text-center font-body text-sm text-text-secondary">
                {teams.length === 0 ? "Todavía no hay equipos inscritos en ningún torneo." : "Ningún equipo coincide con los filtros."}
              </p>
            )}
          </div>
        </>
      )}
    </>
  );
}
