import { prisma } from "@/_lib/prisma";
import { RESERVED_SLUGS, organizerSlugBase, tournamentSlugBase, uniqueSlug } from "@/_lib/slug";

type Db = Pick<typeof prisma, "user" | "tournament" | "season">;

/**
 * El tramo del organizador (primero de la URL pública): el que ya tiene, o uno nuevo a partir
 * de su organización o su nombre, distinto de los de otros organizadores y de las pantallas de
 * la app. Una vez asignado no cambia.
 */
export async function ensureOrganizerSlug(organizerId: string, db: Db = prisma): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: organizerId },
    select: { organizerSlug: true, organization: true, firstName: true, lastName: true },
  });
  if (!user) throw new Error("Organizador no encontrado");
  if (user.organizerSlug) return user.organizerSlug;

  const base = organizerSlugBase(user);
  const used = await db.user.findMany({
    where: { organizerSlug: { startsWith: base } },
    select: { organizerSlug: true },
  });
  const taken = new Set<string>([...RESERVED_SLUGS, ...used.map((u) => u.organizerSlug!)]);
  const slug = uniqueSlug(base, taken);
  await db.user.update({ where: { id: organizerId }, data: { organizerSlug: slug } });
  return slug;
}

/**
 * Los tramos que el organizador ya usa a partir de `base`. Torneos y temporadas (especificación 012)
 * comparten el segundo tramo de la URL pública, así que se miran las dos tablas.
 */
async function usedSecondSlugs(organizerId: string, base: string, db: Db): Promise<Set<string>> {
  const where = { organizerId, slug: { startsWith: base } };
  const [tournaments, seasons] = await Promise.all([
    db.tournament.findMany({ where, select: { slug: true } }),
    db.season.findMany({ where, select: { slug: true } }),
  ]);
  return new Set([...tournaments.map((t) => t.slug!), ...seasons.map((s) => s.slug)]);
}

/** El tramo del torneo (segundo de la URL pública): su nombre, con -2, -3... si el organizador ya tiene uno igual. */
export async function newTournamentSlug(organizerId: string, name: string, db: Db = prisma): Promise<string> {
  const base = tournamentSlugBase(name);
  return uniqueSlug(base, await usedSecondSlugs(organizerId, base, db));
}

/** El tramo de la temporada: sale igual que el de un torneo y tampoco choca con ninguno. */
export const newSeasonSlug = newTournamentSlug;
