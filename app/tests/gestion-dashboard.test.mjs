// Gestión del club · dashboard del delegado (especificación 015, entrega 4) contra un servidor real: recaudado contra
// esperado, serie de 6 meses, morosos, asistencia por categoría y por jugador, tendencia semanal, conteo de sesiones, filtros
// y permisos. Usá una base DE PRUEBA, no producción.
//
//   TEST_BASE_URL=http://localhost:3000 npm run test:api

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client, RUN, newUser } from "./helpers.mjs";

const peruDate = (offsetDays = 0) => new Date(Date.now() - 5 * 3600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
const monthsAgo = (n, from = peruDate().slice(0, 7)) => {
  let [y, m] = from.split("-").map(Number);
  m -= n;
  while (m < 1) { m += 12; y -= 1; }
  return `${y}-${String(m).padStart(2, "0")}`;
};

/** Un delegado con su equipo, Sub 15 (3 jugadores) y Libre (2), un lugar y la cuota en S/ 80. */
async function setup(label, { fee = true } = {}) {
  const owner = await newUser(`${label}own`, ["CLUB_OWNER"]);
  const club = await owner.client.post("/api/clubs", { name: `${label} ${RUN}`, shortName: label.slice(0, 3).toUpperCase() });
  assert.equal(club.status, 201);
  const clubId = club.data.id;
  const cat = async (name) => (await owner.client.post(`/api/clubs/${clubId}/categories`, { name, gender: "masculino" })).data.id;
  const sub15 = await cat("Sub 15");
  const libre = await cat("Libre");
  const players = [];
  for (const [i, categoryId] of [sub15, sub15, sub15, libre, libre].entries()) {
    const u = await newUser(`${label}j${i}`, ["JUGADOR"]);
    const r = await owner.client.post(`/api/clubs/${clubId}/players`, { userId: u.id, categoryId });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    players.push({ ...u, playerId: r.data.id, categoryId });
  }
  const place = await owner.client.post(`/api/clubs/${clubId}/gestion/lugares`, { name: "Colegio Perú Suizo" });
  const s = { owner, clubId, sub15, libre, players, placeId: place.data.id };
  if (fee) await owner.client.patch(`${base(s)}/ajustes`, { monthlyFee: 80, dueDay: 5 });
  return s;
}

const base = (s) => `/api/clubs/${s.clubId}/gestion`;
const dash = (s, q = "") => s.owner.client.get(`${base(s)}/dashboard${q}`);
const feeOf = async (s, p, mes) => (await s.owner.client.get(`${base(s)}/pagos${mes ? `?mes=${mes}` : ""}`)).data.players.find((x) => x.playerId === p.playerId);
const pay = async (s, p, amount) => s.owner.client.post(`${base(s)}/cargos/${(await feeOf(s, p)).feeId}/abonos`, amount === undefined ? {} : { amount });
// Varias sesiones el mismo día a horas distintas: todas caen en el mes y la semana en curso aunque hoy sea día 1 o lunes.
let hour = 6;
const session = (s, categoryId, body = {}) => s.owner.client.post(`${base(s)}/sesiones`, { date: peruDate(), time: `${String(hour++ % 24).padStart(2, "0")}:00`, durationMin: 60, placeId: s.placeId, categoryId, ...body });
const mark = (s, sessionId, p, status) => s.owner.client.request("PUT", `${base(s)}/sesiones/${sessionId}/asistencia/${p.playerId}`, { status });

describe("permisos y validación", () => {
  test("sin sesión es 401, un jugador es 403 y otro club no lo ve", async () => {
    const s = await setup("per");
    const other = await setup("pox");
    assert.equal((await new Client().get(`${base(s)}/dashboard`)).status, 401);
    assert.equal((await s.players[0].client.get(`${base(s)}/dashboard`)).status, 403);
    assert.equal((await other.owner.client.get(`${base(s)}/dashboard`)).status, 403);
    assert.equal((await dash(s)).status, 200);
  });

  test("un co-delegado lo ve igual que el principal", async () => {
    const s = await setup("cod");
    const inv = await s.owner.client.post(`/api/clubs/${s.clubId}/co-delegate-invitations`, {});
    const co = await newUser("dashco");
    assert.equal((await co.client.post(`/api/co-delegate-invitations/${inv.data.url.split("/").pop()}/accept`)).status, 200);
    assert.equal((await co.client.get(`${base(s)}/dashboard`)).status, 200);
  });

  test("valida el mes y la categoría", async () => {
    const s = await setup("val");
    const other = await setup("vax");
    assert.equal((await dash(s, "?mes=octubre")).status, 400);
    assert.equal((await dash(s, "?mes=2099-01")).status, 400);
    assert.equal((await dash(s, "?categoria=no-existe")).status, 400);
    assert.equal((await dash(s, `?categoria=${other.sub15}`)).status, 400, "una categoría de otro club");
  });

  test("la respuesta es privada: no se guarda en cachés compartidos", async () => {
    const s = await setup("cac");
    assert.match((await dash(s)).res.headers.get("cache-control") ?? "", /no-store/);
  });
});

describe("un club sin datos", () => {
  test("trae las estructuras completas pero vacías, sin inventar nada", async () => {
    const s = await setup("vac", { fee: false });
    const d = (await dash(s)).data;
    assert.equal(d.cobro.defined, false);
    assert.deepEqual([d.cobro.expected, d.cobro.collected, d.cobro.players], [0, 0, 0]);
    assert.equal(d.cobro.series.length, 6);
    assert.ok(d.cobro.series.every((m) => m.percent === null));
    assert.deepEqual([d.morosos.count, d.morosos.list.length], [0, 0]);
    assert.equal(d.asistencia.percent, null);
    assert.equal(d.asistencia.trend.length, 12);
    assert.ok(d.asistencia.trend.every((w) => w.percent === null && w.sessions === 0));
    assert.deepEqual(d.asistencia.categories.map((c) => c.name), ["Libre", "Sub 15"]);
    assert.deepEqual(d.sesiones, { realizadas: 0, canceladas: 0, sinMarcar: 0, proximas: 0 });
    assert.deepEqual(d.months, [d.currentMonth]);
  });
});

describe("cobro", () => {
  test("recaudado contra esperado del mes, con cada estado contado", async () => {
    const s = await setup("cob");
    const [p1, p2, p3, p4, p5] = s.players;
    await s.owner.client.get(`${base(s)}/pagos`);
    await s.owner.client.patch(`${base(s)}/jugadores/${p5.playerId}/cuota`, { monthlyFee: 0 }); // gratis
    await pay(s, p1); // 80
    await pay(s, p2, 30); // parcial
    void p3; void p4;

    const { cobro } = (await dash(s)).data;
    assert.equal(cobro.defined, true);
    assert.equal(cobro.expected, 320, "4 pagan S/ 80 y uno es gratis");
    assert.equal(cobro.collected, 110);
    assert.equal(cobro.percent, 34);
    assert.deepEqual([cobro.players, cobro.paid, cobro.partial, cobro.pending, cobro.free], [5, 1, 1, 2, 1]);
    assert.equal(cobro.balance, 210);
  });

  test("la serie trae 6 meses hasta el elegido, con huecos donde no hay cuotas", async () => {
    const s = await setup("ser");
    const [p1] = s.players;
    const current = peruDate().slice(0, 7);
    await s.owner.client.get(`${base(s)}/pagos`);
    await s.owner.client.patch(`${base(s)}/jugadores/${p1.playerId}/cuota`, { startMonth: monthsAgo(2) });
    await pay(s, p1);

    const { cobro, months } = (await dash(s)).data;
    assert.deepEqual(cobro.series.map((m) => m.month), [monthsAgo(5), monthsAgo(4), monthsAgo(3), monthsAgo(2), monthsAgo(1), current]);
    assert.deepEqual(cobro.series.slice(0, 3).map((m) => m.percent), [null, null, null]);
    assert.deepEqual(cobro.series.slice(3, 5).map((m) => [m.expected, m.collected, m.percent]), [[80, 0, 0], [80, 0, 0]]);
    assert.equal(months[0], current);
    assert.ok(months.includes(monthsAgo(2)));

    // Mirar un mes anterior termina la serie en ese mes.
    const prev = (await dash(s, `?mes=${monthsAgo(1)}`)).data;
    assert.equal(prev.month, monthsAgo(1));
    assert.equal(prev.cobro.series[5].month, monthsAgo(1));
    assert.deepEqual([prev.cobro.expected, prev.cobro.players], [80, 1]);
  });

  test("los morosos van de la mayor deuda vencida a la menor, y los gratis y los al día no aparecen", async () => {
    const s = await setup("mor");
    const [p1, p2, p3, p4, p5] = s.players;
    await s.owner.client.get(`${base(s)}/pagos`);
    await s.owner.client.patch(`${base(s)}/jugadores/${p1.playerId}/cuota`, { startMonth: monthsAgo(2) }); // 2 meses vencidos
    await s.owner.client.patch(`${base(s)}/jugadores/${p2.playerId}/cuota`, { startMonth: monthsAgo(1) }); // 1 mes vencido
    await s.owner.client.patch(`${base(s)}/jugadores/${p5.playerId}/cuota`, { monthlyFee: 0, startMonth: monthsAgo(2) }); // gratis
    // p3 y p4 solo deben el mes en curso: son morosos únicamente si ya pasó el día 5.
    void p3; void p4;

    const { morosos } = (await dash(s)).data;
    assert.equal(morosos.list[0].playerId, p1.playerId);
    assert.equal(morosos.list[1].playerId, p2.playerId);
    assert.ok(morosos.list[0].overdue >= 160 && morosos.list[0].overdueMonths >= 2);
    assert.ok(morosos.list[1].overdue >= 80 && morosos.list[1].overdueMonths >= 1);
    assert.ok(morosos.list[0].overdue > morosos.list[1].overdue);
    assert.ok(!morosos.list.some((m) => m.playerId === p5.playerId), "el gratis no debe");
    assert.ok(morosos.count >= 2);
    assert.ok(morosos.overdue >= 240);
    assert.ok(morosos.owed >= morosos.overdue);

    // Quien se pone al día sale de la lista.
    await s.owner.client.post(`${base(s)}/cargos/${(await feeOf(s, p2, monthsAgo(1))).feeId}/abonos`, {});
    await s.owner.client.post(`${base(s)}/cargos/${(await feeOf(s, p2)).feeId}/abonos`, {});
    const after = (await dash(s)).data.morosos;
    assert.ok(!after.list.some((m) => m.playerId === p2.playerId));
  });

  test("el filtro por categoría deja solo a sus jugadores en cobro y morosos", async () => {
    const s = await setup("fcat");
    const [p1, , , p4] = s.players;
    await s.owner.client.get(`${base(s)}/pagos`);
    await s.owner.client.patch(`${base(s)}/jugadores/${p1.playerId}/cuota`, { startMonth: monthsAgo(1) });
    await s.owner.client.patch(`${base(s)}/jugadores/${p4.playerId}/cuota`, { startMonth: monthsAgo(1) });

    const sub = (await dash(s, `?categoria=${s.sub15}`)).data;
    assert.equal(sub.categoryId, s.sub15);
    assert.equal(sub.cobro.players, 3);
    assert.equal(sub.cobro.expected, 240);
    assert.ok(sub.morosos.list.every((m) => m.categoryName === "Sub 15"));
    const libre = (await dash(s, `?categoria=${s.libre}`)).data;
    assert.equal(libre.cobro.players, 2);
    assert.equal(libre.cobro.expected, 160);
    assert.ok(libre.morosos.list.some((m) => m.playerId === p4.playerId));
    assert.ok(!libre.morosos.list.some((m) => m.playerId === p1.playerId));
  });
});

describe("asistencia", () => {
  async function withAttendance() {
    const s = await setup("asi");
    const [p1, p2, p3, p4, p5] = s.players;
    const a = (await session(s, s.sub15)).data;
    await mark(s, a.id, p1, "presente");
    await mark(s, a.id, p2, "presente");
    await mark(s, a.id, p3, "ausente"); // 67 %
    const b = (await session(s, s.sub15)).data;
    await mark(s, b.id, p1, "presente");
    await mark(s, b.id, p2, "ausente"); // 50 %
    const c = (await session(s, s.libre)).data;
    await mark(s, c.id, p4, "presente");
    await mark(s, c.id, p5, "presente"); // 100 %
    const cancelled = (await session(s, s.sub15)).data;
    await s.owner.client.patch(`${base(s)}/sesiones/${cancelled.id}`, { status: "cancelada" });
    await session(s, s.sub15); // hoy y sin marcar
    return { s, p1, p2, p3, p4, p5 };
  }

  test("promedio del club y por categoría; justificadas, canceladas y sin marcar no cuentan", async () => {
    const { s } = await withAttendance();
    const { asistencia, sesiones } = (await dash(s)).data;
    assert.equal(asistencia.sessions, 3);
    assert.equal(asistencia.percent, Math.round((67 + 50 + 100) / 3));
    const cat = Object.fromEntries(asistencia.categories.map((c) => [c.name, c]));
    assert.deepEqual([cat["Sub 15"].sessions, cat["Sub 15"].percent], [2, 59]);
    assert.deepEqual([cat.Libre.sessions, cat.Libre.percent], [1, 100]);
    assert.deepEqual(sesiones, { realizadas: 3, canceladas: 1, sinMarcar: 1, proximas: 0 });
  });

  test("los jugadores de menor asistencia van primero", async () => {
    const { s, p3, p2 } = await withAttendance();
    const { lowest } = (await dash(s)).data.asistencia;
    assert.equal(lowest[0].playerId, p3.playerId);
    assert.equal(lowest[0].percent, 0);
    assert.equal(lowest[1].playerId, p2.playerId);
    assert.equal(lowest[1].percent, 50);
    assert.ok(lowest.every((p, i) => i === 0 || lowest[i - 1].percent <= p.percent));
    assert.ok(lowest.length <= 8);
  });

  test("la tendencia semanal trae 12 semanas, con las sesiones de hoy en la última", async () => {
    const { s } = await withAttendance();
    const { trend } = (await dash(s)).data.asistencia;
    assert.equal(trend.length, 12);
    assert.deepEqual([trend[11].sessions, trend[11].percent], [3, 72]);
    assert.ok(trend.slice(0, 11).every((w) => w.percent === null));
    assert.ok(trend.every((w, i) => i === 0 || trend[i - 1].weekStart < w.weekStart));
  });

  test("el filtro por categoría recalcula todo con esa categoría, pero el desglose sigue comparando a todas", async () => {
    const { s } = await withAttendance();
    const d = (await dash(s, `?categoria=${s.sub15}`)).data;
    assert.deepEqual([d.asistencia.percent, d.asistencia.sessions], [59, 2]);
    assert.deepEqual(d.sesiones, { realizadas: 2, canceladas: 1, sinMarcar: 1, proximas: 0 });
    assert.equal(d.asistencia.categories.length, 2, "ambas categorías siguen a la vista");
    assert.ok(d.asistencia.lowest.every((p) => p.categoryName === "Sub 15"));
    assert.equal(d.asistencia.trend[11].percent, 59);
  });

  test("un mes anterior no trae las sesiones de este mes", async () => {
    const { s } = await withAttendance();
    const prev = (await dash(s, `?mes=${monthsAgo(1)}`)).data;
    assert.equal(prev.asistencia.percent, null);
    assert.equal(prev.asistencia.sessions, 0);
    assert.deepEqual(prev.sesiones, { realizadas: 0, canceladas: 0, sinMarcar: 0, proximas: 0 });
  });
});
