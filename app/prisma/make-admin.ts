import { PrismaClient } from "@prisma/client";

// Convierte una cuenta que ya se registró en administradora EXCLUSIVA: queda solo con el rol
// ADMIN (un administrador no comparte perfil con organizador, club, jugador, etc.).
//
//   npm run db:make-admin -- correo@ejemplo.com
//
// Si la cuenta tiene datos propios (torneos, clubes, solicitudes, staff o ficha de jugador en
// un club), no se convierte: ese trabajo quedaría huérfano. En ese caso se crea una cuenta
// aparte para administrar.
//
// Corre contra la base que indiquen DATABASE_URL / DIRECT_URL. Prisma no lee
// .env.local, así que para apuntar a Neon hay que cargarlo antes:
//
//   set -a; . ./.env.local; set +a; npm run db:make-admin -- correo@ejemplo.com

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Uso: npm run db:make-admin -- correo@ejemplo.com");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: {
      id: true,
      email: true,
      roles: { select: { role: true } },
      _count: { select: { tournaments: true, ownedClubs: true, staffRoles: true, tournamentRequests: true, sedes: true } },
    },
  });
  if (!user) {
    console.error(`No existe un usuario con el correo ${email}. Debe registrarse primero.`);
    process.exit(1);
  }

  const roles = user.roles.map((r) => r.role);
  if (roles.length === 1 && roles[0] === "ADMIN") {
    console.log(`${user.email} ya es administrador exclusivo.`);
    return;
  }

  const inClubs = await prisma.playerProfile.count({ where: { userId: user.id, clubId: { not: null } } });
  const owned = { ...user._count, fichasEnClubes: inClubs };
  const withData = Object.entries(owned).filter(([, n]) => n > 0);
  if (withData.length > 0) {
    console.error(
      `${user.email} tiene datos propios (${withData.map(([k, n]) => `${k}: ${n}`).join(", ")}) y no se convierte en administrador: ` +
        "un administrador no comparte perfil con otros. Crea una cuenta aparte para administrar."
    );
    process.exit(1);
  }

  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId: user.id } }),
    // La ficha "libre" de jugador (sin club) que se crea por omisión no tiene nada que conservar.
    prisma.playerProfile.deleteMany({ where: { userId: user.id, clubId: null } }),
    prisma.userRole.create({ data: { userId: user.id, role: "ADMIN" } }),
  ]);
  console.log(`${user.email} ahora es ADMIN exclusivo (antes: ${roles.join(", ") || "sin roles"}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
