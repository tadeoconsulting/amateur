import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { planImport, type RawRow } from "../src/_lib/provisional-import";

// Carga jugadores provisionales (sin cuenta) de un equipo desde un archivo JSON — especificación 009.
//
//   npm run db:cargar-jugadores -- --torneo liga-1-la-ensenada/clausura-2026 --archivo ../datos-privados/lgk.json
//   npm run db:cargar-jugadores -- --torneo liga-1-la-ensenada/clausura-2026 --archivo ../datos-privados/lgk.json --aplicar
//
// Sin --aplicar solo SIMULA: muestra qué haría y no escribe nada. Con --aplicar guarda, pero solo si no hay
// ningún problema (si hay, se corrige el archivo y se vuelve a correr). Correrlo dos veces no duplica.
//
// El archivo es { "equipo": "LGK", "jugadores": [{ nombres, apellidos, club, dni, fechaNacimiento }] } (o
// directamente la lista). El club de cada jugador debe ser un equipo inscrito en el torneo (nombre o
// abreviatura). El archivo trae DNIs y fechas de nacimiento (posiblemente de menores): guárdalo FUERA del
// repositorio, o en `datos-privados/` (git lo ignora), y nunca lo subas a GitHub.
//
// Corre contra la base que indiquen DATABASE_URL / DIRECT_URL. Prisma no lee .env.local, así que para
// apuntar a Neon hay que cargarlo antes:
//
//   set -a; . ./.env.local; set +a; npm run db:cargar-jugadores -- --torneo ... --archivo ...

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
    console.error("Uso: npm run db:cargar-jugadores -- --torneo organizador/torneo --archivo ruta.json [--aplicar]");
    process.exit(1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(archivo, "utf8"));
  } catch (e) {
    console.error(`No se pudo leer el archivo "${archivo}": ${(e as Error).message}`);
    process.exit(1);
  }
  const obj = parsed as { equipo?: unknown; jugadores?: unknown };
  const rows = (Array.isArray(parsed) ? parsed : obj?.jugadores) as RawRow[] | undefined;
  if (!Array.isArray(rows) || rows.length === 0) {
    console.error('El archivo debe ser una lista de jugadores, o { "equipo": "...", "jugadores": [...] }.');
    process.exit(1);
  }

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
    defaultClub: typeof obj?.equipo === "string" ? obj.equipo : undefined,
    clubs,
    existingProvisional: new Map(existing.filter((p) => p.dni && p.clubId).map((p) => [p.dni as string, p.clubId as string])),
    accountDnis: new Set(accounts.map((a) => a.dni as string)),
    today: new Date().toISOString().slice(0, 10),
  });

  const byClub = new Map<string, number>();
  for (const p of plan.create) byClub.set(p.clubName, (byClub.get(p.clubName) ?? 0) + 1);
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
