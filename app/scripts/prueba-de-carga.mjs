// Prueba de carga de las lecturas públicas de un torneo (OBS-58). Sin dependencias: usa el fetch de Node.
//
// Simula espectadores que miran un torneo y, cada vez que "cae un gol", vuelven a pedir lo mismo que pide la pantalla
// pública (partidos, tabla y goleadores). Con `--pub` piden como las pantallas públicas (`?pub=1` y la versión del
// último gol, así el borde las atiende de la caché); sin `--pub`, como las demás pantallas (siempre a la base).
//
//   node scripts/prueba-de-carga.mjs --torneo <id> [--url http://localhost:3000] [--espectadores 50] [--segundos 20]
//                                    [--pub] [--gol-cada 5] [--pausa 400] [--permitir-remoto]
//
// Mide, por lectura: pedidos, errores, y latencia p50 / p95 / p99. Con `--pub` cuenta también cuántas respuestas
// resolvió el borde (`x-vercel-cache: HIT`) y cuántas llegaron a la función. SOLO LEE: nunca escribe nada.
//
// Contra un servidor que no sea el tuyo (localhost) hay que decirlo con `--permitir-remoto`, y se limita a 200
// espectadores: es tu base y tu cuenta de Vercel las que reciben el golpe.

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};

const base = opt("url", "http://localhost:3000").replace(/\/$/, "");
const tournament = opt("torneo");
const viewers = Number(opt("espectadores", "50"));
const seconds = Number(opt("segundos", "20"));
const goalEvery = Number(opt("gol-cada", "5"));
const pauseMs = Number(opt("pausa", "400"));
const pub = flag("pub");
const remote = !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(base);

if (!tournament) {
  console.error("Falta --torneo <id>. Ejemplo: node scripts/prueba-de-carga.mjs --torneo cmu... --pub");
  process.exit(1);
}
if (remote && !flag("permitir-remoto")) {
  console.error(`${base} no es tu máquina: agrega --permitir-remoto para confirmar que quieres cargarlo (solo lecturas).`);
  process.exit(1);
}
if (remote && viewers > 200) {
  console.error("Contra un servidor remoto el tope es de 200 espectadores.");
  process.exit(1);
}

// Igual que `withPublicRead` de src/_lib/public-cache.ts (se repite acá para que el script no dependa del código de la app).
const withPub = (path, v) => {
  const [p, q = ""] = path.split("?");
  const params = new URLSearchParams(q);
  params.set("pub", "1");
  if (v > 0) params.set("v", String(v));
  return `${p}?${params.toString()}`;
};

const reads = [
  ["partidos", `/api/matches?tournamentId=${tournament}`],
  ["tabla", `/api/tournaments/${tournament}/standings?live=1`],
  ["goleadores", `/api/tournaments/${tournament}/scorers`],
];

const stats = Object.fromEntries(reads.map(([name]) => [name, { n: 0, errors: 0, ms: [], cache: {} }]));
let version = 0; // la versión del último "gol": la misma para todos, como el aviso de Ably
const goalTimer = pub ? setInterval(() => (version = Date.now()), goalEvery * 1000) : null;
if (pub) version = Date.now();

const percentile = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : 0);
const deadline = Date.now() + seconds * 1000;

async function viewer() {
  while (Date.now() < deadline) {
    for (const [name, path] of reads) {
      const s = stats[name];
      const url = base + (pub ? withPub(path, version) : path);
      const t0 = performance.now();
      try {
        const res = await fetch(url, { cache: "no-store" });
        await res.arrayBuffer();
        s.ms.push(performance.now() - t0);
        s.n++;
        if (!res.ok) s.errors++;
        const c = res.headers.get("x-vercel-cache") ?? "—";
        s.cache[c] = (s.cache[c] ?? 0) + 1;
      } catch {
        s.n++;
        s.errors++;
      }
    }
    await new Promise((r) => setTimeout(r, pauseMs + Math.random() * 100));
  }
}

console.log(`Prueba de carga · ${base} · torneo ${tournament}`);
console.log(`${viewers} espectadores, ${seconds} s, ${pub ? `con --pub (un gol cada ${goalEvery} s)` : "sin --pub (siempre a la base)"}\n`);
const t0 = Date.now();
await Promise.all(Array.from({ length: viewers }, viewer));
if (goalTimer) clearInterval(goalTimer);
const elapsed = (Date.now() - t0) / 1000;

let total = 0;
let errors = 0;
for (const [name] of reads) {
  const s = stats[name];
  const sorted = [...s.ms].sort((a, b) => a - b);
  total += s.n;
  errors += s.errors;
  const cache = Object.entries(s.cache).map(([k, v]) => `${k}:${v}`).join(" ");
  console.log(
    `${name.padEnd(11)} ${String(s.n).padStart(6)} pedidos · ${s.errors} errores · p50 ${percentile(sorted, 50).toFixed(0)} ms · p95 ${percentile(sorted, 95).toFixed(0)} ms · p99 ${percentile(sorted, 99).toFixed(0)} ms${cache ? ` · caché ${cache}` : ""}`
  );
}
console.log(`\nTotal ${total} pedidos en ${elapsed.toFixed(1)} s = ${(total / elapsed).toFixed(0)} pedidos/s · ${errors} errores (${total ? ((errors / total) * 100).toFixed(2) : 0}%)`);
process.exit(errors > 0 ? 2 : 0);
