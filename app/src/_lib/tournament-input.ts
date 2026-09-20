import { FORMATS, GENDERS, MODALITIES, TOURNAMENT_STATUSES } from "./tournament-labels";
import { isRealDate } from "./fixture";

type Fields = Record<string, unknown>;
export type TournamentInput = { data: Fields } | { error: string };

const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

const isText = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.trim().length <= max;

function toDate(v: unknown): Date | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  // "2026-02-31" no existe, pero Date lo convierte en silencio en el 3 de marzo.
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isRealDate(v)) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Valida y normaliza los campos de un torneo que vienen del cliente.
 * Solo devuelve campos conocidos (nada de organizerId, id, etc.).
 *
 * - `create`: exige name, format, maxTeams, startDate y location.
 * - `update`: valida solo los campos que llegan.
 */
export function parseTournamentFields(body: Fields, mode: "create" | "update"): TournamentInput {
  const data: Fields = {};
  const has = (key: string) => body[key] !== undefined;

  if (mode === "create") {
    for (const key of ["name", "format", "maxTeams", "startDate", "location"]) {
      if (!has(key)) return { error: `Falta el campo ${key}` };
    }
  }

  if (has("name")) {
    if (!isText(body.name, 120)) return { error: "name debe tener entre 1 y 120 caracteres" };
    data.name = (body.name as string).trim();
  }
  if (has("format")) {
    if (typeof body.format !== "string" || !FORMATS.includes(body.format)) return { error: "format no es válido" };
    data.format = body.format;
  }
  if (has("status")) {
    if (!(TOURNAMENT_STATUSES as readonly unknown[]).includes(body.status)) return { error: "status no es válido" };
    data.status = body.status;
  }
  if (has("sportType")) {
    if (!isText(body.sportType, 30)) return { error: "sportType no es válido" };
    data.sportType = (body.sportType as string).trim();
  }
  if (has("maxTeams")) {
    if (!isInt(body.maxTeams, 2, 256)) return { error: "maxTeams debe ser un entero entre 2 y 256" };
    data.maxTeams = body.maxTeams;
  }
  if (has("minTeams")) {
    if (body.minTeams !== null && !isInt(body.minTeams, 2, 256)) return { error: "minTeams debe ser un entero entre 2 y 256" };
    data.minTeams = body.minTeams;
  }
  if (typeof data.maxTeams === "number" && typeof data.minTeams === "number" && data.minTeams > data.maxTeams) {
    return { error: "minTeams no puede superar a maxTeams" };
  }

  if (has("startDate")) {
    const date = toDate(body.startDate);
    if (!date) return { error: "startDate no es una fecha válida" };
    data.startDate = date;
  }
  if (has("endDate")) {
    if (body.endDate === null) {
      data.endDate = null;
    } else {
      const date = toDate(body.endDate);
      if (!date) return { error: "endDate no es una fecha válida" };
      data.endDate = date;
    }
  }
  if (data.startDate instanceof Date && data.endDate instanceof Date && data.endDate < data.startDate) {
    return { error: "endDate no puede ser anterior a startDate" };
  }

  if (has("location")) {
    if (!isText(body.location, 200)) return { error: "location debe tener entre 1 y 200 caracteres" };
    data.location = (body.location as string).trim();
  }
  if (has("category")) {
    if (body.category !== null && !isText(body.category, 60)) return { error: "category no es válida" };
    data.category = body.category === null ? null : (body.category as string).trim();
  }

  if (has("modality")) {
    if (body.modality !== null && !(MODALITIES as readonly unknown[]).includes(body.modality)) {
      return { error: "modality no es válida" };
    }
    data.modality = body.modality;
  }
  if (has("gender")) {
    if (body.gender !== null && !(GENDERS as readonly unknown[]).includes(body.gender)) {
      return { error: "gender no es válido" };
    }
    data.gender = body.gender;
  }
  if (has("minutesPerHalf")) {
    if (body.minutesPerHalf !== null && !isInt(body.minutesPerHalf, 1, 90)) {
      return { error: "minutesPerHalf debe ser un entero entre 1 y 90" };
    }
    data.minutesPerHalf = body.minutesPerHalf;
  }
  if (has("playersPerTeam")) {
    if (body.playersPerTeam !== null && !isInt(body.playersPerTeam, 1, 50)) {
      return { error: "playersPerTeam debe ser un entero entre 1 y 50" };
    }
    data.playersPerTeam = body.playersPerTeam;
  }
  if (has("assignDelegates")) {
    if (typeof body.assignDelegates !== "boolean") return { error: "assignDelegates debe ser verdadero o falso" };
    data.assignDelegates = body.assignDelegates;
  }
  for (const key of ["registrationFee", "refereeFee"] as const) {
    if (has(key)) {
      if (body[key] !== null && !isText(body[key], 60)) return { error: `${key} no es válido` };
      data[key] = body[key] === null ? null : (body[key] as string).trim();
    }
  }
  if (has("rules")) {
    const rules = body.rules;
    if (!Array.isArray(rules) || rules.length > 50 || !rules.every((r) => isText(r, 500))) {
      return { error: "rules debe ser una lista de hasta 50 textos de máximo 500 caracteres" };
    }
    data.rules = rules.map((r) => (r as string).trim());
  }

  if (mode === "update" && Object.keys(data).length === 0) {
    return { error: "No hay campos para actualizar" };
  }
  return { data };
}
