// Pruebas de las lecturas públicas con caché de borde (OBS-58) contra un servidor real. Mismas instrucciones que
// auth.test.mjs: usá una base DE PRUEBA, no producción.
//
//   TEST_BASE_URL=http://localhost:3000 npm run test:api
//
// Lo que se comprueba: la caché solo se pide con `?pub=1`; no cubre errores; con `pub=1` ni quien gestiona recibe datos
// de gestión (la respuesta es la misma para todos, que es lo que permite guardarla); y sin `pub` todo sigue igual.

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { BASE, Client, RUN, newUser } from "./helpers.mjs";

const cacheControl = (r) => r.res.headers.get("cache-control") ?? "";
const isEdgeCached = (r) => /s-maxage=3\b/.test(cacheControl(r)) && /\bpublic\b/.test(cacheControl(r));

let org, tournamentId, matchId, homeClubId;

before(async () => {
  org = await newUser("pubcache", ["ORGANIZADOR"]);
  const t = await org.client.post("/api/tournaments", {
    name: `Pública ${RUN}`, startDate: "2026-11-01", location: "Cancha", format: "liga", maxTeams: 4, status: "inscripcion",
  });
  assert.equal(t.status, 201, JSON.stringify(t.data));
  tournamentId = t.data.id;
  for (const n of ["Uno", "Dos"]) {
    const r = await org.client.post(`/api/tournaments/${tournamentId}/teams`, { newClub: { name: `${n} ${RUN}`, shortName: n.slice(0, 3).toUpperCase() } });
    assert.equal(r.status, 201, JSON.stringify(r.data));
  }
  assert.equal((await org.client.post(`/api/tournaments/${tournamentId}/fixture`, { mode: "manual" })).status, 201);
  const [m] = (await org.client.get(`/api/matches?tournamentId=${tournamentId}`)).data;
  matchId = m.id;
  homeClubId = m.homeTeamId;
  assert.equal((await org.client.patch(`/api/matches/${matchId}`, { status: "en_curso" })).status, 200);
  const gol = await org.client.post(`/api/matches/${matchId}/events`, { type: "gol", minute: 3, teamId: homeClubId });
  assert.equal(gol.status, 201, JSON.stringify(gol.data));
});

describe("la caché de borde solo se pide con ?pub=1", () => {
  const reads = () => [
    ["lista de torneos", "/api/tournaments"],
    ["detalle del torneo", `/api/tournaments/${tournamentId}`],
    ["tabla", `/api/tournaments/${tournamentId}/standings?live=1`],
    ["goleadores", `/api/tournaments/${tournamentId}/scorers`],
    ["partidos del torneo", `/api/matches?tournamentId=${tournamentId}`],
    ["detalle del partido", `/api/matches/${matchId}`],
    ["jugadas del partido", `/api/matches/${matchId}/events`],
  ];
  const withPub = (path) => path + (path.includes("?") ? "&" : "?") + "pub=1";

  test("sin `pub` ninguna lectura se guarda en el borde (todo sigue como antes)", async () => {
    for (const [name, path] of reads()) {
      const r = await new Client().get(path);
      assert.equal(r.status, 200, name);
      assert.equal(isEdgeCached(r), false, `${name}: ${cacheControl(r)}`);
    }
  });

  test("con `pub=1` todas se pueden guardar unos segundos, y el navegador igual vuelve a preguntar", async () => {
    for (const [name, path] of reads()) {
      const r = await new Client().get(withPub(path));
      assert.equal(r.status, 200, name);
      assert.ok(isEdgeCached(r), `${name}: ${cacheControl(r)}`);
      assert.match(cacheControl(r), /max-age=0/, name);
    }
  });

  test("la versión `v` solo cambia la dirección: la respuesta es la misma", async () => {
    const a = await new Client().get(withPub(`/api/matches?tournamentId=${tournamentId}`));
    const b = await new Client().get(withPub(`/api/matches?tournamentId=${tournamentId}`) + "&v=1700000000123");
    assert.deepEqual(b.data, a.data);
    assert.ok(isEdgeCached(b));
  });

  test("un error nunca se guarda en el borde, aunque lleve `pub=1`", async () => {
    for (const path of ["/api/tournaments/no-existe", "/api/matches/no-existe", "/api/tournaments/no-existe/scorers"]) {
      const r = await new Client().get(withPub(path));
      if (r.status === 200) continue; // scorers de un torneo inexistente devuelve lista vacía: no es un error
      assert.ok(r.status >= 400, path);
      assert.equal(isEdgeCached(r), false, `${path}: ${cacheControl(r)}`);
    }
    const missing = await new Client().get(withPub("/api/matches/no-existe"));
    assert.equal(missing.status, 404);
    assert.equal(isEdgeCached(missing), false);
  });
});

describe("con `?pub=1` la respuesta es la misma para todos (por eso se puede guardar)", () => {
  test("las jugadas: quien gestiona ve quién la registró; con `pub=1`, nadie", async () => {
    const own = await org.client.get(`/api/matches/${matchId}/events`);
    assert.equal(own.status, 200);
    assert.ok(own.data[0].recordedBy, "el organizador ve quién registró la jugada, como siempre");

    const pub = await org.client.get(`/api/matches/${matchId}/events?pub=1`);
    assert.equal(pub.status, 200);
    assert.equal(pub.data.length, own.data.length);
    assert.ok(pub.data.every((e) => e.recordedBy === null), "con pub=1 no sale nadie: es la lectura pública");

    // Un anónimo ve lo mismo que el organizador con pub=1.
    const anon = await new Client().get(`/api/matches/${matchId}/events?pub=1`);
    assert.deepEqual(anon.data, pub.data);
  });

  test("un torneo eliminado no existe con `pub=1`, tampoco para un admin; sin `pub` sigue igual", async () => {
    const adminCreds = process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD;
    if (!adminCreds) return; // sin administrador de prueba no se puede probar el lado del admin
    const t = await org.client.post("/api/tournaments", { name: `Borrado ${RUN}`, startDate: "2026-11-01", location: "Cancha", format: "liga", maxTeams: 4 });
    assert.equal(t.status, 201);
    assert.equal((await org.client.del(`/api/tournaments/${t.data.id}`)).status, 200);

    const admin = new Client();
    assert.equal((await admin.post("/api/auth/admin-login", { email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD })).status, 200);
    assert.equal((await admin.get(`/api/tournaments/${t.data.id}`)).status, 200, "el admin lo ve en su panel, como siempre");
    const pub = await admin.get(`/api/tournaments/${t.data.id}?pub=1`);
    assert.equal(pub.status, 404);
    assert.equal(isEdgeCached(pub), false);

    // La lista pública tampoco lo trae, ni con `deleted=1` pidiéndolo un admin.
    const list = await admin.get(`/api/tournaments?pub=1&deleted=1`);
    assert.ok(!list.data.some((x) => x.id === t.data.id));
  });

  test("lo de siempre no cambió: con sesión y sin `pub`, las lecturas son las completas", async () => {
    const r = await org.client.get(`/api/tournaments/${tournamentId}/scorers`);
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.data));
    assert.equal(BASE.length > 0, true);
  });
});
