import { formatFromCompetitionLabel } from "@/_lib/tournament-labels";
import { locationFromSede } from "./tournament-to-wizard";
import type { WizardState } from "./wizard-context";

/** Lo que falta completar para poder guardar el torneo (null si está todo). */
export function wizardMissing(state: WizardState): string | null {
  const missing = [
    !state.nombre.trim() && "nombre",
    !state.fecha && "fecha de inicio",
    !state.sede && "sede",
    !state.modalidad && "modalidad",
    !state.tipoCompetencia && "tipo de competencia",
    state.cantidadEquipos < 2 && "cantidad de equipos (mínimo 2)",
  ].filter(Boolean);
  return missing.length > 0 ? `Falta completar: ${missing.join(", ")}.` : null;
}

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Crea el torneo (sin `tournamentId`) o guarda los cambios de uno existente con todo lo que hay en
 * el asistente. La usan los tres pasos al crear y las tres pestañas al editar: guardar desde
 * cualquiera guarda todo.
 */
export async function saveWizardTournament(state: WizardState, tournamentId: string | null): Promise<SaveResult> {
  const editing = tournamentId !== null;
  const missing = wizardMissing(state);
  if (missing) return { ok: false, error: `${missing} ${editing ? "Revisa las otras pestañas." : "Vuelve a los pasos anteriores."}` };

  const format = formatFromCompetitionLabel(state.tipoCompetencia);
  // El tiempo extra y los penales solo existen en un cuadro de eliminación (especificación 007).
  // Una liga con llaves también termina en un cuadro de eliminación: ahí también hay tiempo extra.
  const ligaConLlaves = format === "liga" && state.llaves > 0;
  const esEliminatorio = format === "eliminacion" || format === "relampago" || format === "copa" || ligaConLlaves;

  try {
    const res = await fetch(editing ? `/api/tournaments/${tournamentId}` : "/api/tournaments", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: state.nombre.trim(),
        startDate: state.fecha,
        location: locationFromSede(state.sede!),
        format,
        maxTeams: state.cantidadEquipos,
        modality: state.modalidad,
        gender: state.genero || null,
        category: state.categoria || null,
        // 0 en el formulario significa "sin definir".
        minutesPerHalf: state.minutos > 0 ? state.minutos : null,
        playersPerTeam: state.jugadores > 0 ? state.jugadores : null,
        assignDelegates: state.delegado,
        registrationFee: state.costoInscripcion.trim() || null,
        refereeFee: state.costoArbitraje.trim() || null,
        rules: state.condiciones,
        // Solo tienen efecto en un cuadro de eliminación (eliminacion/relampago/copa).
        extraTimeMinutes: esEliminatorio && state.tiempoExtra > 0 ? state.tiempoExtra : null,
        groupsAdvancePerGroup: format === "copa" ? state.clasificanPorGrupo : null,
        playoffTeams: ligaConLlaves ? state.llaves : null,
        // Un torneo recién creado queda abierto para inscribir equipos. Al editar no se toca el estado.
        ...(editing ? {} : { status: "inscripcion" }),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error ?? (editing ? "No se pudo guardar el torneo" : "No se pudo crear el torneo") };
    return { ok: true, id: editing ? tournamentId : data.id };
  } catch {
    return { ok: false, error: "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo." };
  }
}
