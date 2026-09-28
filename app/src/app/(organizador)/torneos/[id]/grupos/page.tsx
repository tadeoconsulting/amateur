"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { BackHeader } from "@/_components/back-header";
import { Toast } from "@/_components/toast";
import { Spinner } from "@/_components/spinner";
import { btnSolid } from "@/_components/button-styles";
import { getTournament } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";

/**
 * Asigna el grupo de cada equipo inscrito — lo pide el formato "grupos" (y la fase de grupos
 * de "copa") antes de poder armar el fixture: `planFixture` no arma nada si a algún equipo le
 * falta grupo (ver /torneos/:id/iniciar, que hasta ahora solo mostraba ese error sin dar forma
 * de resolverlo).
 */
export default function AsignarGruposPage() {
  const params = useParams<{ id: string }>();
  const { data: tournament, loading, refetch } = useApi(() => getTournament(params.id));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  if (loading || !tournament) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const existingGroups = [...new Set(tournament.teams.map((t) => t.groupName).filter(Boolean))].sort() as string[];

  const valueFor = (clubId: string, current: string | null) => drafts[clubId] ?? current ?? "";

  const save = async (clubId: string) => {
    const value = drafts[clubId];
    if (value === undefined) return;
    setSavingId(clubId);
    const res = await fetch(`/api/tournaments/${params.id}/teams/${clubId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupName: value.trim() || null }),
    });
    setSavingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setToast({ message: data.error ?? "No se pudo guardar el grupo", tone: "error" });
      return;
    }
    setDrafts((d) => {
      const next = { ...d };
      delete next[clubId];
      return next;
    });
    setToast({ message: "Grupo actualizado.", tone: "success" });
    refetch();
  };

  return (
    <div className="w-full pb-8">
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
      <BackHeader />

      <div className="px-4">
        <h1 className="font-heading text-xl font-bold text-text-primary">Asignar grupos</h1>
        <p className="mt-1 font-body text-sm text-text-secondary">
          {tournament.name}: cada equipo necesita un grupo antes de armar el fixture. Escribe el mismo nombre
          (por ejemplo &quot;A&quot;) para los equipos que compartan grupo.
        </p>

        {existingGroups.length > 0 && (
          <p className="mt-3 font-body text-xs text-text-secondary">
            Grupos ya usados: {existingGroups.join(", ")}
          </p>
        )}

        <div className="mt-5 flex flex-col">
          {tournament.teams.map((team) => (
            <div key={team.id} className="flex items-center gap-3 border-b border-brand-200 py-3.5 last:border-0">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-heading text-xs font-bold text-white"
                style={{ backgroundColor: team.club.color ?? "var(--color-brand-500)" }}
              >
                {team.club.shortName.slice(0, 3).toUpperCase()}
              </div>
              <p className="min-w-0 flex-1 truncate font-heading text-sm font-bold text-text-primary">{team.club.name}</p>
              <input
                value={valueFor(team.club.id, team.groupName)}
                onChange={(e) => setDrafts((d) => ({ ...d, [team.club.id]: e.target.value }))}
                placeholder="Sin grupo"
                list="grupos-existentes"
                className="w-24 shrink-0 rounded-lg border border-border-primary bg-surface-primary px-2.5 py-2 text-center font-body text-sm text-text-primary outline-none focus:border-brand-500"
              />
              <button
                onClick={() => save(team.club.id)}
                disabled={drafts[team.club.id] === undefined || savingId === team.club.id}
                className="shrink-0 cursor-pointer font-heading text-xs font-bold text-text-primary underline disabled:cursor-not-allowed disabled:text-text-secondary disabled:no-underline"
              >
                {savingId === team.club.id ? "..." : "Guardar"}
              </button>
            </div>
          ))}
          {tournament.teams.length === 0 && (
            <p className="py-12 text-center font-body text-sm text-text-secondary">
              Todavía no hay equipos inscritos.
            </p>
          )}
        </div>

        <datalist id="grupos-existentes">
          {existingGroups.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>

        <Link href={`/torneos/${params.id}/iniciar`} className={`${btnSolid} mt-6 block text-center`}>
          Volver a iniciar torneo
        </Link>
      </div>
    </div>
  );
}
