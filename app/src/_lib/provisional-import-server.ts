import { prisma } from "./prisma";
import { planImport, type ImportPlan, type RawRow } from "./provisional-import";

// La parte con base de datos de la carga de jugadores provisionales (especificación 009). La usan el importador
// del panel del admin (`POST /api/admin/import-players`) y el script de la terminal (`prisma/cargar-jugadores.ts`):
// las reglas (qué es válido, qué se crea) están en `planImport`, que es pura.

export type TournamentRef = { id: string } | { organizerSlug: string; slug: string };

export type PlanResult =
  | { ok: false; status: number; error: string }
  | { ok: true; tournament: { id: string; name: string }; teamsCount: number; plan: ImportPlan };

/** Valida las filas contra los equipos del torneo y lo que ya está cargado, sin escribir nada. */
export async function planForTournament(ref: TournamentRef, rows: RawRow[], defaultClub?: string): Promise<PlanResult> {
  const tournament = await prisma.tournament.findFirst({
    where: "id" in ref ? { id: ref.id, deletedAt: null } : { slug: ref.slug, deletedAt: null, organizer: { organizerSlug: ref.organizerSlug } },
    select: { id: true, name: true, teams: { select: { club: { select: { id: true, name: true, shortName: true } } } } },
  });
  if (!tournament) return { ok: false, status: 404, error: "El torneo no existe" };

  const clubs = tournament.teams.map((t) => t.club);
  const dnis = rows.map((r) => String(r.dni ?? "").trim()).filter(Boolean);
  const [existing, accounts] = await Promise.all([
    prisma.playerProfile.findMany({ where: { dni: { in: dnis } }, select: { dni: true, clubId: true } }),
    prisma.user.findMany({ where: { dni: { in: dnis } }, select: { dni: true } }),
  ]);

  const plan = planImport({
    rows,
    defaultClub,
    clubs,
    existingProvisional: new Map(existing.filter((p) => p.dni && p.clubId).map((p) => [p.dni as string, p.clubId as string])),
    accountDnis: new Set(accounts.map((a) => a.dni as string)),
    today: new Date().toISOString().slice(0, 10),
  });
  return { ok: true, tournament: { id: tournament.id, name: tournament.name }, teamsCount: clubs.length, plan };
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
