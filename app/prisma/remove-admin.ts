import { PrismaClient } from "@prisma/client";

// Le quita el rol ADMIN a una cuenta que además tiene otros perfiles (por ejemplo la que se usaba
// para administrar y probar como organizador a la vez).
//
//   npm run db:remove-admin -- correo@ejemplo.com
//
// No lo hace si la cuenta se quedaría sin ningún rol, ni si es el último administrador que queda.
//
//   set -a; . ./.env.local; set +a; npm run db:remove-admin -- correo@ejemplo.com

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Uso: npm run db:remove-admin -- correo@ejemplo.com");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, roles: { select: { role: true } } },
  });
  if (!user) {
    console.error(`No existe un usuario con el correo ${email}.`);
    process.exit(1);
  }

  const roles = user.roles.map((r) => r.role);
  if (!roles.includes("ADMIN")) {
    console.log(`${user.email} no es administrador: no hay nada que quitar.`);
    return;
  }
  if (roles.every((r) => r === "ADMIN")) {
    console.error(`${user.email} solo tiene el rol ADMIN: quitárselo lo dejaría sin ningún perfil.`);
    process.exit(1);
  }
  const admins = await prisma.userRole.count({ where: { role: "ADMIN" } });
  if (admins <= 1) {
    console.error("Es el único administrador: crea otro antes de quitarle el rol.");
    process.exit(1);
  }

  await prisma.userRole.delete({ where: { userId_role: { userId: user.id, role: "ADMIN" } } });
  console.log(`${user.email} ya no es ADMIN (sigue con: ${roles.filter((r) => r !== "ADMIN").join(", ")}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
