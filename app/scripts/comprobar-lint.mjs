// Lint "sin empeorar" (CI). El proyecto arrastra avisos de lint antiguos (ver .lint-baseline.json): romper la CI por
// ellos no sirve, pero tampoco se puede dejar entrar uno nuevo. Esto corre eslint y falla si hay MÁS errores o avisos
// que los de la línea base. Si hay menos, lo dice: hay que bajar la línea base en el mismo PR (así solo se mejora).
//
//   npm run lint:ci            comprueba
//   npm run lint:ci -- --fijar escribe la línea base con lo que hay ahora (solo para bajarla)
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const BASE = new URL("../.lint-baseline.json", import.meta.url);

let out;
try {
  out = execFileSync("npx", ["eslint", "src", "tests", "--format", "json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  out = e.stdout?.toString() ?? ""; // eslint sale con código 1 si hay errores: el JSON viene igual
  if (!out.trim().startsWith("[")) {
    console.error("No se pudo correr eslint:\n" + (e.stderr?.toString() ?? e.message));
    process.exit(2);
  }
}

const files = JSON.parse(out);
const now = { errors: 0, warnings: 0 };
for (const f of files) {
  now.errors += f.errorCount;
  now.warnings += f.warningCount;
}

if (process.argv.includes("--fijar")) {
  writeFileSync(BASE, JSON.stringify(now, null, 2) + "\n");
  console.log(`Línea base fijada: ${now.errors} errores, ${now.warnings} avisos.`);
  process.exit(0);
}

const base = JSON.parse(readFileSync(BASE, "utf8"));
console.log(`eslint: ${now.errors} errores y ${now.warnings} avisos (línea base: ${base.errors} y ${base.warnings}).`);

if (now.errors > base.errors || now.warnings > base.warnings) {
  console.error("\nEl PR agrega problemas de lint nuevos. Arréglalos (no subas la línea base). Lista completa, con los antiguos incluidos:");
  for (const f of files) {
    for (const m of f.messages) console.error(`  ${f.filePath.replace(process.cwd() + "/", "")}:${m.line}  ${m.ruleId ?? ""}  ${m.message}`);
  }
  process.exit(1);
}
if (now.errors < base.errors || now.warnings < base.warnings) {
  console.error("\nHay menos problemas que la línea base: bájala con `npm run lint:ci -- --fijar` y súbela en este mismo PR.");
  process.exit(1);
}
