import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { parseTable, planImport, type RawRow } from "../src/_lib/provisional-import";

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

const prisma = new PrismaClient();

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
  let rows: RawRow[];
  let equipo: string | undefined;
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (e) {
      console.error(`El JSON no es válido: ${(e as Error).message}`);
      process.exit(1);
    }
    const obj = parsed as { equipo?: unknown; jugadores?: unknown };
    rows = (Array.isArray(parsed) ? parsed : (obj?.jugadores as RawRow[])) ?? [];
    equipo = typeof obj?.equipo === "string" ? obj.equipo : undefined;
  } else {
    rows = parseTable(text);
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    console.error("No se encontró ningún jugador: pega las filas (nombres, apellidos, club, DNI, fecha de nacimiento) o usa el JSON.");
    process.exit(1);
  }
  const dayFirst = rows.filter((r) => typeof r.fechaNacimiento === "string" && r.fechaNacimiento.includes("/")).length;

  // A qué base se apunta, sin la contraseña: así se ve de un vistazo si es la de pruebas o la de producción.
  const host = (process.env.DATABASE_URL ?? "").match(/@([^/?]+)/)?.[1] ?? "(sin DATABASE_URL)";
  console.log(`Base de datos: ${host}`);

  const tournament = await prisma.tournament.findFirst({
    where: { slug, deletedAt: null, organizer: { organizerSlug: organizador } },
    select: { id: true, name: true, teams: { select: { club: { select: { id: true, name: true, shortName: true, isTemporary: true } } } } },
  });
  if (!tournament) {
    console.error(`No existe el torneo "${torneo}".`);
    process.exit(1);
  }
  const clubs = tournament.teams.map((t) => t.club);
  console.log(`Torneo: ${tournament.name} · ${clubs.length} equipos`);

  const dnis = rows.map((r) => String(r.dni ?? "").trim()).filter(Boolean);
  const existing = await prisma.playerProfile.findMany({ where: { dni: { in: dnis } }, select: { dni: true, clubId: true } });
  const accounts = await prisma.user.findMany({ where: { dni: { in: dnis } }, select: { dni: true } });

  const plan = planImport({
    rows,
    defaultClub: equipo,
    clubs,
    existingProvisional: new Map(existing.filter((p) => p.dni && p.clubId).map((p) => [p.dni as string, p.clubId as string])),
    accountDnis: new Set(accounts.map((a) => a.dni as string)),
    today: new Date().toISOString().slice(0, 10),
  });

  const byClub = new Map<string, number>();
  for (const p of plan.create) byClub.set(p.clubName, (byClub.get(p.clubName) ?? 0) + 1);
  console.log(`Filas leídas: ${rows.length}${dayFirst ? ` · ${dayFirst} con fecha DD/MM/AAAA (se leen como día/mes/año)` : ""}`);
  console.log(`\nSe crearían: ${plan.create.length}${[...byClub].map(([c, n]) => `  (${c}: ${n})`).join("")}`);
  for (const p of plan.create) console.log(`  + ${p.lastName}, ${p.firstName}`);
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
  const result = await prisma.playerProfile.createMany({
    data: plan.create.map((p) => ({
      clubId: p.clubId,
      firstName: p.firstName,
      lastName: p.lastName,
      dni: p.dni,
      birthDate: new Date(`${p.birthDate}T00:00:00Z`),
    })),
  });
  console.log(`\nGuardados: ${result.count} jugadores provisionales.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
