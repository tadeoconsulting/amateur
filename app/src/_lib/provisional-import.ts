// Carga de jugadores provisionales desde un archivo JSON (especificación 009): valida las filas, busca el
// club de cada una entre los equipos del torneo y decide qué se crea, qué ya estaba cargado y qué tiene
// problemas. Pura y sin dependencias: la usa el script `prisma/cargar-jugadores.ts` y las pruebas.
//
// Regla de oro: si hay algún problema, no se guarda nada (el script se niega a aplicar), para que quien
// carga corrija el archivo y no queden equipos a medias.

export type RawRow = { nombres?: unknown; apellidos?: unknown; club?: unknown; dni?: unknown; fechaNacimiento?: unknown };
export type ClubRef = { id: string; name: string; shortName: string };

export type NewProvisional = {
  /** Número de fila en el archivo (empieza en 1), para avisar dónde está el problema. */
  row: number;
  firstName: string;
  lastName: string;
  dni: string;
  /** YYYY-MM-DD */
  birthDate: string;
  clubId: string;
  clubName: string;
};

export type Problem = { row: number; name: string; dni: string | null; reason: string };

export type ImportPlan = {
  create: NewProvisional[];
  /** Ya cargados en ese mismo equipo: correr el script dos veces no duplica. */
  alreadyLoaded: NewProvisional[];
  problems: Problem[];
};

/** Sin tildes, en minúsculas y con los espacios normalizados: "  Lgk " y "LGK" son el mismo club. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Quita espacios de más sin tocar mayúsculas, tildes ni eñes ("Núñez  Peña " → "Núñez Peña"). */
export function cleanName(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/** El DNI (8 dígitos) como texto, o null si no lo es. Acepta el número o el texto. */
export function parseDni(value: unknown): string | null {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  return /^\d{8}$/.test(text) ? text : null;
}

/** YYYY-MM-DD de un día que existe, pasado y razonable; null si no. Acepta YYYY-MM-DD o DD/MM/AAAA. */
export function parseBirthDate(value: unknown, today: string): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  let iso: string | null = null;
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const b = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (a) iso = text;
  else if (b) iso = `${b[3]}-${b[2].padStart(2, "0")}-${b[1].padStart(2, "0")}`;
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) return null; // 2026-02-31 no existe
  if (iso < "1900-01-01" || iso > today) return null;
  return iso;
}

/** El club de una fila entre los del torneo, por nombre o abreviatura. */
export function matchClub(value: unknown, clubs: ClubRef[]): { club: ClubRef } | { error: "falta" | "no_coincide" | "ambiguo" } {
  const wanted = typeof value === "string" ? normalizeText(value) : "";
  if (!wanted) return { error: "falta" };
  const found = clubs.filter((c) => normalizeText(c.name) === wanted || normalizeText(c.shortName) === wanted);
  if (found.length === 1) return { club: found[0] };
  return { error: found.length === 0 ? "no_coincide" : "ambiguo" };
}

export function planImport(input: {
  rows: RawRow[];
  /** Club para las filas que no traen el suyo (el `equipo` del archivo). */
  defaultClub?: string;
  clubs: ClubRef[];
  /** DNI → equipo, de los provisionales que ya están cargados. */
  existingProvisional: Map<string, string>;
  /** DNI de cuentas que ya existen (se vinculan, no se duplican como provisionales). */
  accountDnis: Set<string>;
  /** YYYY-MM-DD de hoy (parámetro para poder probar). */
  today: string;
}): ImportPlan {
  const { rows, clubs, existingProvisional, accountDnis, today } = input;
  const plan: ImportPlan = { create: [], alreadyLoaded: [], problems: [] };

  // Un DNI repetido dentro del archivo es ambiguo (¿cuál es el bueno?): se marcan todas sus filas.
  const counts = new Map<string, number>();
  for (const r of rows) {
    const dni = parseDni(r.dni);
    if (dni) counts.set(dni, (counts.get(dni) ?? 0) + 1);
  }

  rows.forEach((r, i) => {
    const row = i + 1;
    const firstName = cleanName(r.nombres);
    const lastName = cleanName(r.apellidos);
    const dni = parseDni(r.dni);
    const name = `${firstName} ${lastName}`.trim() || "(sin nombre)";
    const fail = (reason: string) => plan.problems.push({ row, name, dni, reason });

    if (!firstName) return fail("Falta el nombre (nombres)");
    if (!lastName) return fail("Faltan los apellidos");
    if (!dni) return fail("El DNI debe tener 8 dígitos");
    const birthDate = parseBirthDate(r.fechaNacimiento, today);
    if (!birthDate) return fail("La fecha de nacimiento no es válida (usa AAAA-MM-DD)");

    const matched = matchClub(r.club ?? input.defaultClub, clubs);
    if ("error" in matched) {
      return fail(
        matched.error === "falta"
          ? "Falta el club"
          : matched.error === "ambiguo"
            ? `El club "${String(r.club ?? input.defaultClub)}" coincide con más de un equipo del torneo`
            : `El club "${String(r.club ?? input.defaultClub)}" no es un equipo de este torneo`
      );
    }

    if ((counts.get(dni) ?? 0) > 1) return fail("DNI repetido en el archivo");
    if (accountDnis.has(dni)) return fail("Ya existe una cuenta con este DNI: vincúlala en vez de cargarlo como provisional");

    const item: NewProvisional = { row, firstName, lastName, dni, birthDate, clubId: matched.club.id, clubName: matched.club.name };
    const loadedIn = existingProvisional.get(dni);
    if (loadedIn === undefined) plan.create.push(item);
    else if (loadedIn === matched.club.id) plan.alreadyLoaded.push(item);
    else fail("Este DNI ya está cargado como provisional en otro equipo (un provisional solo está en uno)");
  });

  return plan;
}
