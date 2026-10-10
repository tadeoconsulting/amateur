import { type NextRequest } from "next/server";
import { badRequest, forbidden, isAdmin, readJson, requireUser } from "@/_lib/auth";
import { parseInput } from "@/_lib/provisional-import";
import { planForTournament, saveProvisionals } from "@/_lib/provisional-import-server";

const MAX_CHARS = 500_000;
const MAX_ROWS = 2_000;

type ImportRowStatus = "create" | "loaded" | "problem";

/**
 * Importador de jugadores provisionales del panel (especificación 009). Solo un admin.
 *
 * Recibe lo que se pegó o se subió (`text`: filas de una hoja de cálculo, CSV o JSON) y el torneo. Con
 * `dryRun: true` solo revisa y devuelve, fila por fila, qué pasaría (`create`, `loaded` o `problem` con su motivo)
 * y los totales, sin escribir nada. Sin `dryRun` guarda, pero solo si no hay ningún problema (todo o nada) y se
 * vuelve a validar al guardar: lo que se muestra en pantalla nunca es lo que se confía. Es la misma lógica que
 * el script de la terminal (`planForTournament`).
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!isAdmin(auth.user)) return forbidden();

  const body = await readJson(request);
  if (!body || typeof body.tournamentId !== "string" || !body.tournamentId) return badRequest("Elige el torneo");
  if (typeof body.text !== "string" || !body.text.trim()) return badRequest("Pega las filas o sube un archivo");
  if (body.text.length > MAX_CHARS) return badRequest("Es demasiado grande: divídelo en varios archivos");

  const parsed = parseInput(body.text);
  if ("error" in parsed) return badRequest(parsed.error);
  if (parsed.rows.length > MAX_ROWS) return badRequest(`Hay más de ${MAX_ROWS} filas: divídelo en varios archivos`);

  const planned = await planForTournament({ id: body.tournamentId }, parsed.rows, parsed.equipo);
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
  for (const p of plan.problems) {
    const raw = parsed.rows[p.row - 1];
    byRow.set(p.row, { status: "problem", firstName: String(raw?.nombres ?? "").trim(), lastName: String(raw?.apellidos ?? "").trim(), dni: p.dni, club: String(raw?.club ?? parsed.equipo ?? "").trim(), birthDate: null, minor: false, reason: p.reason });
  }
  const rows = [...byRow.entries()].sort((a, b) => a[0] - b[0]).map(([row, r]) => ({ row, ...r }));

  const byClub: Record<string, number> = {};
  for (const p of plan.create) byClub[p.clubName] = (byClub[p.clubName] ?? 0) + 1;

  return Response.json({
    tournament: planned.tournament,
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
