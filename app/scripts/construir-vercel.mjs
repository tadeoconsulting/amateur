// Build de Vercel (se declara en app/vercel.json). En producción es EXACTAMENTE `npm run build`.
//
// En un *preview* (el despliegue de un PR) primero pone al día la base de datos del preview con las migraciones del PR
// (`prisma migrate deploy`), para que un PR que cambia el esquema se pueda probar. Eso solo es seguro si la base es la
// rama `preview` de Neon y NO la de producción, así que se exigen dos cosas:
//   1. la variable PREVIEW_DATABASE_OK=1, que solo existe en el entorno Preview de Vercel, y
//   2. que la base tenga la tabla `_entorno_preview` (la marca que se le puso a la rama `preview`; producción no la tiene).
// Si falta cualquiera, NO se migra nada y el build sigue: un preview mal configurado nunca toca producción.
import { spawnSync } from "node:child_process";

function ejecutar(comando, args) {
  const r = spawnSync(comando, args, { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

async function esBaseDePreview() {
  const url = process.env.DIRECT_URL;
  if (!url) return false;
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const filas = await prisma.$queryRawUnsafe(`SELECT nombre FROM "_entorno_preview" WHERE nombre = 'preview'`);
    return filas.length === 1;
  } catch {
    return false; // no existe la tabla: no es la base de preview
  } finally {
    await prisma.$disconnect();
  }
}

if (process.env.VERCEL_ENV === "preview") {
  if (process.env.PREVIEW_DATABASE_OK !== "1") {
    console.log("[preview] Falta PREVIEW_DATABASE_OK=1: no se migra ninguna base.");
  } else if (!(await esBaseDePreview())) {
    console.log("[preview] La base NO tiene la marca _entorno_preview (¿apunta a producción?): no se migra nada.");
  } else {
    console.log("[preview] Aplicando las migraciones a la base de preview...");
    ejecutar("npx", ["prisma", "migrate", "deploy"]);
  }
}

ejecutar("npm", ["run", "build"]);
