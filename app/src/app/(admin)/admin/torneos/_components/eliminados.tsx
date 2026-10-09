"use client";

import { TournamentLogo } from "@/_components/tournament-logo";
import { useState } from "react";
import { formatLabel } from "@/_lib/tournament-labels";
import { ConfirmDelete } from "../../_components/confirm-delete";
import { SortTh, useSort } from "../../_components/sortable";

export interface DeletedTournament {
  id: string;
  name: string;
  logoUrl: string | null;
  format: string;
  teamsCount: number;
  matchesCount: number;
  deletedAt: string | null;
  organizer: { firstName: string; lastName: string };
}

const accessors = {
  name: (t: DeletedTournament) => t.name,
  organizer: (t: DeletedTournament) => `${t.organizer.firstName} ${t.organizer.lastName}`,
  teams: (t: DeletedTournament) => t.teamsCount,
  matches: (t: DeletedTournament) => t.matchesCount,
  deleted: (t: DeletedTournament) => (t.deletedAt ? new Date(t.deletedAt).getTime() : null),
};

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-PE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/**
 * Torneos eliminados: no se ven en ninguna pantalla de la plataforma, pero siguen guardados con sus
 * equipos, partidos y resultados. Desde acá un admin los restaura o los elimina definitivamente.
 */
export function TorneosEliminados({ rows, onChanged }: { rows: DeletedTournament[]; onChanged: () => void }) {
  const [permanent, setPermanent] = useState<DeletedTournament | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const { sorted, sort, toggle } = useSort(rows, accessors);

  async function restore(t: DeletedTournament) {
    setRestoring(t.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/tournaments/${t.id}/restore`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ ok: false, text: data.error ?? "No se pudo restaurar el torneo" });
        return;
      }
      setNotice({ ok: true, text: `Se restauró "${t.name}": ya vuelve a verse con todo lo que tenía.` });
      onChanged();
    } catch {
      setNotice({ ok: false, text: "No se pudo conectar. Inténtalo de nuevo." });
    } finally {
      setRestoring(null);
    }
  }

  return (
    <div>
      <p className="mb-4 max-w-2xl font-body text-sm text-text-secondary">
        Estos torneos no se ven en la plataforma (ni para el organizador, ni para clubes, jugadores o público), pero siguen guardados con sus equipos, partidos y resultados.
        Restáuralos para que vuelvan, o elimínalos definitivamente para borrarlos del todo.
      </p>

      {notice && (
        <p role={notice.ok ? "status" : "alert"} className={`mb-4 rounded-lg px-4 py-2.5 font-body text-sm ${notice.ok ? "bg-field-green/10 text-text-primary" : "bg-red-50 text-red-700"}`}>
          {notice.text}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border-primary bg-surface-primary">
        <table className="w-full min-w-[820px] [&_td]:px-2.5 [&_th]:px-2.5">
          <thead>
            <tr className="border-b border-border-primary bg-brand-50">
              <SortTh label="Torneo" sortKey="name" sort={sort} onToggle={toggle} />
              <SortTh label="Organizador" sortKey="organizer" sort={sort} onToggle={toggle} />
              <SortTh label="Equipos" sortKey="teams" sort={sort} onToggle={toggle} align="center" />
              <SortTh label="Partidos" sortKey="matches" sort={sort} onToggle={toggle} align="center" />
              <SortTh label="Eliminado" sortKey="deleted" sort={sort} onToggle={toggle} />
              <th className="px-4 py-3 text-right font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted?.map((t) => (
              <tr key={t.id} className="border-b border-border-primary last:border-0">
                <td className="min-w-56 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <TournamentLogo logoUrl={t.logoUrl} size="h-9 w-9" />
                    <div className="min-w-0">
                      <p className="font-heading text-sm font-semibold text-text-primary">{t.name}</p>
                      <p className="font-body text-xs text-text-secondary">{formatLabel(t.format)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-body text-sm text-text-secondary">
                  {t.organizer.firstName} {t.organizer.lastName}
                </td>
                <td className="px-4 py-3 text-center font-heading text-sm font-bold text-text-primary">{t.teamsCount}</td>
                <td className="px-4 py-3 text-center font-heading text-sm font-bold text-text-primary">{t.matchesCount}</td>
                <td className="px-4 py-3 font-body text-sm text-text-secondary">{when(t.deletedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => restore(t)}
                      disabled={restoring === t.id}
                      aria-label={`Restaurar ${t.name}`}
                      className="cursor-pointer rounded-lg bg-surface-secondary px-3 py-1.5 font-heading text-xs font-semibold text-text-invert transition-colors hover:bg-brand-700 disabled:opacity-50"
                    >
                      {restoring === t.id ? "Restaurando..." : "Restaurar"}
                    </button>
                    <button
                      onClick={() => setPermanent(t)}
                      aria-label={`Eliminar definitivamente ${t.name}`}
                      className="cursor-pointer rounded-lg border border-red-200 px-3 py-1.5 font-heading text-xs font-semibold text-red-700 transition-colors hover:bg-red-50"
                    >
                      Eliminar definitivamente
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center font-body text-sm text-text-secondary">
                  No hay torneos eliminados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {permanent && (
        <ConfirmDelete
          title="¿Eliminar definitivamente este torneo?"
          confirmWord={permanent.name}
          confirmLabel="Eliminar definitivamente"
          onClose={() => setPermanent(null)}
          onConfirm={async () => {
            const res = await fetch(`/api/tournaments/${permanent.id}?permanent=1`, { method: "DELETE" });
            if (!res.ok) return ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo eliminar el torneo";
            setPermanent(null);
            setNotice({ ok: true, text: `Se eliminó definitivamente "${permanent.name}".` });
            onChanged();
            return null;
          }}
        >
          <p>
            <strong className="text-text-primary">{permanent.name}</strong> tiene {permanent.teamsCount} {permanent.teamsCount === 1 ? "equipo inscrito" : "equipos inscritos"} y {permanent.matchesCount}{" "}
            {permanent.matchesCount === 1 ? "partido" : "partidos"}.
          </p>
          <p>Se borran del todo sus inscripciones, solicitudes, partidos, resultados y estadísticas. Los equipos y sus jugadores no se tocan. No se puede deshacer ni restaurar.</p>
        </ConfirmDelete>
      )}
    </div>
  );
}
