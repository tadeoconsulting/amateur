// Oyente de tiempo real (OBS-36): comprueba que los avisos en vivo de un torneo llegan. SOLO LEE: se conecta como un
// espectador anónimo, con el mismo token público que usan las pantallas, y nunca publica ni escribe nada.
//
//   node scripts/escuchar-tiempo-real.mjs --torneo <id> [--url https://amateur-lemon.vercel.app] [--segundos 600]
//                                         [--hasta-un-aviso]
//
// Se suscribe a los partidos del torneo que todavía no terminaron y muestra cada aviso que llega, con la versión (`v`)
// que lleva. Úsalo así para confirmar que "la tabla se mueve sola": déjalo corriendo mientras la mesa registra un gol
// en un partido real; si ves "AVISO recibido", Ably está entregando y las pantallas que escuchan se actualizan.
//   · Sin avisos en la ventana: el partido no tuvo jugadas, o el servidor no está publicando (revisa ABLY_API_KEY).
//   · `--hasta-un-aviso` termina en cuanto llega el primero (código de salida 0); si se agota el tiempo sin avisos,
//     termina con código 3.
//
// Necesita `ably` (ya es dependencia de la app): corre desde la carpeta `app`.

import Ably from "ably";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};

const base = opt("url", "http://localhost:3000").replace(/\/$/, "");
const tournamentId = opt("torneo");
const seconds = Number(opt("segundos", "60"));
const untilFirst = flag("hasta-un-aviso");

if (!tournamentId) {
  console.error("Falta --torneo <id>. Ejemplo: node scripts/escuchar-tiempo-real.mjs --torneo cmu... --url https://amateur-lemon.vercel.app");
  process.exit(1);
}

const matches = await (await fetch(`${base}/api/matches?tournamentId=${tournamentId}`)).json();
if (!Array.isArray(matches)) {
  console.error("No se pudieron leer los partidos del torneo:", matches?.error ?? "respuesta inesperada");
  process.exit(1);
}
const watch = matches.filter((m) => m.status !== "finalizado");
console.log(`${watch.length} partidos sin finalizar para escuchar (de ${matches.length}) · ${base}`);
if (watch.length === 0) {
  console.log("Nada que escuchar: todos los partidos ya terminaron.");
  process.exit(0);
}

const t0 = Date.now();
const at = () => `+${((Date.now() - t0) / 1000).toFixed(1)}s`;
const client = new Ably.Realtime({ authUrl: `${base}/api/realtime-token` });
client.connection.on((s) => console.log(at(), "conexión:", s.current, s.reason ? `· ${s.reason.message}` : ""));

let attached = 0;
let received = 0;
const done = (code) => {
  console.log(at(), `fin: ${attached}/${watch.length} canales suscritos, ${received} avisos recibidos`);
  client.close();
  process.exit(code);
};

for (const m of watch) {
  const channel = client.channels.get(`match:${m.id}`);
  channel.on("attached", () => {
    attached++;
    if (attached === watch.length) console.log(at(), `suscrito a los ${attached} canales: esperando avisos...`);
  });
  channel.on("failed", (s) => console.log(at(), "canal falló:", m.id, s.reason?.message));
  channel.subscribe((message) => {
    received++;
    const v = message.data?.v;
    console.log(at(), `AVISO recibido en el partido ${m.id}${v ? ` · versión ${v} (${new Date(v).toLocaleTimeString("es-PE")})` : ""}`);
    if (untilFirst) done(0);
  });
}

setTimeout(() => done(untilFirst && received === 0 ? 3 : 0), seconds * 1000);
