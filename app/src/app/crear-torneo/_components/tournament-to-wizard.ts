import { COMPETITION_TYPES } from "@/_lib/tournament-labels";
import type { TournamentDetail } from "@/_lib/api";
import type { Sede } from "./crear-sede-modal";
import type { WizardState } from "./wizard-context";

// La sede se guarda en el torneo como un solo texto: "Nombre, dirección".
export function locationFromSede(sede: Sede) {
  return sede.direccion ? `${sede.nombre}, ${sede.direccion}` : sede.nombre;
}

export function sedeFromLocation(location: string): Sede {
  const i = location.indexOf(", ");
  if (i === -1) return { nombre: location, direccion: "", referencia: "" };
  return { nombre: location.slice(0, i), direccion: location.slice(i + 2), referencia: "" };
}

/** Lo que ya se registró del torneo, con la forma que usa el asistente. */
export function wizardStateFromTournament(t: TournamentDetail): WizardState {
  const sede = sedeFromLocation(t.location);
  return {
    nombre: t.name,
    fecha: t.startDate.slice(0, 10),
    sede,
    sedes: [sede],
    modalidad: t.modality ?? "",
    // Un formato antiguo que el asistente ya no ofrece ("grupos") queda sin elegir.
    tipoCompetencia: COMPETITION_TYPES.find((c) => c.format === t.format)?.label ?? "",
    genero: t.gender ?? "",
    categoria: t.category ?? "",
    cantidadEquipos: t.maxTeams ?? 0,
    minutos: t.minutesPerHalf ?? 0,
    jugadores: t.playersPerTeam ?? 0,
    delegado: t.assignDelegates,
    costoInscripcion: t.registrationFee ?? "",
    costoArbitraje: t.refereeFee ?? "",
    condiciones: t.rules,
    tiempoExtra: t.extraTimeMinutes ?? 0,
    clasificanPorGrupo: t.groupsAdvancePerGroup ?? 2,
  };
}
