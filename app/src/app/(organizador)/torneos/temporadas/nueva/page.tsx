"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createSeason, getTournaments, type TournamentListItem } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { useAuth } from "@/lib/auth-context";
import { FINAL_FORMATS, FINAL_FORMAT_LABEL, finalTeamsOptions, type FinalFormat } from "@/_lib/season";
import { BackHeader } from "@/_components/back-header";
import { btnOutline, btnSolid } from "@/_components/button-styles";
import { chipClass, fieldClass, labelClass } from "../_components/season-ui";

const FINAL_FORMAT_HELP: Record<FinalFormat, string> = {
  llaves: "Eliminación directa entre los mejores de la General: el 1.º contra el último, el 2.º contra el penúltimo...",
  liguilla: "Todos contra todos entre los mejores de la General; gana el de más puntos.",
  ninguna: "Gana la temporada quien termine primero en la tabla General.",
};

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
  const maxTeams = apertura ? Math.max(apertura.maxTeams ?? 0, apertura.teamsCount) : 0;
  const options = finalTeamsOptions(finalFormat, maxTeams);
  // Si cambia la Apertura o el tipo de fase final, una cantidad que ya no vale se descarta.
  const teams = finalTeams !== null && options.includes(finalTeams) ? finalTeams : null;
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

          <fieldset>
            <legend className={labelClass}>Fase final</legend>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="Tipo de fase final">
              {FINAL_FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={finalFormat === f}
                  aria-label={`${FINAL_FORMAT_LABEL[f]}. ${FINAL_FORMAT_HELP[f]}`}
                  onClick={() => setFinalFormat(f)}
                  className={`flex cursor-pointer items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary ${
                    finalFormat === f ? "border-text-primary bg-btn-regular" : "border-border-primary hover:bg-btn-regular"
                  }`}
                >
                  <span>
                    <span className="block font-heading text-sm font-bold text-text-primary">{FINAL_FORMAT_LABEL[f]}</span>
                    <span className="block font-body text-xs text-text-secondary">{FINAL_FORMAT_HELP[f]}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 ${finalFormat === f ? "border-text-primary bg-text-primary" : "border-border-primary"}`}
                  />
                </button>
              ))}
            </div>
          </fieldset>

          {needsTeams && (
            <fieldset>
              <legend className={labelClass}>Equipos que clasifican de la General</legend>
              {!apertura ? (
                <p className="font-body text-sm text-text-secondary">Elige primero la Apertura.</p>
              ) : options.length === 0 ? (
                <p className="font-body text-sm text-text-secondary">
                  La Apertura no tiene equipos suficientes para {finalFormat === "llaves" ? "unas llaves" : "una liguilla"}.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Equipos que clasifican">
                    {options.map((n) => (
                      <button key={n} type="button" role="radio" aria-checked={teams === n} onClick={() => setFinalTeams(n)} className={chipClass(teams === n)}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 font-body text-xs text-text-secondary">
                    {finalFormat === "llaves" ? "Las llaves necesitan un cuadro parejo: 2, 4, 8 o 16." : "Desde 3 hasta el total de equipos."}
                  </p>
                </>
              )}
            </fieldset>
          )}

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
