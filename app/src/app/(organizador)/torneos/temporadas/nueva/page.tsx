"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createSeason, getTournaments, type TournamentListItem } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { useAuth } from "@/lib/auth-context";
import type { FinalFormat } from "@/_lib/season";
import { BackHeader } from "@/_components/back-header";
import { btnOutline, btnSolid } from "@/_components/button-styles";
import { fieldClass, labelClass } from "../_components/season-ui";
import { FinalPhaseFields, validFinalTeams } from "../_components/final-phase-fields";

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );
}

/**
 * Crear una temporada (especificación 012): nombre, la liga que será la Apertura, el tipo de fase final y
 * cuántos clasifican. `?apertura=<id>` llega desde "Crear temporada con este torneo".
 */
export default function NuevaTemporadaPage() {
  const { user, loading } = useAuth();
  if (loading || !user) return <Spinner />;
  return (
    <Suspense fallback={<Spinner />}>
      <NuevaTemporada organizerId={user.id} />
    </Suspense>
  );
}

function NuevaTemporada({ organizerId }: { organizerId: string }) {
  const router = useRouter();
  const preselected = useSearchParams().get("apertura");
  const { data: tournaments, loading } = useApi(() => getTournaments({ organizerId }));

  const [name, setName] = useState("");
  const [aperturaId, setAperturaId] = useState<string | null>(preselected);
  const [finalFormat, setFinalFormat] = useState<FinalFormat>("llaves");
  const [finalTeams, setFinalTeams] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (loading || !tournaments) return <Spinner />;

  // Solo una liga que no esté ya en otra temporada puede ser la Apertura (decisión F: en cualquier estado).
  const ligas = tournaments.filter((t) => t.format === "liga" && !t.seasonId);
  const apertura: TournamentListItem | undefined = ligas.find((t) => t.id === aperturaId);
  const maxTeams = apertura ? Math.max(apertura.maxTeams ?? 0, apertura.teamsCount) : null;
  // Si cambia la Apertura o el tipo de fase final, una cantidad que ya no vale se descarta.
  const teams = validFinalTeams(finalFormat, finalTeams, maxTeams);
  const needsTeams = finalFormat !== "ninguna";
  const canSave = name.trim().length > 0 && apertura !== undefined && (!needsTeams || teams !== null) && !saving;

  async function save() {
    if (!canSave || !apertura) return;
    setSaving(true);
    setError("");
    const result = await createSeason({ name: name.trim(), aperturaId: apertura.id, finalFormat, finalTeams: needsTeams ? teams : null });
    if (!result.ok) {
      setSaving(false);
      setError(result.error ?? "No se pudo crear la temporada");
      return;
    }
    router.replace(`/torneos/temporadas/${result.data.id}`);
  }

  return (
    <div className="w-full pb-10 md:mx-auto md:max-w-xl">
      <BackHeader onBack={() => router.push("/torneos?tab=temporadas")} label="Temporadas" />
      <div className="px-4">
        <h1 className="mb-1 font-heading text-xl font-bold text-text-primary">Crear temporada</h1>
        <p className="mb-6 font-body text-sm text-text-secondary">
          La Apertura define los equipos de toda la temporada. Cuando termine, creas el Clausura con los mismos equipos, y con los dos
          se arma la tabla General.
        </p>

        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div>
            <label htmlFor="season-name" className={labelClass}>
              Nombre de la temporada
            </label>
            <input id="season-name" type="text" maxLength={120} placeholder="Ej.: Temporada 2026" value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
          </div>

          <fieldset>
            <legend className={labelClass}>Apertura</legend>
            {ligas.length === 0 ? (
              <div className="rounded-xl border border-border-primary p-4">
                <p className="font-body text-sm text-text-secondary">
                  Necesitas una liga que no esté en otra temporada. Crea una liga y vuelve acá.
                </p>
                <Link href="/crear-torneo" className={`${btnOutline} mt-3 w-full`}>
                  Crear torneo
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Liga que será la Apertura">
                {ligas.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={aperturaId === t.id}
                    aria-label={`${t.name}, ${t.teamsCount} de ${t.maxTeams ?? "?"} equipos`}
                    onClick={() => setAperturaId(t.id)}
                    className={`flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary ${
                      aperturaId === t.id ? "border-text-primary bg-btn-regular" : "border-border-primary hover:bg-btn-regular"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-heading text-sm font-bold text-text-primary">{t.name}</span>
                      <span className="block font-body text-xs text-text-secondary">
                        {t.teamsCount}/{t.maxTeams ?? "?"} equipos
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`h-5 w-5 shrink-0 rounded-full border-2 ${aperturaId === t.id ? "border-text-primary bg-text-primary" : "border-border-primary"}`}
                    />
                  </button>
                ))}
              </div>
            )}
          </fieldset>

          <FinalPhaseFields finalFormat={finalFormat} onFormatChange={setFinalFormat} teams={teams} onTeamsChange={setFinalTeams} maxTeams={maxTeams} />

          {error && (
            <p role="alert" className="font-body text-sm text-red-600">
              {error}
            </p>
          )}

          <button type="submit" disabled={!canSave} className={`${btnSolid} w-full`}>
            {saving ? "Creando..." : "Crear temporada"}
          </button>
        </form>
      </div>
    </div>
  );
}
