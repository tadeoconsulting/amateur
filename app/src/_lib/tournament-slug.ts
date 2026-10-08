import { prisma } from "@/_lib/prisma";
import { RESERVED_SLUGS, organizerSlugBase, tournamentSlugBase, uniqueSlug } from "@/_lib/slug";

type Db = Pick<typeof prisma, "user" | "tournament">;

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

/** El tramo del torneo (segundo de la URL pública): su nombre, con -2, -3... si el organizador ya tiene uno igual. */
export async function newTournamentSlug(organizerId: string, name: string, db: Db = prisma): Promise<string> {
  const base = tournamentSlugBase(name);
  const used = await db.tournament.findMany({
    where: { organizerId, slug: { startsWith: base } },
    select: { slug: true },
  });
  return uniqueSlug(base, new Set(used.map((t) => t.slug!)));
}
