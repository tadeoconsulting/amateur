// Crea una migración de Prisma con lo que cambió el esquema respecto de otro (por omisión, el de `origin/main`):
//
//   npm run db:nueva-migracion -- agregar-indice-de-partidos
//   npm run db:nueva-migracion -- nombre --desde main        (otra referencia de git)
//
// Escribe prisma/migrations/AAAAMMDDHHMMSS_nombre/migration.sql. No toca ninguna base de datos y no necesita una
// "shadow database": compara dos archivos de esquema. Revisa el SQL antes de commitearlo. Para aplicarlo en una base
// (producción ANTES de mergear el PR) usa `npm run db:aplicar-migraciones` con la DIRECT_URL de esa base cargada.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--desde");
const fromIdx = args.indexOf("--desde");
const from = fromIdx >= 0 ? args[fromIdx + 1] : "origin/main";

if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) {
  console.error("Uso: npm run db:nueva-migracion -- nombre-en-minusculas-con-guiones [--desde origin/main]");
  process.exit(1);
}

const run = (cmd, a, opts = {}) => execFileSync(cmd, a, { encoding: "utf8", ...opts });

const root = run("git", ["rev-parse", "--show-toplevel"]).trim();
const prefix = run("git", ["rev-parse", "--show-prefix"]).trim(); // "app/" si se corre desde app
let oldSchema;
try {
  oldSchema = run("git", ["show", `${from}:${prefix}prisma/schema.prisma`], { cwd: root });
} catch {
  console.error(`No pude leer el esquema de "${from}". Corre \`git fetch origin\` o usa --desde con otra referencia.`);
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "esquema-"));
const oldPath = join(dir, "old.prisma");
writeFileSync(oldPath, oldSchema);

const sql = run("npx", ["prisma", "migrate", "diff", "--from-schema-datamodel", oldPath, "--to-schema-datamodel", "prisma/schema.prisma", "--script"]).trim();
if (/^-- This is an empty migration\.?$/.test(sql) || sql === "") {
  console.log(`El esquema es igual al de ${from}: no hay nada que migrar.`);
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const existing = existsSync("prisma/migrations") ? readdirSync("prisma/migrations") : [];
if (existing.some((d) => d.endsWith(`_${name}`))) {
  console.error(`Ya existe una migración "${name}". Bórrala o usa otro nombre.`);
  process.exit(1);
}
const target = join("prisma/migrations", `${stamp}_${name}`);
mkdirSync(target, { recursive: true });
writeFileSync(join(target, "migration.sql"), sql + "\n");
console.log(`Creada ${target}/migration.sql\n\n${sql}\n`);
