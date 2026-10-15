// Crea la cuenta de administrador que usan las pruebas de integración (el bloque "admin" de tests/auth.test.mjs).
// Solo para una base DESECHABLE: la CI y la base local de pruebas. Se niega a correr contra cualquier otra.
//
//   TEST_BASE_URL=http://localhost:3000 TEST_ADMIN_EMAIL=admin@test.amateur TEST_ADMIN_PASSWORD=... node scripts/crear-admin-de-prueba.mjs
//
// Un ADMIN no se puede crear por la API pública (a propósito), así que se registra una cuenta normal y se le
// cambia el rol directo en la base.
const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const email = process.env.TEST_ADMIN_EMAIL;
const password = process.env.TEST_ADMIN_PASSWORD;
const dbUrl = process.env.DATABASE_URL ?? "";

if (!email || !password) throw new Error("Define TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD.");
if (!email.endsWith("@test.amateur")) throw new Error("El correo de prueba debe terminar en @test.amateur.");
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(dbUrl)) {
  throw new Error("Esta herramienta solo corre contra una base local: define DATABASE_URL (con localhost) en el entorno. Nunca contra Neon.");
}

// Recién después de la guarda: @prisma/client carga el .env de la carpeta, que apunta a otra base.
const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
try {
  let user = await prisma.user.findFirst({ where: { email }, select: { id: true } });
  if (!user) {
    const res = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, firstName: "Admin", lastName: "Prueba" }),
    });
    if (res.status !== 201) throw new Error(`No se pudo registrar la cuenta (${res.status}): ${await res.text()}`);
    user = { id: (await res.json()).id };
  }
  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId: user.id } }),
    prisma.userRole.create({ data: { userId: user.id, role: "ADMIN" } }),
  ]);
} finally {
  await prisma.$disconnect();
}
console.log(`Cuenta de administrador de prueba lista: ${email}`);
