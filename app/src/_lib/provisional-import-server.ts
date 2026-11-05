import { prisma } from "./prisma";
import { planImport, type ClubRef, type ClubScope, type ImportPlan, type RawRow } from "./provisional-import";

// La parte con base de datos de la carga de jugadores provisionales (especificación 009). La usan el importador
// del panel del admin (`POST /api/admin/import-players`) y el script de la terminal (`prisma/cargar-jugadores.ts`):
// las reglas (qué es válido, qué se crea) están en `planImport`, que es pura.
//
// Un provisional pertenece a un **club** (`clubId`), no a un torneo: el torneo solo era una forma de encontrar el club
// por su nombre. Por eso hay tres formas de indicar de dónde salen los clubes (`ClubScope`): los equipos de un torneo, un
// club elegido, o todos los clubes de la plataforma.

export type TournamentRef = { id: string } | { organizerSlug: string; slug: string };

/** A dónde se está cargando, para mostrarlo en la revisión. */
export type ImportTarget =
  | { kind: "tournament"; id: string; name: string }
  | { kind: "club"; id: string; name: string }
  | { kind: "all"; name: string };

export type PlanResult =
  | { ok: false; status: number; error: string }
  | { ok: true; target: ImportTarget; tournament: { id: string; name: string }; teamsCount: number; plan: ImportPlan };

type PlannedOk = Extract<PlanResult, { ok: true }>;

/** Lo que ya hay cargado (por DNI) y las cuentas que ya existen: el contexto de `planImport`, igual en los tres modos. */
async function planAgainst(rows: RawRow[], clubs: ClubRef[], scope: ClubScope, defaultClub?: string, chosenClub?: string): Promise<{ plan: ImportPlan }> {
  const dnis = rows.map((r) => String(r.dni ?? "").trim()).filter(Boolean);
  const [existing, accounts] = await Promise.all([
    prisma.playerProfile.findMany({ where: { dni: { in: dnis } }, select: { dni: true, clubId: true } }),
    prisma.user.findMany({ where: { dni: { in: dnis } }, select: { dni: true } }),
  ]);

  const plan = planImport({
    rows,
    defaultClub,
    scope,
    chosenClub,
    clubs,
    existingProvisional: new Map(existing.filter((p) => p.dni && p.clubId).map((p) => [p.dni as string, p.clubId as string])),
    accountDnis: new Set(accounts.map((a) => a.dni as string)),
    today: new Date().toISOString().slice(0, 10),
  });
  return { plan };
}

/** Valida las filas contra los equipos del torneo y lo que ya está cargado, sin escribir nada. */
export async function planForTournament(ref: TournamentRef, rows: RawRow[], defaultClub?: string): Promise<PlanResult> {
  const tournament = await prisma.tournament.findFirst({
    where: "id" in ref ? { id: ref.id, deletedAt: null } : { slug: ref.slug, deletedAt: null, organizer: { organizerSlug: ref.organizerSlug } },
    select: { id: true, name: true, teams: { select: { club: { select: { id: true, name: true, shortName: true } } } } },
  });
  if (!tournament) return { ok: false, status: 404, error: "El torneo no existe" };

  const clubs = tournament.teams.map((t) => t.club);
  const { plan } = await planAgainst(rows, clubs, "tournament", defaultClub);
  const ref2 = { id: tournament.id, name: tournament.name };
  return { ok: true, target: { kind: "tournament", ...ref2 }, tournament: ref2, teamsCount: clubs.length, plan };
}

/**
 * Valida las filas para **un club elegido**, sin pedir que juegue en ningún torneo: todas las filas van a ese club (la
 * columna *Club* puede ir vacía; si una fila nombra a otro club, es un problema). Sin escribir nada.
 */
export async function planForClub(clubId: string, rows: RawRow[]): Promise<PlanResult> {
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { id: true, name: true, shortName: true } });
  if (!club) return { ok: false, status: 404, error: "El club no existe" };

  const { plan } = await planAgainst(rows, [club], "club", club.name, club.name);
  const ref: PlannedOk["tournament"] = { id: club.id, name: club.name };
  return { ok: true, target: { kind: "club", ...ref }, tournament: ref, teamsCount: 1, plan };
}

/**
 * Valida las filas buscando el club de cada una **entre todos los clubes de la plataforma** (oficiales y temporales), sin
 * pedir ningún torneo. Cada fila tiene que nombrar su club; si dos clubes se llaman igual, la fila es ambigua. Sin escribir nada.
 */
export async function planForAllClubs(rows: RawRow[]): Promise<PlanResult> {
  const clubs = await prisma.club.findMany({ select: { id: true, name: true, shortName: true } });
  const { plan } = await planAgainst(rows, clubs, "all");
  return { ok: true, target: { kind: "all", name: "Todos los clubes" }, tournament: { id: "", name: "Todos los clubes" }, teamsCount: clubs.length, plan };
}

/** Los clubes que se pueden elegir al importar (el selector del panel): oficiales y temporales, por nombre. */
export async function listImportableClubs() {
  return prisma.club.findMany({
    select: { id: true, name: true, shortName: true, isTemporary: true },
    orderBy: { name: "asc" },
  });
}

/** Guarda los jugadores a crear de un plan sin problemas, todo o nada. Devuelve cuántos se guardaron. */
export async function saveProvisionals(plan: ImportPlan): Promise<number> {
  if (plan.problems.length > 0) throw new Error("El plan tiene problemas: no se guarda");
  if (plan.create.length === 0) return 0;
  const result = await prisma.playerProfile.createMany({
    data: plan.create.map((p) => ({
      clubId: p.clubId,
      firstName: p.firstName,
      lastName: p.lastName,
      dni: p.dni,
      birthDate: new Date(`${p.birthDate}T00:00:00Z`),
    })),
  });
  return result.count;
}
