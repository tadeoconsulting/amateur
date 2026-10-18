// Gestión del club · pagos (especificación 015, entrega 1) contra un servidor real: cuota estándar y monto propio,
// meses que se generan solos, abonos completos y parciales, anular con rastro, permisos y que ninguna lectura pública
// filtre cuotas. Usá una base DE PRUEBA, no producción.
//
//   TEST_BASE_URL=http://localhost:3000 npm run test:api

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client, RUN, newUser } from "./helpers.mjs";

/** Un delegado con su equipo y n jugadores ya en la planilla. */
async function setup(label, players = 2) {
  const owner = await newUser(`${label}own`, ["CLUB_OWNER"]);
  const club = await owner.client.post("/api/clubs", { name: `${label} ${RUN}`, shortName: label.slice(0, 3).toUpperCase() });
  assert.equal(club.status, 201);
  const clubId = club.data.id;
  const members = [];
  for (let i = 0; i < players; i++) {
    const u = await newUser(`${label}j${i}`, ["JUGADOR"]);
    const added = await owner.client.post(`/api/clubs/${clubId}/players`, { userId: u.id });
    assert.equal(added.status, 201, JSON.stringify(added.data));
    members.push({ ...u, playerId: added.data.id });
  }
  return { owner, clubId, members };
}

const base = (s) => `/api/clubs/${s.clubId}/gestion`;
const setFee = (s, monthlyFee, dueDay) => s.owner.client.patch(`${base(s)}/ajustes`, { monthlyFee, ...(dueDay ? { dueDay } : {}) });
const month = (s, mes) => s.owner.client.get(`${base(s)}/pagos${mes ? `?mes=${mes}` : ""}`);
const rowOf = (res, playerId) => res.data.players.find((p) => p.playerId === playerId);

describe("cuota estándar", () => {
  test("sin cuota definida no hay meses por cobrar y se avisa", async () => {
    const s = await setup("sin");
    const res = await month(s);
    assert.equal(res.status, 200);
    assert.equal(res.data.settings.defined, false);
    assert.deepEqual(res.data.players, []);
  });

  test("al definir S/ 80 todos los jugadores deben S/ 80 este mes", async () => {
    const s = await setup("est");
    assert.equal((await setFee(s, 80, 10)).status, 200);
    const res = await month(s);
    assert.equal(res.data.settings.monthlyFee, 80);
    assert.equal(res.data.settings.dueDay, 10);
    assert.equal(res.data.players.length, 2);
    for (const p of res.data.players) {
      assert.equal(p.amount, 80);
      assert.equal(p.status, "pendiente");
      assert.equal(p.balance, 80);
    }
    assert.equal(res.data.summary.expected, 160);
    assert.equal(res.data.summary.collected, 0);
    assert.equal(res.data.summary.percent, 0);
  });

  test("valida la cuota y el día de vencimiento", async () => {
    const s = await setup("val", 0);
    for (const bad of [-5, "abc", 80.123, 10001, null]) {
      assert.equal((await setFee(s, bad)).status, 400, String(bad));
    }
    assert.equal((await s.owner.client.patch(`${base(s)}/ajustes`, { dueDay: 0 })).status, 400);
    assert.equal((await s.owner.client.patch(`${base(s)}/ajustes`, { dueDay: 29 })).status, 400);
    assert.equal((await s.owner.client.patch(`${base(s)}/ajustes`, { dueDay: "5" })).status, 400);
    assert.equal((await s.owner.client.patch(`${base(s)}/ajustes`, "no es un objeto")).status, 400);
  });

  test("cambiar la cuota no reescribe el mes ya generado", async () => {
    const s = await setup("cam", 1);
    await setFee(s, 80);
    const first = await month(s);
    assert.equal(first.data.players[0].amount, 80);
    await setFee(s, 90);
    const after = await month(s);
    assert.equal(after.data.players[0].amount, 80, "el mes en curso conserva S/ 80");
    assert.equal(after.data.settings.monthlyFee, 90);
  });
});

describe("monto propio", () => {
  test("S/ 60 y gratis: se aplican al mes en curso sin abonos y a los meses que se generan", async () => {
    const s = await setup("prop", 3);
    const [a, b, c] = s.members;
    await setFee(s, 80);
    const current = (await month(s)).data.currentMonth;

    // A paga S/ 60, B es gratis, C hereda. Se les adelanta el primer mes a todos para que se genere el mes anterior.
    const prev = `${Number(current.slice(0, 4)) - (current.endsWith("-01") ? 1 : 0)}-${current.endsWith("-01") ? "12" : String(Number(current.slice(5)) - 1).padStart(2, "0")}`;
    for (const [m, fee] of [[a, 60], [b, 0], [c, null]]) {
      const r = await s.owner.client.patch(`${base(s)}/jugadores/${m.playerId}/cuota`, { monthlyFee: fee, startMonth: prev });
      assert.equal(r.status, 200, JSON.stringify(r.data));
      assert.equal(r.data.monthlyFee, fee);
    }

    const before = await month(s, prev);
    assert.equal(rowOf(before, a.playerId).amount, 60);
    assert.equal(rowOf(before, a.playerId).ownAmount, 60);
    assert.equal(rowOf(before, b.playerId).amount, 0);
    assert.equal(rowOf(before, b.playerId).status, "sin_cuota");
    assert.equal(rowOf(before, c.playerId).amount, 80);
    assert.equal(rowOf(before, c.playerId).ownAmount, null);

    // El mes en curso ya estaba generado con S/ 80 y nadie abonó: se ajustó solo.
    const now = await month(s);
    assert.equal(rowOf(now, a.playerId).amount, 60);
    assert.equal(rowOf(now, b.playerId).amount, 0);
    assert.equal(rowOf(now, c.playerId).amount, 80);

    // Y la deuda total suma los dos meses: A debe 60 + 60, B nada, C 80 + 80.
    const debt = await month(s);
    assert.equal(rowOf(debt, a.playerId).owed, 120);
    assert.equal(rowOf(debt, b.playerId).owed, 0);
    assert.equal(rowOf(debt, c.playerId).owed, 160);
  });

  test("el jugador gratis no se puede cobrar", async () => {
    const s = await setup("grat", 1);
    await setFee(s, 80);
    const p = s.members[0];
    await month(s);
    const r = await s.owner.client.patch(`${base(s)}/jugadores/${p.playerId}/cuota`, { monthlyFee: 0 });
    assert.equal(r.data.adjustedCurrentMonth, true);
    const row = rowOf(await month(s), p.playerId);
    assert.equal(row.status, "sin_cuota");
    assert.equal(row.owed, 0);
    const pay = await s.owner.client.post(`${base(s)}/cargos/${row.feeId}/abonos`, {});
    assert.equal(pay.status, 409);
  });

  test("si el mes en curso ya tiene un abono, el cambio de monto no lo toca", async () => {
    const s = await setup("abo", 1);
    await setFee(s, 80);
    const p = s.members[0];
    const feeId = rowOf(await month(s), p.playerId).feeId;
    await s.owner.client.post(`${base(s)}/cargos/${feeId}/abonos`, { amount: 30 });

    const r = await s.owner.client.patch(`${base(s)}/jugadores/${p.playerId}/cuota`, { monthlyFee: 60 });
    assert.equal(r.data.adjustedCurrentMonth, false);
    assert.equal(rowOf(await month(s), p.playerId).amount, 80);

    // Con el abono anulado el mes vuelve a poder ajustarse.
    const hist = await s.owner.client.get(`${base(s)}/jugadores/${p.playerId}/historial`);
    await s.owner.client.del(`${base(s)}/abonos/${hist.data.months[0].payments[0].id}`);
    const again = await s.owner.client.patch(`${base(s)}/jugadores/${p.playerId}/cuota`, { monthlyFee: 60 });
    assert.equal(again.data.adjustedCurrentMonth, true);
    assert.equal(rowOf(await month(s), p.playerId).amount, 60);
  });

  test("sin cuota del club definida, el cambio de un jugador no inventa meses en 0", async () => {
    const s = await setup("nod", 1);
    const p = s.members[0];
    const r = await s.owner.client.patch(`${base(s)}/jugadores/${p.playerId}/cuota`, { monthlyFee: null });
    assert.equal(r.status, 200);
    assert.deepEqual((await month(s)).data.players, []);
  });

  test("valida el monto propio y el primer mes", async () => {
    const s = await setup("pv", 1);
    const url = `${base(s)}/jugadores/${s.members[0].playerId}/cuota`;
    assert.equal((await s.owner.client.patch(url, { monthlyFee: -1 })).status, 400);
    assert.equal((await s.owner.client.patch(url, { startMonth: "2026-13" })).status, 400);
    assert.equal((await s.owner.client.patch(url, {})).status, 400);
  });

  test("un jugador de otro club no se puede tocar", async () => {
    const a = await setup("ca", 1);
    const b = await setup("cb", 1);
    const r = await a.owner.client.patch(`${base(a)}/jugadores/${b.members[0].playerId}/cuota`, { monthlyFee: 0 });
    assert.equal(r.status, 404);
  });
});

describe("meses", () => {
  test("un mes futuro o mal escrito se rechaza", async () => {
    const s = await setup("mes", 0);
    assert.equal((await month(s, "2099-01")).status, 400);
    assert.equal((await month(s, "octubre")).status, 400);
  });

  test("un jugador que entra después arranca en el mes en que entra", async () => {
    const s = await setup("tard", 1);
    await setFee(s, 80);
    await month(s);
    const late = await newUser("tardio", ["JUGADOR"]);
    const added = await s.owner.client.post(`/api/clubs/${s.clubId}/players`, { userId: late.id });
    assert.equal(added.status, 201);
    const res = await month(s);
    const row = rowOf(res, added.data.id);
    assert.ok(row, "aparece en la lista del mes en curso");
    assert.equal(row.amount, 80);
    assert.equal(row.owed, 80, "no debe meses anteriores a su ingreso");
  });
});

describe("ingreso por el enlace del club", () => {
  test("quien entra por el enlace arranca a pagar el mes en que entra", async () => {
    const s = await setup("enl", 0);
    await setFee(s, 80);
    assert.deepEqual((await month(s)).data.players, []);

    const { token } = (await s.owner.client.get(`/api/clubs/${s.clubId}/invite-link`)).data;
    const joiner = await newUser("enlace", ["JUGADOR"]);
    const r = await joiner.client.post(`/api/invitations/${token}/accept`, {});
    assert.equal(r.status, 200, JSON.stringify(r.data));

    const res = await month(s);
    assert.equal(res.data.players.length, 1);
    assert.equal(res.data.players[0].amount, 80);
    assert.equal(res.data.players[0].owed, 80);
  });
});

describe("abonos", () => {
  test("marcar pagado cobra el saldo completo y no se cobra dos veces", async () => {
    const s = await setup("pag", 1);
    await setFee(s, 80);
    const p = s.members[0];
    const feeId = rowOf(await month(s), p.playerId).feeId;

    const pay = await s.owner.client.post(`${base(s)}/cargos/${feeId}/abonos`, {});
    assert.equal(pay.status, 201, JSON.stringify(pay.data));
    assert.equal(pay.data.amount, 80);
    assert.equal(pay.data.status, "pagado");
    assert.ok(pay.data.paidAt, "la fecha la pone el servidor");

    const row = rowOf(await month(s), p.playerId);
    assert.equal(row.status, "pagado");
    assert.equal(row.balance, 0);
    assert.equal((await month(s)).data.summary.percent, 100);

    assert.equal((await s.owner.client.post(`${base(s)}/cargos/${feeId}/abonos`, {})).status, 409);
  });

  test("pago parcial: queda con saldo, no se pasa del saldo y se completa", async () => {
    const s = await setup("par", 1);
    await setFee(s, 80);
    const p = s.members[0];
    const feeId = rowOf(await month(s), p.playerId).feeId;
    const url = `${base(s)}/cargos/${feeId}/abonos`;

    const half = await s.owner.client.post(url, { amount: 30 });
    assert.equal(half.status, 201);
    assert.equal(half.data.status, "parcial");
    assert.equal(half.data.balance, 50);

    assert.equal((await s.owner.client.post(url, { amount: 60 })).status, 400, "no puede superar el saldo");
    assert.equal((await s.owner.client.post(url, { amount: 0 })).status, 400);
    assert.equal((await s.owner.client.post(url, { amount: -3 })).status, 400);
    assert.equal((await s.owner.client.post(url, { amount: "dos" })).status, 400);

    const rest = await s.owner.client.post(url, {});
    assert.equal(rest.data.amount, 50, "sin monto cobra lo que falta");
    assert.equal(rest.data.status, "pagado");
  });

  test("anular un abono devuelve el mes a pendiente y deja el rastro", async () => {
    const s = await setup("anu", 1);
    await setFee(s, 80);
    const p = s.members[0];
    const feeId = rowOf(await month(s), p.playerId).feeId;
    const pay = await s.owner.client.post(`${base(s)}/cargos/${feeId}/abonos`, {});

    const del = await s.owner.client.del(`${base(s)}/abonos/${pay.data.paymentId}`);
    assert.equal(del.status, 200);
    assert.equal(rowOf(await month(s), p.playerId).status, "pendiente");
    assert.equal((await s.owner.client.del(`${base(s)}/abonos/${pay.data.paymentId}`)).status, 409, "no se anula dos veces");

    const hist = await s.owner.client.get(`${base(s)}/jugadores/${p.playerId}/historial`);
    assert.equal(hist.status, 200);
    const [m] = hist.data.months;
    assert.equal(m.payments.length, 1, "el abono anulado sigue en el historial");
    assert.ok(m.payments[0].voidedAt);
    assert.match(m.payments[0].by, /own/);
    assert.match(m.payments[0].voidedBy, /own/);
    assert.equal(m.balance, 80);

    // Y se puede volver a cobrar.
    assert.equal((await s.owner.client.post(`${base(s)}/cargos/${feeId}/abonos`, {})).status, 201);
  });

  test("bajar el monto de un mes por debajo de lo abonado se rechaza", async () => {
    const s = await setup("baj", 1);
    await setFee(s, 80);
    const feeId = rowOf(await month(s), s.members[0].playerId).feeId;
    await s.owner.client.post(`${base(s)}/cargos/${feeId}/abonos`, { amount: 50 });
    assert.equal((await s.owner.client.patch(`${base(s)}/cargos/${feeId}`, { amountDue: 40 })).status, 409);
    assert.equal((await s.owner.client.patch(`${base(s)}/cargos/${feeId}`, { amountDue: 70 })).status, 200);
    assert.equal((await s.owner.client.patch(`${base(s)}/cargos/${feeId}`, { amountDue: -1 })).status, 400);
  });

  test("dos toques a la vez cobran una sola vez", async () => {
    const s = await setup("con", 1);
    await setFee(s, 80);
    const feeId = rowOf(await month(s), s.members[0].playerId).feeId;
    const results = await Promise.all(Array.from({ length: 5 }, () => s.owner.client.post(`${base(s)}/cargos/${feeId}/abonos`, {})));
    assert.equal(results.filter((r) => r.status === 201).length, 1);
    assert.equal(rowOf(await month(s), s.members[0].playerId).paid, 80);
  });
});

describe("permisos y privacidad", () => {
  test("sin sesión es 401 y un jugador común es 403", async () => {
    const s = await setup("per", 1);
    const anon = new Client();
    assert.equal((await anon.get(`${base(s)}/pagos`)).status, 401);
    assert.equal((await anon.patch(`${base(s)}/ajustes`, { monthlyFee: 80 })).status, 401);
    const player = s.members[0];
    assert.equal((await player.client.get(`${base(s)}/pagos`)).status, 403, "el jugador no ve los pagos del club");
    assert.equal((await player.client.patch(`${base(s)}/ajustes`, { monthlyFee: 1 })).status, 403);
  });

  test("el delegado de otro club no ve ni toca nada", async () => {
    const a = await setup("pa", 1);
    const b = await setup("pb", 1);
    await setFee(a, 80);
    const feeId = rowOf(await month(a), a.members[0].playerId).feeId;
    assert.equal((await b.owner.client.get(`${base(a)}/pagos`)).status, 403);
    assert.equal((await b.owner.client.post(`${base(a)}/cargos/${feeId}/abonos`, {})).status, 403);
    // Con su propio club en la ruta, el cargo de otro club no existe.
    assert.equal((await b.owner.client.post(`${base(b)}/cargos/${feeId}/abonos`, {})).status, 404);
    assert.equal((await b.owner.client.patch(`${base(b)}/cargos/${feeId}`, { amountDue: 1 })).status, 404);
    const pay = await a.owner.client.post(`${base(a)}/cargos/${feeId}/abonos`, {});
    assert.equal((await b.owner.client.del(`${base(b)}/abonos/${pay.data.paymentId}`)).status, 404);
  });

  test("un club que no existe es 403 para quien no es admin, sin revelar que no existe", async () => {
    const owner = await newUser("fan", ["CLUB_OWNER"]);
    assert.equal((await owner.client.get("/api/clubs/no-existe/gestion/pagos")).status, 403);
  });

  test("un co-delegado gestiona los pagos igual que el principal", async () => {
    const s = await setup("cod", 1);
    await setFee(s, 80);
    const inv = await s.owner.client.post(`/api/clubs/${s.clubId}/co-delegate-invitations`, {});
    assert.equal(inv.status, 201);
    const co = await newUser("codel");
    const accepted = await co.client.post(`/api/co-delegate-invitations/${inv.data.url.split("/").pop()}/accept`);
    assert.equal(accepted.status, 200, JSON.stringify(accepted.data));

    const res = await co.client.get(`${base(s)}/pagos`);
    assert.equal(res.status, 200);
    const feeId = rowOf(res, s.members[0].playerId).feeId;
    assert.equal((await co.client.post(`${base(s)}/cargos/${feeId}/abonos`, {})).status, 201);
    // y el principal lo ve en el historial, con el nombre de quien cobró.
    const hist = await s.owner.client.get(`${base(s)}/jugadores/${s.members[0].playerId}/historial`);
    assert.match(hist.data.months[0].payments[0].by, /codel/);
  });

  test("ninguna lectura del club ni del jugador filtra cuotas", async () => {
    const s = await setup("fil", 1);
    await setFee(s, 80);
    const p = s.members[0];
    await s.owner.client.patch(`${base(s)}/jugadores/${p.playerId}/cuota`, { monthlyFee: 55.5 });
    await month(s);

    const stranger = await newUser("curioso", ["JUGADOR"]);
    const reads = [
      stranger.client.get(`/api/clubs/${s.clubId}`),
      stranger.client.get("/api/clubs"),
      stranger.client.get(`/api/clubs/${s.clubId}/players`),
      stranger.client.get(`/api/players/${p.playerId}`),
      stranger.client.get(`/api/players`),
      s.owner.client.get(`/api/clubs/${s.clubId}/players`),
      s.owner.client.get(`/api/players/${p.playerId}`),
      new Client().get(`/api/clubs/${s.clubId}`),
    ];
    for (const r of await Promise.all(reads)) {
      const text = JSON.stringify(r.data ?? {});
      assert.doesNotMatch(text, /monthlyFee|amountDue|FeeSetting|feeSetting|dueDay|55\.5/i, text.slice(0, 200));
    }
  });
});
