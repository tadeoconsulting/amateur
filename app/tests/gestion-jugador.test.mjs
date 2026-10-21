// Gestión del club · vista del jugador (especificación 015, entrega 3) contra un servidor real: el jugador ve SUS próximos
// entrenamientos, SU asistencia y SUS pagos (con lo que debe), y nada de sus compañeros. Usá una base DE PRUEBA, no
// producción.
//
//   TEST_BASE_URL=http://localhost:3000 npm run test:api

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client, RUN, newUser } from "./helpers.mjs";

const peruDate = (offsetDays = 0) => new Date(Date.now() - 5 * 3600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);

/** Un delegado con su equipo, dos categorías, un lugar y tres jugadores con cuenta en Sub 15 (y uno en Libre). */
async function setup(label) {
  const owner = await newUser(`${label}own`, ["CLUB_OWNER"]);
  const club = await owner.client.post("/api/clubs", { name: `${label} ${RUN}`, shortName: label.slice(0, 3).toUpperCase() });
  assert.equal(club.status, 201);
  const clubId = club.data.id;
  const cat = async (name) => (await owner.client.post(`/api/clubs/${clubId}/categories`, { name, gender: "masculino" })).data.id;
  const sub15 = await cat("Sub 15");
  const libre = await cat("Libre");
  const players = [];
  for (const [i, categoryId] of [sub15, sub15, sub15, libre].entries()) {
    const u = await newUser(`${label}jug${i}`, ["JUGADOR"]);
    const r = await owner.client.post(`/api/clubs/${clubId}/players`, { userId: u.id, categoryId });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    players.push({ ...u, playerId: r.data.id, categoryId });
  }
  const place = await owner.client.post(`/api/clubs/${clubId}/gestion/lugares`, { name: "Colegio Perú Suizo", address: "Av. Brasil" });
  return { owner, clubId, sub15, libre, players, placeId: place.data.id };
}

const base = (s) => `/api/clubs/${s.clubId}/gestion`;
const progress = async (p) => (await p.client.get("/api/me/club-progreso")).data.clubs;
const session = (s, body = {}) => s.owner.client.post(`${base(s)}/sesiones`, { date: peruDate(-3), time: "19:00", durationMin: 90, placeId: s.placeId, categoryId: s.sub15, ...body });
const mark = (s, sessionId, p, status) => s.owner.client.request("PUT", `${base(s)}/sesiones/${sessionId}/asistencia/${p.playerId}`, { status });
const fees = async (s) => (await s.owner.client.get(`${base(s)}/pagos`)).data;
const feeOf = async (s, p) => (await fees(s)).players.find((x) => x.playerId === p.playerId);

describe("quién lo ve", () => {
  test("sin sesión es 401 y quien no está en un club recibe una lista vacía", async () => {
    assert.equal((await new Client().get("/api/me/club-progreso")).status, 401);
    const loner = await newUser("solitario", ["JUGADOR"]);
    const res = await loner.client.get("/api/me/club-progreso");
    assert.equal(res.status, 200);
    assert.deepEqual(res.data.clubs, []);
  });

  test("el delegado que no es jugador de su club tampoco ve nada (es la vista del jugador)", async () => {
    const s = await setup("del");
    assert.deepEqual(await progress(s.owner), []);
  });

  test("la respuesta es privada: no se guarda en cachés compartidos", async () => {
    const s = await setup("cac");
    const res = await s.players[0].client.get("/api/me/club-progreso");
    assert.match(res.res.headers.get("cache-control") ?? "", /no-store/);
  });

  test("un jugador inactivo deja de verlo", async () => {
    const s = await setup("ina");
    assert.equal((await progress(s.players[0])).length, 1);
    const off = await s.owner.client.patch(`/api/players/${s.players[0].playerId}`, { status: "inactivo" });
    assert.equal(off.status, 200, JSON.stringify(off.data));
    assert.deepEqual(await progress(s.players[0]), []);
  });
});

describe("próximos entrenamientos", () => {
  test("ve los de su categoría y los de todo el club, no los de otra categoría ni los ya pasados", async () => {
    const s = await setup("ses");
    const [sub, libre, todo, pasado] = await Promise.all([
      session(s, { date: peruDate(2) }),
      session(s, { date: peruDate(3), categoryId: s.libre }),
      session(s, { date: peruDate(4), categoryId: null, time: "10:00" }),
      session(s, { date: peruDate(-2) }),
    ]);
    for (const r of [sub, libre, todo, pasado]) assert.equal(r.status, 201, JSON.stringify(r.data));

    const [club] = await progress(s.players[0]);
    const dates = club.sessions.map((x) => x.date);
    assert.ok(dates.includes(peruDate(2)), "su categoría");
    assert.ok(dates.includes(peruDate(4)), "todo el club");
    assert.ok(!dates.includes(peruDate(3)), "otra categoría");
    assert.ok(!dates.includes(peruDate(-2)), "ya pasó");
    const first = club.sessions.find((x) => x.date === peruDate(2));
    assert.deepEqual([first.time, first.durationMin, first.placeName, first.placeAddress, first.categoryName], ["19:00", 90, "Colegio Perú Suizo", "Av. Brasil", "Sub 15"]);

    // El de Libre ve el suyo y el de todo el club.
    const [libreClub] = await progress(s.players[3]);
    assert.deepEqual(libreClub.sessions.map((x) => x.date), [peruDate(3), peruDate(4)]);
  });

  test("una sesión cancelada se ve como cancelada, para que no vaya", async () => {
    const s = await setup("can");
    const a = (await session(s, { date: peruDate(2) })).data;
    await s.owner.client.patch(`${base(s)}/sesiones/${a.id}`, { status: "cancelada" });
    const [club] = await progress(s.players[0]);
    assert.equal(club.sessions.find((x) => x.id === a.id).status, "cancelada");
  });

  test("los horarios semanales también le llegan", async () => {
    const s = await setup("hor");
    await s.owner.client.post(`${base(s)}/horarios`, { categoryId: s.sub15, weekday: 2, startTime: "19:00", durationMin: 90, placeId: s.placeId });
    const [club] = await progress(s.players[0]);
    assert.ok(club.sessions.length >= 3, "4 martes en 28 días, menos alguno ya terminado hoy");
    assert.ok(club.sessions.every((x) => x.time === "19:00"));
  });
});

describe("mi asistencia", () => {
  test("cada jugador ve solo su marca, su porcentaje y sus últimos entrenamientos", async () => {
    const s = await setup("asi");
    const [p1, p2, p3] = s.players;
    const a = (await session(s, { date: peruDate(-6) })).data;
    const b = (await session(s, { date: peruDate(-4) })).data;
    const c = (await session(s, { date: peruDate(-2) })).data;
    await mark(s, a.id, p1, "presente");
    await mark(s, a.id, p2, "ausente");
    await mark(s, b.id, p1, "ausente");
    await mark(s, b.id, p2, "presente");
    await mark(s, c.id, p1, "justificado");
    await mark(s, c.id, p2, "presente");
    // p3 no fue marcado en ninguna.

    const [one] = await progress(p1);
    assert.deepEqual([one.attendance.presente, one.attendance.ausente, one.attendance.justificado, one.attendance.percent], [1, 1, 1, 50]);
    assert.deepEqual(one.attendance.recent.map((r) => r.status), ["justificado", "ausente", "presente"], "la más reciente primero");

    const [two] = await progress(p2);
    assert.deepEqual([two.attendance.presente, two.attendance.ausente, two.attendance.percent], [2, 1, 67]);

    // p3: las sesiones se realizaron pero a él nadie lo marcó: "sin registrar" y sin porcentaje.
    const [three] = await progress(p3);
    assert.equal(three.attendance.percent, null);
    assert.deepEqual(three.attendance.recent.map((r) => r.status), [null, null, null]);
  });

  test("una sesión cancelada o sin marcar no cuenta", async () => {
    const s = await setup("nc");
    const [p1] = s.players;
    const done = (await session(s, { date: peruDate(-5) })).data;
    await mark(s, done.id, p1, "presente");
    await session(s, { date: peruDate(-3) }); // nadie la marcó
    const cancelled = (await session(s, { date: peruDate(-2) })).data;
    await s.owner.client.patch(`${base(s)}/sesiones/${cancelled.id}`, { status: "cancelada" });
    const [club] = await progress(p1);
    assert.equal(club.attendance.recent.length, 1);
    assert.equal(club.attendance.percent, 100);
  });
});

describe("mis pagos", () => {
  test("ve lo que debe, el progreso de meses y cuando ya pagó queda al día", async () => {
    const s = await setup("pag");
    const [p1] = s.players;
    await s.owner.client.patch(`${base(s)}/ajustes`, { monthlyFee: 80, dueDay: 5 });

    let [club] = await progress(p1);
    assert.equal(club.payments.defined, true);
    assert.equal(club.payments.monthlyAmount, 80);
    assert.deepEqual([club.payments.owed, club.payments.dueMonths, club.payments.paidMonths], [80, 1, 0]);
    assert.equal(club.payments.months[0].status, "pendiente");

    const f = await feeOf(s, p1);
    const half = await s.owner.client.post(`${base(s)}/cargos/${f.feeId}/abonos`, { amount: 30 });
    assert.equal(half.status, 201);
    [club] = await progress(p1);
    assert.deepEqual([club.payments.owed, club.payments.months[0].status, club.payments.months[0].balance], [50, "parcial", 50]);

    await s.owner.client.post(`${base(s)}/cargos/${f.feeId}/abonos`, {});
    [club] = await progress(p1);
    assert.deepEqual([club.payments.owed, club.payments.paidMonths, club.payments.months[0].status], [0, 1, "pagado"]);
    assert.equal(club.payments.months[0].lastPaidAt, peruDate());
  });

  test("un abono anulado vuelve a mostrarse como deuda", async () => {
    const s = await setup("anu");
    const [p1] = s.players;
    await s.owner.client.patch(`${base(s)}/ajustes`, { monthlyFee: 80 });
    const f = await feeOf(s, p1);
    const pay = await s.owner.client.post(`${base(s)}/cargos/${f.feeId}/abonos`, {});
    assert.equal((await progress(p1))[0].payments.owed, 0);
    await s.owner.client.del(`${base(s)}/abonos/${pay.data.paymentId}`);
    assert.equal((await progress(p1))[0].payments.owed, 80);
  });

  test("cada uno ve su monto: el propio de S/ 60 y el gratis sin deuda", async () => {
    const s = await setup("prop");
    const [p1, p2, p3] = s.players;
    await s.owner.client.patch(`${base(s)}/ajustes`, { monthlyFee: 80 });
    await fees(s);
    await s.owner.client.patch(`${base(s)}/jugadores/${p2.playerId}/cuota`, { monthlyFee: 60 });
    await s.owner.client.patch(`${base(s)}/jugadores/${p3.playerId}/cuota`, { monthlyFee: 0 });

    assert.equal((await progress(p1))[0].payments.owed, 80);
    assert.equal((await progress(p2))[0].payments.owed, 60);
    const free = (await progress(p3))[0].payments;
    assert.deepEqual([free.defined, free.owed, free.dueMonths, free.months[0].status], [true, 0, 0, "sin_cuota"]);
  });

  test("si el club no definió cuota no se inventa ninguna", async () => {
    const s = await setup("nof");
    const [club] = await progress(s.players[0]);
    assert.equal(club.payments.defined, false);
    assert.deepEqual(club.payments.months, []);
    assert.equal(club.payments.owed, 0);
  });
});

describe("privacidad entre jugadores", () => {
  test("nada de un compañero aparece en lo que ve otro: ni su deuda, ni su asistencia, ni su nombre", async () => {
    const s = await setup("pri");
    const [p1, p2] = s.players;
    await s.owner.client.patch(`${base(s)}/ajustes`, { monthlyFee: 80 });
    await fees(s);
    await s.owner.client.patch(`${base(s)}/jugadores/${p2.playerId}/cuota`, { monthlyFee: 55.5 });
    const a = (await session(s, { date: peruDate(-2) })).data;
    await mark(s, a.id, p1, "presente");
    await mark(s, a.id, p2, "ausente");

    const res = await p1.client.get("/api/me/club-progreso");
    const text = JSON.stringify(res.data);
    assert.doesNotMatch(text, /55\.5/, "el monto propio de otro jugador");
    assert.ok(!text.includes(p2.playerId), "el id de otro jugador");
    assert.ok(!text.includes(p2.id), "la cuenta de otro jugador");
    assert.ok(!text.includes("jug1"), "el nombre de otro jugador");
    assert.equal(res.data.clubs[0].playerId, p1.playerId);
    assert.equal(res.data.clubs[0].attendance.presente, 1);
    assert.equal(res.data.clubs[0].attendance.ausente, 0);
  });

  test("el jugador no puede leer los pagos ni la asistencia del club (son del delegado)", async () => {
    const s = await setup("blo");
    const [p1] = s.players;
    const a = (await session(s, { date: peruDate(-2) })).data;
    for (const url of [`${base(s)}/pagos`, `${base(s)}/asistencia/resumen`, `${base(s)}/sesiones/${a.id}/asistencia`, `${base(s)}/jugadores/${p1.playerId}/historial`]) {
      assert.equal((await p1.client.get(url)).status, 403, url);
    }
    assert.equal((await p1.client.patch(`${base(s)}/jugadores/${p1.playerId}/cuota`, { monthlyFee: 0 })).status, 403, "ni se cambia la cuota a sí mismo");
  });

  test("el endpoint no acepta un id para espiar a otro jugador", async () => {
    const s = await setup("esp");
    const [p1, p2] = s.players;
    await s.owner.client.patch(`${base(s)}/ajustes`, { monthlyFee: 80 });
    await fees(s);
    await s.owner.client.patch(`${base(s)}/jugadores/${p2.playerId}/cuota`, { monthlyFee: 33 });
    const res = await p1.client.get(`/api/me/club-progreso?playerId=${p2.playerId}&userId=${p2.id}`);
    assert.equal(res.data.clubs[0].playerId, p1.playerId);
    assert.equal(res.data.clubs[0].payments.owed, 80);
  });

  test("con dos clubes ve cada uno por separado y las cuotas de uno no pasan al otro", async () => {
    const a = await setup("dosa");
    const b = await setup("dosb");
    await a.owner.client.patch(`${base(a)}/ajustes`, { monthlyFee: 80 });
    await b.owner.client.patch(`${base(b)}/ajustes`, { monthlyFee: 120 });

    const player = a.players[0];
    const { token } = (await b.owner.client.get(`/api/clubs/${b.clubId}/invite-link`)).data;
    const joined = await player.client.post(`/api/invitations/${token}/accept`, {});
    assert.equal(joined.status, 200, JSON.stringify(joined.data));

    const clubs = await progress(player);
    assert.equal(clubs.length, 2);
    const owedBy = Object.fromEntries(clubs.map((c) => [c.club.id, c.payments.owed]));
    assert.equal(owedBy[a.clubId], 80);
    assert.equal(owedBy[b.clubId], 120);
    // El delegado de B ve al jugador solo con la cuota de B (sus 4 jugadores y el que acaba de entrar), nunca la de A.
    const inB = (await b.owner.client.get(`${base(b)}/pagos`)).data.players;
    assert.equal(inB.length, 5);
    assert.ok(inB.every((p) => p.amount === 120));
  });
});
