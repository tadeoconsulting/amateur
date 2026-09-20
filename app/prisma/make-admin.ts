import { PrismaClient } from "@prisma/client";

// Da el rol ADMIN a un usuario que ya se registró.
//
//   npm run db:make-admin -- correo@ejemplo.com
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
    select: { id: true, email: true },
  });
  if (!user) {
    console.error(`No existe un usuario con el correo ${email}. Debe registrarse primero.`);
    process.exit(1);
  }

  await prisma.userRole.upsert({
    where: { userId_role: { userId: user.id, role: "ADMIN" } },
    update: {},
    create: { userId: user.id, role: "ADMIN" },
  });
  console.log(`${user.email} ahora es ADMIN.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
