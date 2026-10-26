// Pruebas de GET /api/admin/equipos (Admin → Torneos → Equipos) contra un servidor real.
// Mismas instrucciones que auth.test.mjs: usá una base DE PRUEBA, no producción. Las que necesitan un administrador:
//
//   TEST_BASE_URL=http://localhost:3000 TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... npm run test:api

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client, RUN, newUser } from "./helpers.mjs";

const adminCreds = process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD;
const skip = !adminCreds && "definí TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD";

async function admin() {
  const client = new Client();
  const r = await client.post("/api/auth/admin-login", { email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return client;
}

async function tournamentWith(org, label, teamNames) {
  const t = await org.client.post("/api/tournaments", { name: `${label} ${RUN}`, startDate: "2026-11-01", location: "Cancha", format: "liga", maxTeams: 8, status: "inscripcion" });
  assert.equal(t.status, 201, JSON.stringify(t.data));
  for (const name of teamNames) {
    const team = await org.client.post(`/api/tournaments/${t.data.id}/teams`, { newClub: { name, shortName: "TMP" } });
    assert.equal(team.status, 201, JSON.stringify(team.data));
  }
  return t.data.id;
}

describe("quién puede ver los equipos", () => {
  test("sin sesión: 401", async () => {
    assert.equal((await new Client().get("/api/admin/equipos")).status, 401);
  });

  test("un organizador no es administrador: 403", async () => {
    const org = await newUser("orgeq", ["ORGANIZADOR"]);
    assert.equal((await org.client.get("/api/admin/equipos")).status, 403);
  });
});

describe("la lista de equipos", { skip }, () => {
  test("cada equipo sale una vez, con su torneo y su organizador, sin contacto del delegado", async () => {
    const org = await newUser("orgeq2", ["ORGANIZADOR"]);
    const name = `Equipo ${RUN}`;
    const tournamentId = await tournamentWith(org, "Copa Equipos", [name]);

    const a = await admin();
    const r = await a.get("/api/admin/equipos");
    assert.equal(r.status, 200);

    const rows = r.data.filter((t) => t.name === name);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].isTemporary, true);
    assert.deepEqual(rows[0].tournaments.map((t) => t.id), [tournamentId]);
    assert.ok(rows[0].tournaments[0].organizerName.length > 0);
    assert.equal("delegateEmail" in rows[0] || "email" in rows[0] || "phone" in rows[0], false);
  });

  test("un torneo eliminado ya no cuenta sus equipos", async () => {
    const org = await newUser("orgeq3", ["ORGANIZADOR"]);
    const name = `Equipo borrado ${RUN}`;
    const tournamentId = await tournamentWith(org, "Copa Borrada", [name]);

    const a = await admin();
    assert.equal((await a.del(`/api/tournaments/${tournamentId}`)).status, 200);

    const r = await a.get("/api/admin/equipos");
    assert.equal(r.data.filter((t) => t.name === name).length, 0);
  });
});
