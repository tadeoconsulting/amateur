import { readFileSync } from "node:fs";
import { prisma } from "../src/_lib/prisma";
import { parseInput } from "../src/_lib/provisional-import";
import { planForTournament, saveProvisionals } from "../src/_lib/provisional-import-server";

// Carga jugadores provisionales (sin cuenta) de un equipo — especificación 009.
//
// Lo más simple: copiar las filas de la hoja de cálculo (Excel o Google Sheets) y pegarlas con `pbpaste`, sin
// crear ningún archivo:
//
//   pbpaste | npm run db:cargar-jugadores -- --torneo liga-1-la-ensenada/clausura-2026 --archivo -
//   pbpaste | npm run db:cargar-jugadores -- --torneo liga-1-la-ensenada/clausura-2026 --archivo - --aplicar
//
// También acepta un archivo (`--archivo ruta.csv` o `.json`). Las filas llevan: nombres, apellidos, club, DNI y
// fecha de nacimiento. La primera fila puede ser el encabezado (en cualquier orden); si no lo hay, las columnas
// van en ese orden. El JSON es { "equipo": "LGK", "jugadores": [{ nombres, apellidos, club, dni, fechaNacimiento }] }.
//
// Sin --aplicar solo SIMULA: muestra qué haría y no escribe nada. Con --aplicar guarda, pero solo si no hay
// ningún problema (si hay, se corrige y se vuelve a correr). Correrlo dos veces no duplica. El club de cada
// jugador debe ser un equipo inscrito en el torneo (nombre o abreviatura). La fecha va como AAAA-MM-DD (o
// DD/MM/AAAA: día primero). El DNI, de 8 dígitos: en la hoja, el formato de la columna debe ser "Texto" para que
// no se pierda un 0 inicial.
//
// Los DNIs y las fechas de nacimiento son datos personales (posiblemente de menores): no los guardes en el
// repositorio ni los subas a GitHub. Si usas un archivo, ponlo FUERA del repositorio o en `datos-privados/`
// (git lo ignora).
//
// Corre contra la base que indiquen DATABASE_URL / DIRECT_URL. Prisma no lee .env.local, así que para
// apuntar a Neon hay que cargarlo antes:
//
//   set -a; . ./.env.local; set +a; pbpaste | npm run db:cargar-jugadores -- --torneo ... --archivo -

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const torneo = arg("torneo");
  const archivo = arg("archivo");
  const aplicar = process.argv.includes("--aplicar");
  const [organizador, slug] = (torneo ?? "").split("/");
  if (!organizador || !slug || !archivo) {
    console.error("Uso: pbpaste | npm run db:cargar-jugadores -- --torneo organizador/torneo --archivo - [--aplicar]   (o --archivo ruta.csv|json)");
    process.exit(1);
  }

  let text: string;
  try {
    if (archivo === "-") {
      if (process.stdin.isTTY) {
        console.error("No llegó ninguna fila. Copia las filas de la hoja y corre: pbpaste | npm run db:cargar-jugadores -- --torneo ... --archivo -");
        process.exit(1);
      }
      text = readFileSync(0, "utf8");
    } else {
      text = readFileSync(archivo, "utf8");
    }
  } catch (e) {
    console.error(`No se pudo leer "${archivo}": ${(e as Error).message}`);
    process.exit(1);
  }

  // JSON ({ equipo, jugadores } o una lista) o filas de una hoja de cálculo.
  const parsed = parseInput(text);
  if ("error" in parsed) {
    console.error(parsed.error);
    process.exit(1);
  }
  const { rows, equipo } = parsed;
  const dayFirst = rows.filter((r) => typeof r.fechaNacimiento === "string" && r.fechaNacimiento.includes("/")).length;

  // A qué base se apunta, sin la contraseña: así se ve de un vistazo si es la de pruebas o la de producción.
  const host = (process.env.DATABASE_URL ?? "").match(/@([^/?]+)/)?.[1] ?? "(sin DATABASE_URL)";
  console.log(`Base de datos: ${host}`);

  const planned = await planForTournament({ organizerSlug: organizador, slug }, rows, equipo);
  if (!planned.ok) {
    console.error(`${planned.error}: "${torneo}".`);
    process.exit(1);
  }
  const { plan } = planned;
  console.log(`Torneo: ${planned.tournament.name} · ${planned.teamsCount} equipos`);

  const byClub = new Map<string, number>();
  for (const p of plan.create) byClub.set(p.clubName, (byClub.get(p.clubName) ?? 0) + 1);
  console.log(`Filas leídas: ${rows.length}${dayFirst ? ` · ${dayFirst} con fecha DD/MM/AAAA (se leen como día/mes/año)` : ""}`);
  console.log(`\nSe crearían: ${plan.create.length}${[...byClub].map(([c, n]) => `  (${c}: ${n})`).join("")}`);
  for (const p of plan.create) console.log(`  + ${p.lastName}, ${p.firstName}`);
  const minors = plan.create.filter((p) => p.minor).length;
  if (minors > 0) console.log(`Menores de 18 entre los que se crearían: ${minors}`);
  console.log(`Ya cargados (se omiten): ${plan.alreadyLoaded.length}`);
  console.log(`Problemas: ${plan.problems.length}`);
  for (const p of plan.problems) console.log(`  ! Fila ${p.row} · ${p.name}: ${p.reason}`);

  if (!aplicar) {
    console.log("\nSimulación: no se guardó nada. Agrega --aplicar para guardar.");
    return;
  }
  if (plan.problems.length > 0) {
    console.error("\nNo se guardó nada: corrige los problemas del archivo y vuelve a correr.");
    process.exit(1);
  }
  if (plan.create.length === 0) {
    console.log("\nNada que guardar.");
    return;
  }

  // Todo o nada: un equipo no queda a medias.
  const saved = await saveProvisionals(plan);
  console.log(`\nGuardados: ${saved} jugadores provisionales.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
