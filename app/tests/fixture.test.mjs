// Pruebas de iniciar el torneo y generar el fixture contra un servidor real.
// Mismas instrucciones que auth.test.mjs: usá una base DE PRUEBA, no producción.
//
//   TEST_BASE_URL=http://localhost:3000 npm run test:api

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client, RUN, newUser } from "./helpers.mjs";

const payload = (overrides = {}) => ({
  name: "Fixture " + RUN,
  startDate: "2026-10-01",
  location: "Estadio Municipal",
  format: "liga",
  maxTeams: 8,
  minutesPerHalf: 25, // horarios de 60 minutos
  status: "inscripcion",
  ...overrides,
});

const organizer = (label) => newUser(label, ["ORGANIZADOR"]);

/** Un torneo con `teams` equipos temporales ya inscritos. */
async function tournamentWith(org, teams, overrides = {}, groups = []) {
  const t = await org.client.post("/api/tournaments", payload(overrides));
  assert.equal(t.status, 201, JSON.stringify(t.data));
  for (let i = 0; i < teams; i++) {
    const r = await org.client.post(`/api/tournaments/${t.data.id}/teams`, {
      newClub: { name: `Equipo ${i + 1} ${RUN}`, shortName: `E${i + 1}` },
      groupName: groups[i],
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
  }
  return t.data.id;
}

// Todos los sábados de octubre de 2026 (3, 10, 17, 24, 31), de 18:00 a 22:00.
const saturday = (date, overrides = {}) => ({
  days: [6],
  startDate: date,
  endDate: date,
  startTime: "18:00",
  endTime: "22:00",
  venue: "torneo",
  ...overrides,
});
const SATURDAYS = ["2026-10-03", "2026-10-10", "2026-10-17", "2026-10-24", "2026-10-31"];
const weekly = (n, overrides = {}) => SATURDAYS.slice(0, n).map((d) => saturday(d, overrides));

const matchesOf = async (client, id) => (await client.get(`/api/matches?tournamentId=${id}`)).data;
const statusOf = async (client, id) => (await client.get(`/api/tournaments/${id}`)).data.status;

describe("permisos y validación", () => {
  test("sin sesión (401), otro organizador o un dueño de club (403) y torneo inexistente (404)", async () => {
    const org = await organizer("fxperm");
    const other = await organizer("fxotro");
    const id = await tournamentWith(org, 4);
    const body = { mode: "manual" };

    assert.equal((await new Client().post(`/api/tournaments/${id}/fixture`, body)).status, 401);
    assert.equal((await other.client.post(`/api/tournaments/${id}/fixture`, body)).status, 403);
    assert.equal((await other.client.del(`/api/tournaments/${id}/fixture`)).status, 403);
    assert.equal((await org.client.post(`/api/tournaments/no-existe/fixture`, body)).status, 404);
    assert.equal(await statusOf(org.client, id), "inscripcion", "nada cambió");
  });

  test("mode y matchdays inválidos dan 400", async () => {
    const org = await organizer("fxval");
    const id = await tournamentWith(org, 4);
    const path = `/api/tournaments/${id}/fixture`;

    assert.equal((await org.client.post(path, {})).status, 400);
    assert.equal((await org.client.post(path, { mode: "mágico" })).status, 400);
    assert.equal((await org.client.post(path, { mode: "auto" })).status, 400, "auto sin matchdays");
    assert.equal((await org.client.post(path, { mode: "auto", matchdays: "x" })).status, 400);
    assert.equal((await org.client.post(path, { mode: "auto", matchdays: [null, null, null] })).status, 400);

    const few = await org.client.post(path, { mode: "auto", matchdays: weekly(2) });
    assert.equal(few.status, 400);
    assert.match(few.data.error, /3 fechas/);

    const badDay = await org.client.post(path, { mode: "auto", matchdays: [saturday(SATURDAYS[0], { days: [] }), ...weekly(2)] });
    assert.equal(badDay.status, 400);
    assert.equal(badDay.data.matchday, 1);

    const badTime = await org.client.post(path, { mode: "auto", matchdays: [...weekly(2), saturday(SATURDAYS[2], { startTime: "9pm" })] });
    assert.equal(badTime.status, 400);
    assert.equal(badTime.data.matchday, 3);

    assert.equal(await statusOf(org.client, id), "inscripcion", "un error no deja el torneo a medias");
    assert.equal((await matchesOf(org.client, id)).length, 0);
  });

  test("no se puede iniciar con menos de 2 equipos, ni por debajo del mínimo, ni con un formato sin fixture", async () => {
    const org = await organizer("fxestado");
    const path = (id) => `/api/tournaments/${id}/fixture`;

    const one = await tournamentWith(org, 1);
    const r1 = await org.client.post(path(one), { mode: "manual" });
    assert.equal(r1.status, 409);
    assert.match(r1.data.error, /2 equipos/);

    const min = await tournamentWith(org, 3, { minTeams: 4 });
    const r2 = await org.client.post(path(min), { mode: "manual" });
    assert.equal(r2.status, 409);
    assert.match(r2.data.error, /mínimo/);

    for (const format of ["eliminacion", "copa", "relampago"]) {
      const id = await tournamentWith(org, 4, { format });
      const r = await org.client.post(path(id), { mode: "manual" });
      assert.equal(r.status, 409, format);
      assert.match(r.data.error, /formato/);
      assert.equal(await statusOf(org.client, id), "inscripcion");
    }
  });
});

describe("programación automática", () => {
  test("liga de 4 equipos: 6 partidos en 3 fechas, con día, hora y sede, sin choques", async () => {
    const org = await organizer("fxauto");
    const id = await tournamentWith(org, 4);
    const r = await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "auto", matchdays: weekly(3) });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.deepEqual(r.data, { mode: "auto", matchdays: 3, matches: 6 });
    assert.equal(await statusOf(org.client, id), "en_curso");

    const matches = await matchesOf(org.client, id);
    assert.equal(matches.length, 6);
    for (const m of matches) {
      assert.equal(m.status, "programado");
      assert.equal(m.location, "Estadio Municipal");
      assert.match(m.time, /^\d\d:\d\d$/);
      assert.equal(new Date(m.date).getUTCDay(), 6, "solo sábados");
      assert.equal(m.date.slice(0, 10), SATURDAYS[m.matchday - 1], `la fecha ${m.matchday} cae en su sábado`);
    }
    // Ningún horario repetido en la sede, y cada equipo juega una vez por fecha.
    const slots = matches.map((m) => `${m.date}|${m.time}`);
    assert.equal(new Set(slots).size, 6);
    for (let md = 1; md <= 3; md++) {
      const teams = matches.filter((m) => m.matchday === md).flatMap((m) => [m.homeTeamId, m.awayTeamId]);
      assert.equal(new Set(teams).size, 4, `fecha ${md}: juegan los 4 equipos`);
    }
    // Todos contra todos: 6 cruces distintos.
    const pairs = new Set(matches.map((m) => [m.homeTeamId, m.awayTeamId].sort().join("-")));
    assert.equal(pairs.size, 6);
  });

  test("la duración de los horarios sale de los minutos por tiempo del torneo", async () => {
    const org = await organizer("fxdur");
    const id = await tournamentWith(org, 4, { minutesPerHalf: 45 }); // 45+45+10 = 100 min
    const r = await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "auto", matchdays: weekly(3) });
    assert.equal(r.status, 201);
    const first = (await matchesOf(org.client, id)).filter((m) => m.matchday === 1).map((m) => m.time).sort();
    assert.deepEqual(first, ["18:00", "19:40"]);
  });

  test("cantidad impar de equipos: 5 equipos dan 10 partidos en 5 fechas", async () => {
    const org = await organizer("fximpar");
    const id = await tournamentWith(org, 5);
    const r = await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "auto", matchdays: weekly(5) });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.deepEqual(r.data, { mode: "auto", matchdays: 5, matches: 10 });
  });

  test("sede del local: cada partido en la cancha del equipo local", async () => {
    const org = await organizer("fxlocal");
    const id = await tournamentWith(org, 4);
    const r = await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "auto", matchdays: weekly(3, { venue: "local" }) });
    assert.equal(r.status, 201);
    for (const m of await matchesOf(org.client, id)) {
      assert.equal(m.location, `Cancha de ${m.homeTeam.name}`);
    }
  });

  test("faltan horarios: 400 claro y no queda nada creado", async () => {
    const org = await organizer("fxpoco");
    const id = await tournamentWith(org, 4);
    const tight = saturday(SATURDAYS[0], { startTime: "18:00", endTime: "19:00" }); // 1 horario para 2 partidos
    const r = await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "auto", matchdays: [tight, ...weekly(3).slice(1)] });
    assert.equal(r.status, 400);
    assert.equal(r.data.matchday, 1);
    assert.match(r.data.error, /horarios suficientes/);
    assert.equal(await statusOf(org.client, id), "inscripcion");
    assert.equal((await matchesOf(org.client, id)).length, 0);
  });

  test("con grupos: se juega dentro de cada grupo", async () => {
    const org = await organizer("fxgrupos");
    const id = await tournamentWith(org, 4, { format: "grupos" }, ["Grupo A", "Grupo A", "Grupo B", "Grupo B"]);
    const r = await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "auto", matchdays: weekly(1) });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.deepEqual(r.data, { mode: "auto", matchdays: 1, matches: 2 });
    const groups = (await matchesOf(org.client, id)).map((m) => m.groupName).sort();
    assert.deepEqual(groups, ["Grupo A", "Grupo B"]);
  });

  test("con grupos pero sin grupo asignado: 409", async () => {
    const org = await organizer("fxsingrupo");
    const id = await tournamentWith(org, 4, { format: "grupos" });
    const r = await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    assert.equal(r.status, 409);
    assert.match(r.data.error, /grupo/i);
  });

  test("una vez iniciado ya no se agregan ni quitan equipos", async () => {
    const org = await organizer("fxcerrado");
    const id = await tournamentWith(org, 4);
    await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "auto", matchdays: weekly(3) });
    const add = await org.client.post(`/api/tournaments/${id}/teams`, { newClub: { name: "Tarde", shortName: "TAR" } });
    assert.equal(add.status, 409);
    const detail = await org.client.get(`/api/tournaments/${id}`);
    const del = await org.client.del(`/api/tournaments/${id}/teams/${detail.data.teams[0].club.id}`);
    assert.equal(del.status, 409);
  });
});

describe("programación manual", () => {
  test("crea los cruces sin programar y pasa el torneo a en_curso", async () => {
    const org = await organizer("fxman");
    const id = await tournamentWith(org, 4);
    const r = await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    assert.equal(r.status, 201);
    assert.deepEqual(r.data, { mode: "manual", matchdays: 3, matches: 6 });
    assert.equal(await statusOf(org.client, id), "en_curso");

    for (const m of await matchesOf(org.client, id)) {
      assert.equal(m.time, "", "sin hora");
      assert.equal(m.location, "", "sin sede");
      assert.equal(m.date.slice(0, 10), "2026-10-01", "provisoriamente el inicio del torneo");
    }
  });

  test("se configura cada partido (día, hora, sede) y se valida", async () => {
    const org = await organizer("fxconf");
    const id = await tournamentWith(org, 4);
    await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    const [a] = await matchesOf(org.client, id);

    const bad = async (body, why) => assert.equal((await org.client.patch(`/api/matches/${a.id}`, body)).status, 400, why);
    await bad({ time: "25:00" }, "hora inexistente");
    await bad({ time: "6:30 pm" }, "hora en 12 h");
    await bad({ time: "18:0" }, "hora mal escrita");
    await bad({ date: "2026-02-31" }, "fecha inexistente");
    await bad({ date: "03/10/2026" }, "fecha con otro formato");
    await bad({ location: "x".repeat(201) }, "sede muy larga");
    await bad({ location: 5 }, "sede no es texto");

    const ok = await org.client.patch(`/api/matches/${a.id}`, { date: "2026-10-03", time: "18:30", location: "Cancha 1" });
    assert.equal(ok.status, 200, JSON.stringify(ok.data));
    const saved = (await org.client.get(`/api/matches/${a.id}`)).data;
    assert.equal(saved.date.slice(0, 10), "2026-10-03");
    assert.equal(saved.time, "18:30");
    assert.equal(saved.location, "Cancha 1");
  });

  test("detecta choques de sede y de equipo", async () => {
    const org = await organizer("fxchoque");
    const id = await tournamentWith(org, 4);
    await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    const all = await matchesOf(org.client, id);
    const first = all.find((m) => m.matchday === 1);
    const sameDay = all.filter((m) => m.matchday === 1);
    const other = all.find((m) => m.matchday === 2);
    const slot = { date: "2026-10-03", time: "18:00" };

    assert.equal((await org.client.patch(`/api/matches/${first.id}`, { ...slot, location: "Cancha 1" })).status, 200);

    // Mismo equipo (el visitante de la fecha 2 ya jugó contra alguien de la fecha 1, elegimos uno que repita).
    const sharesTeam = all.find((m) => m.matchday !== 1 && [m.homeTeamId, m.awayTeamId].some((t) => [first.homeTeamId, first.awayTeamId].includes(t)));
    const teamClash = await org.client.patch(`/api/matches/${sharesTeam.id}`, { ...slot, location: "Cancha 2" });
    assert.equal(teamClash.status, 409, "un equipo no puede jugar dos partidos a la vez");

    // Misma sede a la misma hora.
    const venueClash = await org.client.patch(`/api/matches/${sameDay.find((m) => m.id !== first.id).id}`, { ...slot, location: "Cancha 1" });
    assert.equal(venueClash.status, 409);
    assert.match(venueClash.data.error, /choca/);

    // Otra cancha a la misma hora sí se puede (equipos distintos de la misma fecha).
    const ok = await org.client.patch(`/api/matches/${sameDay.find((m) => m.id !== first.id).id}`, { ...slot, location: "Cancha 2" });
    assert.equal(ok.status, 200);

    // Y no choca consigo mismo al volver a guardarse.
    assert.equal((await org.client.patch(`/api/matches/${first.id}`, { ...slot, location: "Cancha 1" })).status, 200);
    assert.ok(other, "hay partidos de otras fechas");
  });

  test("solo el organizador reprograma, y solo un partido que no empezó", async () => {
    const org = await organizer("fxrepro");
    const stranger = await organizer("fxrepro2");
    const id = await tournamentWith(org, 4);
    await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    const [m] = await matchesOf(org.client, id);

    assert.equal((await stranger.client.patch(`/api/matches/${m.id}`, { time: "18:00" })).status, 403);
    assert.equal((await new Client().patch(`/api/matches/${m.id}`, { time: "18:00" })).status, 401);

    assert.equal((await org.client.patch(`/api/matches/${m.id}`, { status: "finalizado", homeScore: 1, awayScore: 0 })).status, 200);
    const late = await org.client.patch(`/api/matches/${m.id}`, { time: "20:00" });
    assert.equal(late.status, 409);
    assert.match(late.data.error, /todavía no empezó/);
  });
});

describe("reemplazar y deshacer el fixture", () => {
  test("volver a generar exige reemplazar, y reemplaza por uno nuevo", async () => {
    const org = await organizer("fxrepl");
    const id = await tournamentWith(org, 4);
    const path = `/api/tournaments/${id}/fixture`;
    assert.equal((await org.client.post(path, { mode: "manual" })).status, 201);
    const before = (await matchesOf(org.client, id)).map((m) => m.id);

    const again = await org.client.post(path, { mode: "manual" });
    assert.equal(again.status, 409);
    assert.match(again.data.error, /reemplaz/);
    assert.deepEqual((await matchesOf(org.client, id)).map((m) => m.id).sort(), [...before].sort(), "no cambió nada");

    const replaced = await org.client.post(path, { mode: "auto", matchdays: weekly(3), replace: true });
    assert.equal(replaced.status, 201, JSON.stringify(replaced.data));
    const after = await matchesOf(org.client, id);
    assert.equal(after.length, 6);
    assert.ok(after.every((m) => !before.includes(m.id)), "son partidos nuevos");
    assert.ok(after.every((m) => m.time !== ""), "ahora sí programados");
  });

  test("no se reemplaza ni se deshace si ya hay un partido jugado", async () => {
    const org = await organizer("fxjugado");
    const id = await tournamentWith(org, 4);
    const path = `/api/tournaments/${id}/fixture`;
    await org.client.post(path, { mode: "manual" });
    const [m] = await matchesOf(org.client, id);
    await org.client.patch(`/api/matches/${m.id}`, { status: "finalizado", homeScore: 2, awayScore: 1 });

    const replace = await org.client.post(path, { mode: "manual", replace: true });
    assert.equal(replace.status, 409);
    assert.match(replace.data.error, /jugados/);
    const undo = await org.client.del(path);
    assert.equal(undo.status, 409);
    assert.equal((await matchesOf(org.client, id)).length, 6, "los partidos siguen ahí");
    assert.equal(await statusOf(org.client, id), "en_curso");
  });

  test("tampoco si un partido tiene eventos cargados", async () => {
    const org = await organizer("fxeventos");
    const id = await tournamentWith(org, 4);
    const path = `/api/tournaments/${id}/fixture`;
    await org.client.post(path, { mode: "manual" });
    const [m] = await matchesOf(org.client, id);
    const ev = await org.client.post(`/api/matches/${m.id}/events`, { type: "tarjeta_amarilla", minute: 10, teamId: m.homeTeamId });
    assert.equal(ev.status, 201);
    assert.equal((await org.client.del(path)).status, 409);
  });

  test("deshacer borra los partidos y reabre la inscripción", async () => {
    const org = await organizer("fxdeshacer");
    const id = await tournamentWith(org, 4);
    const path = `/api/tournaments/${id}/fixture`;
    await org.client.post(path, { mode: "auto", matchdays: weekly(3) });
    assert.equal(await statusOf(org.client, id), "en_curso");

    const r = await org.client.del(path);
    assert.equal(r.status, 200);
    assert.equal(r.data.deleted, 6);
    assert.equal(await statusOf(org.client, id), "inscripcion");
    assert.equal((await matchesOf(org.client, id)).length, 0);

    // Y otra vez se pueden agregar equipos.
    const add = await org.client.post(`/api/tournaments/${id}/teams`, { newClub: { name: "Nuevo", shortName: "NUE" } });
    assert.equal(add.status, 201);
  });
});
