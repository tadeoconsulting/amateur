// Gestión del club · entrenamientos y asistencia (especificación 015, entrega 2) contra un servidor real: lugares del club,
// horarios semanales que generan sesiones, sesiones sueltas, cancelar y mover, pasar lista (todos sin marcar al inicio),
// promedios y permisos. Usá una base DE PRUEBA, no producción.
//
//   TEST_BASE_URL=http://localhost:3000 npm run test:api

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client, RUN, newUser } from "./helpers.mjs";

// La fecha de hoy en Perú (UTC-5), como la calcula el servidor.
const peruDate = (offsetDays = 0) => new Date(Date.now() - 5 * 3600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);

/** Un delegado con su equipo, dos categorías y jugadores repartidos en ellas. */
async function setup(label, { sub15 = 2, libre = 1 } = {}) {
  const owner = await newUser(`${label}own`, ["CLUB_OWNER"]);
  const club = await owner.client.post("/api/clubs", { name: `${label} ${RUN}`, shortName: label.slice(0, 3).toUpperCase() });
  assert.equal(club.status, 201);
  const clubId = club.data.id;
  const cat = async (name) => {
    const r = await owner.client.post(`/api/clubs/${clubId}/categories`, { name, gender: "masculino" });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    return r.data.id;
  };
  const sub15Id = await cat("Sub 15");
  const libreId = await cat("Libre");
  const members = [];
  const add = async (n, categoryId, tag) => {
    for (let i = 0; i < n; i++) {
      const u = await newUser(`${label}${tag}${i}`, ["JUGADOR"]);
      const r = await owner.client.post(`/api/clubs/${clubId}/players`, { userId: u.id, categoryId });
      assert.equal(r.status, 201, JSON.stringify(r.data));
      members.push({ ...u, playerId: r.data.id, categoryId });
    }
  };
  await add(sub15, sub15Id, "s");
  await add(libre, libreId, "l");
  const place = await owner.client.post(`/api/clubs/${clubId}/gestion/lugares`, { name: "Colegio Perú Suizo" });
  assert.equal(place.status, 201, JSON.stringify(place.data));
  return { owner, clubId, sub15Id, libreId, members, placeId: place.data.id };
}

const base = (s) => `/api/clubs/${s.clubId}/gestion`;
const addSession = (s, body = {}) =>
  s.owner.client.post(`${base(s)}/sesiones`, { date: peruDate(-7), time: "19:00", durationMin: 90, placeId: s.placeId, categoryId: s.sub15Id, ...body });
const roster = (s, sessionId) => s.owner.client.get(`${base(s)}/sesiones/${sessionId}/asistencia`);
const mark = (s, sessionId, playerId, status) => s.owner.client.request("PUT", `${base(s)}/sesiones/${sessionId}/asistencia/${playerId}`, { status });
const sessionsOf = async (s, q = "") => (await s.owner.client.get(`${base(s)}/sesiones${q}`)).data.sessions;

describe("lugares del club", () => {
  test("se crean, se listan y no se repiten", async () => {
    const s = await setup("lug", { sub15: 0, libre: 0 });
    const second = await s.owner.client.post(`${base(s)}/lugares`, { name: "Parque de las Américas", address: "Av. Brasil" });
    assert.equal(second.status, 201);
    assert.equal(second.data.address, "Av. Brasil");
    const list = await s.owner.client.get(`${base(s)}/lugares`);
    assert.deepEqual(list.data.map((p) => p.name), ["Colegio Perú Suizo", "Parque de las Américas"]);
    const dup = await s.owner.client.post(`${base(s)}/lugares`, { name: "  parque DE las américas " });
    assert.equal(dup.status, 409);
  });

  test("valida el nombre", async () => {
    const s = await setup("lv", { sub15: 0, libre: 0 });
    for (const bad of [{}, { name: "" }, { name: "   " }, { name: "x".repeat(81) }, { name: 5 }, { name: "ok", address: "y".repeat(161) }]) {
      assert.equal((await s.owner.client.post(`${base(s)}/lugares`, bad)).status, 400, JSON.stringify(bad).slice(0, 40));
    }
  });

  test("se editan y se archivan; uno sin uso se borra de verdad", async () => {
    const s = await setup("lea", { sub15: 0, libre: 0 });
    const spare = (await s.owner.client.post(`${base(s)}/lugares`, { name: "Cancha sobrante" })).data;
    const renamed = await s.owner.client.patch(`${base(s)}/lugares/${spare.id}`, { name: "Cancha de la esquina" });
    assert.equal(renamed.data.name, "Cancha de la esquina");
    assert.equal((await s.owner.client.patch(`${base(s)}/lugares/${spare.id}`, { name: "Colegio Perú Suizo" })).status, 409);

    const del = await s.owner.client.del(`${base(s)}/lugares/${spare.id}`);
    assert.deepEqual(del.data, { deleted: true });
    assert.equal((await s.owner.client.get(`${base(s)}/lugares`)).data.length, 1);
  });

  test("un lugar con horarios se archiva, desactiva sus horarios y deja de aparecer", async () => {
    const s = await setup("arc", { sub15: 0, libre: 0 });
    const sch = await s.owner.client.post(`${base(s)}/horarios`, { weekday: 2, startTime: "19:00", durationMin: 90, placeId: s.placeId });
    assert.equal(sch.status, 201);
    const del = await s.owner.client.del(`${base(s)}/lugares/${s.placeId}`);
    assert.deepEqual(del.data, { archived: true });
    assert.deepEqual((await s.owner.client.get(`${base(s)}/lugares`)).data, []);
    assert.equal((await s.owner.client.get(`${base(s)}/lugares?archivados=1`)).data[0].archived, true);
    assert.deepEqual((await s.owner.client.get(`${base(s)}/horarios`)).data, []);
    // Y no se le puede crear un horario nuevo.
    const again = await s.owner.client.post(`${base(s)}/horarios`, { weekday: 2, startTime: "19:00", durationMin: 90, placeId: s.placeId });
    assert.equal(again.status, 400);
  });

  test("los lugares son del club: un co-delegado ve los mismos", async () => {
    const s = await setup("lco", { sub15: 0, libre: 0 });
    const inv = await s.owner.client.post(`/api/clubs/${s.clubId}/co-delegate-invitations`, {});
    const co = await newUser("lcoco");
    assert.equal((await co.client.post(`/api/co-delegate-invitations/${inv.data.url.split("/").pop()}/accept`)).status, 200);
    const list = await co.client.get(`${base(s)}/lugares`);
    assert.equal(list.status, 200);
    assert.deepEqual(list.data.map((p) => p.name), ["Colegio Perú Suizo"]);
    assert.equal((await co.client.post(`${base(s)}/lugares`, { name: "Parque del co-delegado" })).status, 201);
    assert.equal((await s.owner.client.get(`${base(s)}/lugares`)).data.length, 2);
  });
});

describe("horarios y sesiones generadas", () => {
  test("un horario semanal genera 4 sesiones en 28 días y no se duplican al leer otra vez", async () => {
    const s = await setup("gen");
    const sch = await s.owner.client.post(`${base(s)}/horarios`, { categoryId: s.sub15Id, weekday: 2, startTime: "19:00", durationMin: 90, placeId: s.placeId });
    assert.equal(sch.status, 201, JSON.stringify(sch.data));
    assert.equal(sch.data.placeName, "Colegio Perú Suizo");
    assert.equal(sch.data.categoryName, "Sub 15");

    const first = await sessionsOf(s);
    assert.equal(first.length, 4);
    for (const x of first) {
      assert.equal(x.weekday, 2, "cae en martes en Lima");
      assert.equal(x.time, "19:00");
      assert.equal(x.durationMin, 90);
      assert.equal(x.categoryName, "Sub 15");
      assert.equal(x.status, "programada");
    }
    assert.equal((await sessionsOf(s)).length, 4);
    // El jugador de Sub 15 está en la lista; el de Libre no cuenta para esta sesión.
    assert.equal(first[0].rosterSize, 2);
  });

  test("valida día, hora, duración, categoría y lugar", async () => {
    const s = await setup("hv", { sub15: 0, libre: 0 });
    const ok = { weekday: 2, startTime: "19:00", durationMin: 90, placeId: s.placeId };
    for (const bad of [{ weekday: 7 }, { weekday: "martes" }, { startTime: "7pm" }, { startTime: "25:00" }, { durationMin: 5 }, { durationMin: 400 }, { placeId: "" }, { placeId: "no-existe" }, { categoryId: "no-existe" }]) {
      assert.equal((await s.owner.client.post(`${base(s)}/horarios`, { ...ok, ...bad })).status, 400, JSON.stringify(bad));
    }
    // Una categoría de otro club no vale.
    const other = await setup("hvo", { sub15: 0, libre: 0 });
    assert.equal((await s.owner.client.post(`${base(s)}/horarios`, { ...ok, categoryId: other.sub15Id })).status, 400);
    assert.equal((await s.owner.client.post(`${base(s)}/horarios`, { ...ok, placeId: other.placeId })).status, 400);
  });

  test("un horario igual (mismo día, hora y categoría) se rechaza", async () => {
    const s = await setup("dup", { sub15: 0, libre: 0 });
    const body = { categoryId: s.sub15Id, weekday: 4, startTime: "18:30", durationMin: 60, placeId: s.placeId };
    assert.equal((await s.owner.client.post(`${base(s)}/horarios`, body)).status, 201);
    assert.equal((await s.owner.client.post(`${base(s)}/horarios`, body)).status, 409);
    // Otra categoría a la misma hora sí se puede.
    assert.equal((await s.owner.client.post(`${base(s)}/horarios`, { ...body, categoryId: s.libreId })).status, 201);
  });

  test("editar un horario rehace las sesiones futuras, pero respeta las que se movieron a mano", async () => {
    const s = await setup("edi", { sub15: 1, libre: 0 });
    const sch = (await s.owner.client.post(`${base(s)}/horarios`, { categoryId: s.sub15Id, weekday: 2, startTime: "19:00", durationMin: 90, placeId: s.placeId })).data;
    const before = await sessionsOf(s);
    assert.equal(before.length, 4);

    // La última se mueve a mano a las 20:30.
    const last = before[3];
    const moved = await s.owner.client.patch(`${base(s)}/sesiones/${last.id}`, { time: "20:30" });
    assert.equal(moved.status, 200);
    assert.equal(moved.data.time, "20:30");

    const edit = await s.owner.client.patch(`${base(s)}/horarios/${sch.id}`, { startTime: "18:00", durationMin: 60 });
    assert.equal(edit.status, 200, JSON.stringify(edit.data));
    const after = await sessionsOf(s);
    const byId = new Map(after.map((x) => [x.id, x]));
    assert.equal(byId.get(last.id).time, "20:30", "la movida a mano no se pisa");
    // Las futuras que nadie tocó (mañana en adelante) pasaron a 18:00 con 60 minutos.
    const rehechas = after.filter((x) => x.id !== last.id && x.date > peruDate());
    assert.ok(rehechas.length >= 2);
    for (const x of rehechas) {
      assert.equal(x.time, "18:00");
      assert.equal(x.durationMin, 60);
    }
  });

  test("quitar un horario borra las sesiones futuras sin tocar y conserva las pasadas", async () => {
    const s = await setup("qui", { sub15: 1, libre: 0 });
    const sch = (await s.owner.client.post(`${base(s)}/horarios`, { categoryId: s.sub15Id, weekday: 2, startTime: "19:00", durationMin: 90, placeId: s.placeId })).data;
    await sessionsOf(s);
    const del = await s.owner.client.del(`${base(s)}/horarios/${sch.id}`);
    assert.equal(del.status, 200);
    assert.deepEqual((await s.owner.client.get(`${base(s)}/horarios`)).data, []);
    const left = await sessionsOf(s);
    assert.ok(left.every((x) => x.date <= peruDate()), "no quedan sesiones futuras");
    assert.equal((await s.owner.client.del(`${base(s)}/horarios/${sch.id}`)).status, 404);
  });
});

describe("sesiones sueltas, cancelar y mover", () => {
  test("una sesión suelta se crea, se mueve y se borra", async () => {
    const s = await setup("sue", { sub15: 1, libre: 0 });
    const created = await addSession(s, { date: peruDate(3) });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    assert.equal(created.data.scheduleId, null);
    assert.equal(created.data.rosterSize, 1);
    const moved = await s.owner.client.patch(`${base(s)}/sesiones/${created.data.id}`, { date: peruDate(4), time: "17:15", durationMin: 120 });
    assert.equal(moved.status, 200);
    assert.equal(moved.data.date, peruDate(4));
    assert.equal(moved.data.time, "17:15");
    assert.equal(moved.data.durationMin, 120);
    assert.equal((await s.owner.client.del(`${base(s)}/sesiones/${created.data.id}`)).status, 200);
    assert.equal((await s.owner.client.del(`${base(s)}/sesiones/${created.data.id}`)).status, 404);
  });

  test("valida fecha, hora y duración, y no repite una sesión idéntica", async () => {
    const s = await setup("sva", { sub15: 0, libre: 0 });
    for (const bad of [{ date: "2026-02-31" }, { date: "mañana" }, { time: "7pm" }, { durationMin: 1 }, { placeId: "no-existe" }, { categoryId: "no-existe" }]) {
      assert.equal((await addSession(s, bad)).status, 400, JSON.stringify(bad));
    }
    assert.equal((await addSession(s)).status, 201);
    assert.equal((await addSession(s)).status, 409);
  });

  test("cancelar y restaurar; con asistencia marcada no se puede cancelar", async () => {
    const s = await setup("can", { sub15: 1, libre: 0 });
    const a = (await addSession(s)).data;
    const cancel = await s.owner.client.patch(`${base(s)}/sesiones/${a.id}`, { status: "cancelada" });
    assert.equal(cancel.data.status, "cancelada");
    assert.equal(cancel.data.canMark, false);
    assert.equal((await s.owner.client.patch(`${base(s)}/sesiones/${a.id}`, { status: "programada" })).data.status, "programada");

    await mark(s, a.id, s.members[0].playerId, "presente");
    assert.equal((await s.owner.client.patch(`${base(s)}/sesiones/${a.id}`, { status: "cancelada" })).status, 409);
    assert.equal((await s.owner.client.del(`${base(s)}/sesiones/${a.id}`)).status, 409, "con asistencia tampoco se borra");
    assert.equal((await s.owner.client.patch(`${base(s)}/sesiones/${a.id}`, { status: "cualquiera" })).status, 400);
    assert.equal((await s.owner.client.patch(`${base(s)}/sesiones/${a.id}`, {})).status, 400);
  });

  test("una sesión de un horario se cancela, no se borra", async () => {
    const s = await setup("hor", { sub15: 0, libre: 0 });
    await s.owner.client.post(`${base(s)}/horarios`, { weekday: 2, startTime: "19:00", durationMin: 90, placeId: s.placeId });
    const [first] = await sessionsOf(s);
    assert.equal((await s.owner.client.del(`${base(s)}/sesiones/${first.id}`)).status, 409);
  });
});

describe("pasar lista", () => {
  test("al abrir una sesión todos aparecen sin marcar y solo los de su categoría", async () => {
    const s = await setup("lis", { sub15: 3, libre: 2 });
    const a = (await addSession(s)).data;
    const res = await roster(s, a.id);
    assert.equal(res.status, 200);
    assert.equal(res.data.players.length, 3);
    assert.ok(res.data.players.every((p) => p.status === null));
    assert.equal(res.data.summary.marked, 0);
    assert.equal(res.data.summary.percent, null);
    assert.equal(res.data.canMark, true);
    assert.ok(res.data.players.every((p) => s.members.find((m) => m.playerId === p.playerId).categoryId === s.sub15Id));

    // Sin categoría: pasa lista todo el club.
    const club = (await addSession(s, { categoryId: null, time: "10:00" })).data;
    assert.equal((await roster(s, club.id)).data.players.length, 5);
  });

  test("marcar presente, ausente, justificado y volver a sin marcar; se guarda al instante", async () => {
    const s = await setup("mar", { sub15: 3, libre: 0 });
    const a = (await addSession(s)).data;
    const [p1, p2, p3] = s.members.map((m) => m.playerId);
    assert.equal((await mark(s, a.id, p1, "presente")).data.status, "presente");
    assert.equal((await mark(s, a.id, p2, "ausente")).data.status, "ausente");
    assert.equal((await mark(s, a.id, p3, "justificado")).data.status, "justificado");

    let r = (await roster(s, a.id)).data;
    assert.deepEqual({ ...r.summary }, { total: 3, marked: 3, presente: 1, ausente: 1, justificado: 1, percent: 50 });

    assert.equal((await mark(s, a.id, p2, "presente")).data.status, "presente", "se corrige con otro toque");
    assert.equal((await mark(s, a.id, p3, null)).data.status, null);
    r = (await roster(s, a.id)).data;
    assert.equal(r.summary.marked, 2);
    assert.equal(r.players.find((p) => p.playerId === p3).status, null);
    assert.equal(r.summary.percent, 100);
  });

  test("valida el estado, y no se pasa lista de una sesión futura ni cancelada", async () => {
    const s = await setup("rul", { sub15: 1, libre: 0 });
    const p = s.members[0].playerId;
    const past = (await addSession(s)).data;
    for (const bad of ["tarde", "PRESENTE", 1, undefined]) {
      assert.equal((await mark(s, past.id, p, bad)).status, 400, String(bad));
    }
    const future = (await addSession(s, { date: peruDate(2) })).data;
    assert.equal(future.canMark, false);
    assert.equal((await mark(s, future.id, p, "presente")).status, 409);

    // Una sesión de hoy sí se puede, aunque su hora no haya llegado.
    const today = (await addSession(s, { date: peruDate(), time: "23:30" })).data;
    assert.equal(today.canMark, true);
    assert.equal((await mark(s, today.id, p, "presente")).status, 200);

    await s.owner.client.patch(`${base(s)}/sesiones/${past.id}`, { status: "cancelada" });
    assert.equal((await mark(s, past.id, p, "presente")).status, 409);
  });

  test("un jugador de otra categoría u otro club no está en la lista", async () => {
    const s = await setup("oth", { sub15: 1, libre: 1 });
    const other = await setup("otx", { sub15: 1, libre: 0 });
    const a = (await addSession(s)).data;
    const libreMember = s.members.find((m) => m.categoryId === s.libreId);
    assert.equal((await mark(s, a.id, libreMember.playerId, "presente")).status, 404);
    assert.equal((await mark(s, a.id, other.members[0].playerId, "presente")).status, 404);
  });

  test("todos presentes marca solo a los que seguían sin marcar", async () => {
    const s = await setup("tod", { sub15: 3, libre: 0 });
    const a = (await addSession(s)).data;
    await mark(s, a.id, s.members[0].playerId, "ausente");
    const res = await s.owner.client.post(`${base(s)}/sesiones/${a.id}/asistencia`, { action: "todos_presentes" });
    assert.equal(res.status, 200);
    assert.equal(res.data.marked, 2);
    const r = (await roster(s, a.id)).data;
    assert.equal(r.players.find((p) => p.playerId === s.members[0].playerId).status, "ausente", "no pisa lo marcado");
    assert.equal(r.summary.presente, 2);
    assert.equal((await s.owner.client.post(`${base(s)}/sesiones/${a.id}/asistencia`, { action: "otra" })).status, 400);
  });
});

describe("promedios de asistencia", () => {
  test("promedio del club, de cada categoría y de cada jugador; justificadas, canceladas y sin marcar no cuentan", async () => {
    const s = await setup("pro", { sub15: 3, libre: 2 });
    const [a1, a2, a3] = s.members.filter((m) => m.categoryId === s.sub15Id).map((m) => m.playerId);
    const [l1, l2] = s.members.filter((m) => m.categoryId === s.libreId).map((m) => m.playerId);

    // Sub 15, sesión 1: a1 presente, a2 presente, a3 ausente → 67 %.
    const s1 = (await addSession(s, { date: peruDate(-10) })).data;
    await mark(s, s1.id, a1, "presente");
    await mark(s, s1.id, a2, "presente");
    await mark(s, s1.id, a3, "ausente");
    // Sub 15, sesión 2: a1 presente, a2 ausente, a3 justificado → 50 %.
    const s2 = (await addSession(s, { date: peruDate(-9) })).data;
    await mark(s, s2.id, a1, "presente");
    await mark(s, s2.id, a2, "ausente");
    await mark(s, s2.id, a3, "justificado");
    // Libre, sesión 3: l1 presente, l2 presente → 100 %.
    const s3 = (await addSession(s, { date: peruDate(-8), categoryId: s.libreId })).data;
    await mark(s, s3.id, l1, "presente");
    await mark(s, s3.id, l2, "presente");
    // Sin marcar y cancelada: no cuentan.
    await addSession(s, { date: peruDate(-6) });
    const cancelled = (await addSession(s, { date: peruDate(-5) })).data;
    await s.owner.client.patch(`${base(s)}/sesiones/${cancelled.id}`, { status: "cancelada" });

    const res = await s.owner.client.get(`${base(s)}/asistencia/resumen`);
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.club.sessions, 3);
    assert.equal(res.data.club.percent, Math.round((67 + 50 + 100) / 3));
    const cat = (id) => res.data.categories.find((c) => c.id === id);
    assert.deepEqual({ sessions: cat(s.sub15Id).sessions, percent: cat(s.sub15Id).percent }, { sessions: 2, percent: 59 });
    assert.deepEqual({ sessions: cat(s.libreId).sessions, percent: cat(s.libreId).percent }, { sessions: 1, percent: 100 });

    const p = (id) => res.data.players.find((x) => x.playerId === id);
    assert.deepEqual([p(a1).presente, p(a1).ausente, p(a1).percent], [2, 0, 100]);
    assert.deepEqual([p(a2).presente, p(a2).ausente, p(a2).percent], [1, 1, 50]);
    assert.deepEqual([p(a3).ausente, p(a3).justificado, p(a3).percent], [1, 1, 0]);
    // Los de menor asistencia primero.
    assert.equal(res.data.players[0].playerId, a3);
  });

  test("filtra por categoría y por fechas", async () => {
    const s = await setup("fil", { sub15: 1, libre: 1 });
    const a = s.members.find((m) => m.categoryId === s.sub15Id).playerId;
    const l = s.members.find((m) => m.categoryId === s.libreId).playerId;
    const old = (await addSession(s, { date: peruDate(-60) })).data;
    await mark(s, old.id, a, "ausente");
    const recent = (await addSession(s, { date: peruDate(-3) })).data;
    await mark(s, recent.id, a, "presente");
    const lib = (await addSession(s, { date: peruDate(-2), categoryId: s.libreId })).data;
    await mark(s, lib.id, l, "presente");

    const all = (await s.owner.client.get(`${base(s)}/asistencia/resumen`)).data;
    assert.equal(all.club.sessions, 3);
    const onlyRecent = (await s.owner.client.get(`${base(s)}/asistencia/resumen?desde=${peruDate(-10)}`)).data;
    assert.equal(onlyRecent.club.sessions, 2);
    const onlyLibre = (await s.owner.client.get(`${base(s)}/asistencia/resumen?categoria=${s.libreId}`)).data;
    assert.equal(onlyLibre.club.sessions, 1);
    assert.deepEqual(onlyLibre.players.map((p) => p.playerId), [l]);
    assert.equal((await s.owner.client.get(`${base(s)}/asistencia/resumen?categoria=no-existe`)).status, 400);
    assert.equal((await s.owner.client.get(`${base(s)}/asistencia/resumen?desde=ayer`)).status, 400);
  });

  test("sin sesiones marcadas no hay promedio, y los jugadores aparecen sin datos", async () => {
    const s = await setup("vac", { sub15: 2, libre: 0 });
    const res = (await s.owner.client.get(`${base(s)}/asistencia/resumen`)).data;
    assert.equal(res.club.percent, null);
    assert.equal(res.club.sessions, 0);
    assert.equal(res.players.length, 2);
    assert.ok(res.players.every((p) => p.percent === null));
  });
});

describe("permisos y privacidad", () => {
  test("sin sesión es 401, un jugador es 403 y otro club no ve nada", async () => {
    const s = await setup("per", { sub15: 1, libre: 0 });
    const other = await setup("pex", { sub15: 0, libre: 0 });
    const a = (await addSession(s)).data;
    const anon = new Client();
    const player = s.members[0];
    const urls = [
      ["GET", `${base(s)}/lugares`],
      ["GET", `${base(s)}/horarios`],
      ["GET", `${base(s)}/sesiones`],
      ["GET", `${base(s)}/sesiones/${a.id}/asistencia`],
      ["GET", `${base(s)}/asistencia/resumen`],
    ];
    for (const [method, url] of urls) {
      assert.equal((await anon.request(method, url)).status, 401, `${url} sin sesión`);
      assert.equal((await player.client.request(method, url)).status, 403, `${url} jugador`);
      assert.equal((await other.owner.client.request(method, url)).status, 403, `${url} otro club`);
    }
    assert.equal((await player.client.request("PUT", `${base(s)}/sesiones/${a.id}/asistencia/${player.playerId}`, { status: "presente" })).status, 403, "un jugador no se marca a sí mismo");
    assert.equal((await other.owner.client.post(`${base(s)}/horarios`, { weekday: 1, startTime: "10:00", durationMin: 60, placeId: s.placeId })).status, 403);
  });

  test("una sesión de otro club no existe para el delegado, aun con su propio club en la ruta", async () => {
    const s = await setup("ses", { sub15: 1, libre: 0 });
    const other = await setup("sex", { sub15: 1, libre: 0 });
    const a = (await addSession(s)).data;
    assert.equal((await other.owner.client.get(`${base(other)}/sesiones/${a.id}/asistencia`)).status, 404);
    assert.equal((await other.owner.client.patch(`${base(other)}/sesiones/${a.id}`, { status: "cancelada" })).status, 404);
    assert.equal((await other.owner.client.del(`${base(other)}/sesiones/${a.id}`)).status, 404);
    assert.equal((await mark(other, a.id, other.members[0].playerId, "presente")).status, 404);
    assert.equal((await other.owner.client.patch(`${base(other)}/lugares/${s.placeId}`, { name: "Robado" })).status, 404);
    assert.equal((await other.owner.client.del(`${base(other)}/horarios/cualquiera`)).status, 404);
  });

  test("un co-delegado pasa lista igual que el principal", async () => {
    const s = await setup("cod", { sub15: 1, libre: 0 });
    const inv = await s.owner.client.post(`/api/clubs/${s.clubId}/co-delegate-invitations`, {});
    const co = await newUser("codel2");
    assert.equal((await co.client.post(`/api/co-delegate-invitations/${inv.data.url.split("/").pop()}/accept`)).status, 200);
    const a = (await addSession(s)).data;
    const r = await co.client.request("PUT", `${base(s)}/sesiones/${a.id}/asistencia/${s.members[0].playerId}`, { status: "presente" });
    assert.equal(r.status, 200);
    assert.equal((await roster(s, a.id)).data.summary.presente, 1);
  });

  test("ninguna lectura del club ni del jugador filtra horarios ni asistencia", async () => {
    const s = await setup("fil2", { sub15: 1, libre: 0 });
    const a = (await addSession(s)).data;
    await mark(s, a.id, s.members[0].playerId, "ausente");
    const stranger = await newUser("curioso2", ["JUGADOR"]);
    const p = s.members[0];
    const reads = [
      stranger.client.get(`/api/clubs/${s.clubId}`),
      stranger.client.get(`/api/clubs/${s.clubId}/players`),
      stranger.client.get(`/api/players/${p.playerId}`),
      p.client.get(`/api/players/${p.playerId}`),
      s.owner.client.get(`/api/clubs/${s.clubId}/players`),
      new Client().get(`/api/clubs/${s.clubId}`),
    ];
    for (const r of await Promise.all(reads)) {
      const text = JSON.stringify(r.data ?? {});
      assert.doesNotMatch(text, /attendance|asistencia|ausente|trainingS|TrainingPlace|markedBy/i, text.slice(0, 200));
    }
  });
});
