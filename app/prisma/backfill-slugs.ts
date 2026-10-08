import { PrismaClient } from "@prisma/client";
import { RESERVED_SLUGS, organizerSlugBase, tournamentSlugBase, uniqueSlug } from "../src/_lib/slug";

// Asigna la URL pública (cupamateur.com/{organizador}/{torneo}) a los organizadores y torneos que
// todavía no la tienen. Se puede correr las veces que haga falta: no toca lo ya asignado.
//
//   npm run db:backfill-slugs -- --dry-run     (solo muestra lo que haría)
//   npm run db:backfill-slugs
//
// Corre contra la base que indiquen DATABASE_URL / DIRECT_URL (Prisma no lee .env.local):
//
//   set -a; . ./.env.local; set +a; npm run db:backfill-slugs -- --dry-run

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

async function main() {
  const organizers = await prisma.user.findMany({
    where: { tournaments: { some: {} } },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, firstName: true, lastName: true, organization: true, organizerSlug: true },
  });

  const takenOrganizerSlugs = new Set<string>([
    ...RESERVED_SLUGS,
    ...(await prisma.user.findMany({ where: { organizerSlug: { not: null } }, select: { organizerSlug: true } })).map((u) => u.organizerSlug!),
  ]);

  let organizersAssigned = 0;
  let tournamentsAssigned = 0;

  for (const organizer of organizers) {
    let organizerSlug = organizer.organizerSlug;
    if (!organizerSlug) {
      organizerSlug = uniqueSlug(organizerSlugBase(organizer), takenOrganizerSlugs);
      takenOrganizerSlugs.add(organizerSlug);
      if (!dryRun) await prisma.user.update({ where: { id: organizer.id }, data: { organizerSlug } });
      organizersAssigned++;
      console.log(`organizador ${organizer.email} → /${organizerSlug}`);
    }

    const tournaments = await prisma.tournament.findMany({
      where: { organizerId: organizer.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, slug: true },
    });
    const taken = new Set(tournaments.filter((t) => t.slug).map((t) => t.slug!));
    for (const t of tournaments.filter((t) => !t.slug)) {
      const slug = uniqueSlug(tournamentSlugBase(t.name), taken);
      taken.add(slug);
      if (!dryRun) await prisma.tournament.update({ where: { id: t.id }, data: { slug } });
      tournamentsAssigned++;
      console.log(`  torneo "${t.name}" → /${organizerSlug}/${slug}`);
    }
  }

  console.log(`${dryRun ? "[prueba, no se escribió nada] " : ""}${organizersAssigned} organizadores y ${tournamentsAssigned} torneos con URL nueva.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
