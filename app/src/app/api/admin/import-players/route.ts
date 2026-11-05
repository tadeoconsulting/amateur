import { type NextRequest } from "next/server";
import { badRequest, forbidden, isAdmin, readJson, requireUser } from "@/_lib/auth";
import { parseInput } from "@/_lib/provisional-import";
import { listImportableClubs, planForAllClubs, planForClub, planForTournament, saveProvisionals, type PlanResult } from "@/_lib/provisional-import-server";

const MAX_CHARS = 500_000;
const MAX_ROWS = 2_000;

type ImportRowStatus = "create" | "loaded" | "problem";

/** Los clubes que se pueden elegir como destino (oficiales y temporales). Solo un admin. */
export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!isAdmin(auth.user)) return forbidden();
  return Response.json(await listImportableClubs());
}

/**
 * Importador de jugadores provisionales del panel (especificación 009). Solo un admin.
 *
 * Recibe lo que se pegó o se subió (`text`: filas de una hoja de cálculo, CSV o JSON) y **a dónde se carga** (`scope`):
 * - `"tournament"` (`tournamentId`): el club de cada fila se busca entre los equipos de ese torneo (la forma de siempre).
 * - `"club"` (`clubId`): todas las filas van a ese club, sin que juegue en ningún torneo.
 * - `"all"`: el club de cada fila se busca entre todos los clubes de la plataforma.
 * Sin `scope` pero con `tournamentId`, es `"tournament"` (los clientes anteriores).
 *
 * Con `dryRun: true` solo revisa y devuelve, fila por fila, qué pasaría (`create`, `loaded` o `problem` con su motivo)
 * y los totales, sin escribir nada. Sin `dryRun` guarda, pero solo si no hay ningún problema (todo o nada) y se
 * vuelve a validar al guardar: lo que se muestra en pantalla nunca es lo que se confía. Es la misma lógica que
 * el script de la terminal.
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!isAdmin(auth.user)) return forbidden();

  const body = await readJson(request);
  if (!body) return badRequest();
  const scope = body.scope === undefined && typeof body.tournamentId === "string" ? "tournament" : body.scope;
  if (scope !== "tournament" && scope !== "club" && scope !== "all") return badRequest("Elige a dónde cargar: un torneo, un club o todos los clubes");
  if (scope === "tournament" && (typeof body.tournamentId !== "string" || !body.tournamentId)) return badRequest("Elige el torneo");
  if (scope === "club" && (typeof body.clubId !== "string" || !body.clubId)) return badRequest("Elige el club");
  if (typeof body.text !== "string" || !body.text.trim()) return badRequest("Pega las filas o sube un archivo");
  if (body.text.length > MAX_CHARS) return badRequest("Es demasiado grande: divídelo en varios archivos");

  const parsed = parseInput(body.text);
  if ("error" in parsed) return badRequest(parsed.error);
  if (parsed.rows.length > MAX_ROWS) return badRequest(`Hay más de ${MAX_ROWS} filas: divídelo en varios archivos`);

  const planned: PlanResult =
    scope === "club"
      ? await planForClub(body.clubId as string, parsed.rows)
      : scope === "all"
        ? await planForAllClubs(parsed.rows)
        : await planForTournament({ id: body.tournamentId as string }, parsed.rows, parsed.equipo);
  if (!planned.ok) return Response.json({ error: planned.error }, { status: planned.status });
  const { plan } = planned;

  if (body.dryRun !== true) {
    if (plan.problems.length > 0) return Response.json({ error: "Hay filas con problemas: corrígelas y vuelve a revisar" }, { status: 409 });
    try {
      const created = await saveProvisionals(plan);
      return Response.json({ created, loaded: plan.alreadyLoaded.length });
    } catch (error) {
      console.error("Import players error:", error);
      return Response.json({ error: "No se pudo guardar. No se cargó ningún jugador." }, { status: 500 });
    }
  }

  // Una línea por fila del archivo, en su orden, para mostrarla tal cual.
  const byRow = new Map<number, { status: ImportRowStatus; firstName: string; lastName: string; dni: string | null; club: string; birthDate: string | null; minor: boolean; reason: string | null }>();
  for (const p of plan.create) byRow.set(p.row, { status: "create", firstName: p.firstName, lastName: p.lastName, dni: p.dni, club: p.clubName, birthDate: p.birthDate, minor: p.minor, reason: null });
  for (const p of plan.alreadyLoaded) byRow.set(p.row, { status: "loaded", firstName: p.firstName, lastName: p.lastName, dni: p.dni, club: p.clubName, birthDate: p.birthDate, minor: p.minor, reason: "Ya está cargado en este equipo: se omite" });
  // El club que se muestra en una fila con problema: el que escribió, o el club elegido si la celda estaba vacía.
  const fallbackClub = scope === "club" ? planned.target.name : (parsed.equipo ?? "");
  for (const p of plan.problems) {
    const raw = parsed.rows[p.row - 1];
    const written = String(raw?.club ?? "").trim();
    byRow.set(p.row, { status: "problem", firstName: String(raw?.nombres ?? "").trim(), lastName: String(raw?.apellidos ?? "").trim(), dni: p.dni, club: written || fallbackClub, birthDate: null, minor: false, reason: p.reason });
  }
  const rows = [...byRow.entries()].sort((a, b) => a[0] - b[0]).map(([row, r]) => ({ row, ...r }));

  const byClub: Record<string, number> = {};
  for (const p of plan.create) byClub[p.clubName] = (byClub[p.clubName] ?? 0) + 1;

  return Response.json({
    target: planned.target,
    totals: {
      rows: parsed.rows.length,
      create: plan.create.length,
      loaded: plan.alreadyLoaded.length,
      problems: plan.problems.length,
      minors: plan.create.filter((p) => p.minor).length,
      byClub,
    },
    rows,
  });
}
