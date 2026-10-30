// Editar los cruces de un fixture ya armado (especificación 017): cambiar un equipo de un partido y mover un partido a
// otra fecha. Lógica pura y sin dependencias: la usan la pantalla (el borrador), la API (la validación) y las pruebas.
//
// La regla de fondo: en cada fecha, cada equipo juega una sola vez (y con equipos impares descansa uno, que es el que
// no juega). Las dos operaciones son **intercambios**, así que nunca cambian la cantidad de partidos de una fecha.

/** Un partido de liga o de grupos tal como lo ve el editor. `date` es `YYYY-MM-DD`; `time` vacío = por definir. */
export interface EditableMatch {
  id: string;
  matchday: number;
  groupName: string | null;
  homeTeamId: string;
  awayTeamId: string;
  date: string;
  time: string;
  location: string;
  /** No se puede tocar: ya empezó, o tiene jugadas. Cuenta para validar, pero no se mueve ni se le cambian los equipos. */
  locked: boolean;
}

export type EditResult = { ok: true; matches: EditableMatch[] } | { ok: false; error: string };

const groupKey = (groupName: string | null) => groupName ?? "";

/** Los equipos de cada grupo (en una liga hay un solo grupo, `""`), sacados de los partidos. */
export function teamsByGroup(matches: readonly EditableMatch[]): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const m of matches) {
    const key = groupKey(m.groupName);
    const set = out.get(key) ?? new Set<string>();
    set.add(m.homeTeamId);
    set.add(m.awayTeamId);
    out.set(key, set);
  }
  return out;
}

/** Los partidos de una fecha de un grupo. */
function inFecha(matches: readonly EditableMatch[], matchday: number, groupName: string | null) {
  return matches.filter((m) => m.matchday === matchday && groupKey(m.groupName) === groupKey(groupName));
}

/** Los equipos del grupo que no juegan en esa fecha: descansan. */
export function restingTeams(matches: readonly EditableMatch[], teams: ReadonlySet<string>, matchday: number, groupName: string | null): string[] {
  const playing = new Set<string>();
  for (const m of inFecha(matches, matchday, groupName)) {
    playing.add(m.homeTeamId);
    playing.add(m.awayTeamId);
  }
  return [...teams].filter((t) => !playing.has(t));
}

/**
 * Cambia un equipo de un partido por otro y **reacomoda** el resto de la fecha para que nadie quede dos veces:
 * - si el equipo que entra juega en otro partido de la misma fecha, ese partido recibe al que salió (un intercambio);
 * - si es el rival del mismo partido, solo se invierten local y visitante;
 * - si descansa esa fecha, pasa a descansar el que salió.
 * Cada partido conserva su día, hora y sede.
 */
export function changeTeam(matches: readonly EditableMatch[], matchId: string, side: "home" | "away", newTeamId: string): EditResult {
  const target = matches.find((m) => m.id === matchId);
  if (!target) return { ok: false, error: "El partido no existe." };
  if (target.locked) return { ok: false, error: "Ese partido ya empezó: no se puede editar." };
  const universe = teamsByGroup(matches).get(groupKey(target.groupName));
  if (!universe?.has(newTeamId)) return { ok: false, error: "Ese equipo no juega en este grupo." };

  const key = side === "home" ? "homeTeamId" : "awayTeamId";
  const otherKey = side === "home" ? "awayTeamId" : "homeTeamId";
  const leaving = target[key];
  if (leaving === newTeamId) return { ok: true, matches: [...matches] };

  // Es el rival del mismo partido: se invierten los lados.
  if (target[otherKey] === newTeamId) {
    return { ok: true, matches: matches.map((m) => (m.id === matchId ? { ...m, [key]: newTeamId, [otherKey]: leaving } : m)) };
  }

  // Juega en otro partido de esta fecha: ese partido recibe al que sale.
  const other = inFecha(matches, target.matchday, target.groupName).find((m) => m.id !== matchId && (m.homeTeamId === newTeamId || m.awayTeamId === newTeamId));
  if (other?.locked) return { ok: false, error: "El partido de ese equipo en esta fecha ya empezó: no se puede cambiar." };

  return {
    ok: true,
    matches: matches.map((m) => {
      if (m.id === matchId) return { ...m, [key]: newTeamId };
      if (other && m.id === other.id) {
        return m.homeTeamId === newTeamId ? { ...m, homeTeamId: leaving } : { ...m, awayTeamId: leaving };
      }
      return m;
    }),
  };
}

/**
 * Intercambia dos partidos de fechas distintas: cada uno pasa a la fecha del otro **y toma su día, hora y sede**, así el
 * calendario real no se mueve y la cantidad de partidos por fecha queda igual. Tienen que ser del mismo grupo.
 * Después de mover, algún equipo puede quedar dos veces en una fecha: `findProblems` lo marca y se arregla cambiando equipos.
 */
export function swapMatchdays(matches: readonly EditableMatch[], idA: string, idB: string): EditResult {
  const a = matches.find((m) => m.id === idA);
  const b = matches.find((m) => m.id === idB);
  if (!a || !b || a.id === b.id) return { ok: false, error: "Elige dos partidos distintos." };
  if (a.locked || b.locked) return { ok: false, error: "Uno de los partidos ya empezó: no se puede mover." };
  if (a.matchday === b.matchday) return { ok: false, error: "Los dos partidos ya están en la misma fecha." };
  if (groupKey(a.groupName) !== groupKey(b.groupName)) return { ok: false, error: "Solo se pueden intercambiar partidos del mismo grupo." };

  const slot = (m: EditableMatch) => ({ matchday: m.matchday, date: m.date, time: m.time, location: m.location });
  return {
    ok: true,
    matches: matches.map((m) => (m.id === a.id ? { ...m, ...slot(b) } : m.id === b.id ? { ...m, ...slot(a) } : m)),
  };
}

export type Problem =
  | { kind: "twice"; matchday: number; groupName: string | null; teamId: string; matchIds: string[] }
  | { kind: "repeated"; groupName: string | null; teamIds: [string, string]; matchIds: string[] };

/**
 * Lo que impide guardar y lo que solo hay que mirar.
 * - `twice` (impide guardar): un equipo juega dos veces en una misma fecha.
 * - `repeated` (solo aviso): los mismos dos equipos se enfrentan más de una vez en el grupo (en una liga de una vuelta
 *   es casi seguro un error, pero quien arma el fixture manda).
 */
export function findProblems(matches: readonly EditableMatch[]): Problem[] {
  const problems: Problem[] = [];

  const perFecha = new Map<string, Map<string, string[]>>();
  for (const m of matches) {
    const fechaKey = `${groupKey(m.groupName)}|${m.matchday}`;
    const teams = perFecha.get(fechaKey) ?? new Map<string, string[]>();
    for (const t of [m.homeTeamId, m.awayTeamId]) teams.set(t, [...(teams.get(t) ?? []), m.id]);
    perFecha.set(fechaKey, teams);
  }
  for (const [fechaKey, teams] of perFecha) {
    const [group, day] = fechaKey.split("|");
    for (const [teamId, ids] of teams) {
      if (ids.length > 1) problems.push({ kind: "twice", matchday: Number(day), groupName: group === "" ? null : group, teamId, matchIds: [...new Set(ids)] });
    }
  }

  const pairs = new Map<string, EditableMatch[]>();
  for (const m of matches) {
    const key = `${groupKey(m.groupName)}|${[m.homeTeamId, m.awayTeamId].sort().join("|")}`;
    pairs.set(key, [...(pairs.get(key) ?? []), m]);
  }
  for (const list of pairs.values()) {
    if (list.length > 1) {
      const sorted = [list[0].homeTeamId, list[0].awayTeamId].sort() as [string, string];
      problems.push({ kind: "repeated", groupName: list[0].groupName, teamIds: sorted, matchIds: list.map((m) => m.id) });
    }
  }
  return problems;
}

/** ¿Se puede guardar? Solo si nadie juega dos veces en una fecha. */
export const canSave = (matches: readonly EditableMatch[]) => !findProblems(matches).some((p) => p.kind === "twice");

/** Los partidos que cambiaron respecto del original (fecha, equipos, día, hora o sede). */
export function changedMatches(original: readonly EditableMatch[], draft: readonly EditableMatch[]): EditableMatch[] {
  const before = new Map(original.map((m) => [m.id, m]));
  return draft.filter((m) => {
    const o = before.get(m.id);
    return !o || o.matchday !== m.matchday || o.homeTeamId !== m.homeTeamId || o.awayTeamId !== m.awayTeamId || o.date !== m.date || o.time !== m.time || o.location !== m.location;
  });
}

/** Choques de horario: dos partidos el mismo día y hora (con hora definida) con un mismo equipo o en la misma sede. */
export function scheduleClashes(matches: readonly EditableMatch[]): [string, string][] {
  const clashes: [string, string][] = [];
  for (let i = 0; i < matches.length; i++) {
    for (let j = i + 1; j < matches.length; j++) {
      const a = matches[i];
      const b = matches[j];
      if (a.time === "" || a.time !== b.time || a.date !== b.date) continue;
      const sharedTeam = [a.homeTeamId, a.awayTeamId].some((t) => t === b.homeTeamId || t === b.awayTeamId);
      const sharedPlace = a.location !== "" && a.location === b.location;
      if (sharedTeam || sharedPlace) clashes.push([a.id, b.id]);
    }
  }
  return clashes;
}

/**
 * La validación completa que hace la API antes de guardar: compara lo que se envía con lo que hay.
 * Devuelve el primer motivo para rechazar, o null si se puede guardar.
 */
export function validateFixtureEdit(original: readonly EditableMatch[], edited: readonly EditableMatch[]): string | null {
  if (original.length !== edited.length || !edited.every((e) => original.some((o) => o.id === e.id))) {
    return "Los partidos enviados no son los del fixture.";
  }
  const before = new Map(original.map((m) => [m.id, m]));
  const universe = teamsByGroup(original);

  for (const e of edited) {
    const o = before.get(e.id)!;
    if (e.homeTeamId === e.awayTeamId) return "Un partido no puede tener el mismo equipo de local y de visitante.";
    if (e.groupName !== o.groupName) return "No se puede cambiar el grupo de un partido.";
    const teams = universe.get(groupKey(e.groupName))!;
    if (!teams.has(e.homeTeamId) || !teams.has(e.awayTeamId)) return "Hay un equipo que no juega en este grupo.";
    if (o.locked && (e.matchday !== o.matchday || e.homeTeamId !== o.homeTeamId || e.awayTeamId !== o.awayTeamId || e.date !== o.date || e.time !== o.time || e.location !== o.location)) {
      return "Un partido que ya empezó no se puede editar.";
    }
  }

  // La cantidad de partidos de cada fecha no cambia.
  const count = (list: readonly EditableMatch[]) => {
    const counts = new Map<string, number>();
    for (const m of list) {
      const key = `${groupKey(m.groupName)}|${m.matchday}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  };
  const countBefore = count(original);
  const countAfter = count(edited);
  for (const key of new Set([...countBefore.keys(), ...countAfter.keys()])) {
    if ((countBefore.get(key) ?? 0) !== (countAfter.get(key) ?? 0)) return "La cantidad de partidos de una fecha no puede cambiar.";
  }

  const twice = findProblems(edited).find((p) => p.kind === "twice");
  if (twice) return `Un equipo juega dos veces en la fecha ${twice.matchday}.`;
  if (scheduleClashes(edited).length > 0) return "Dos partidos chocan en día y hora (mismo equipo o misma sede).";
  return null;
}
