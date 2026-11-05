// Pruebas del importador de jugadores del admin (especificación 009: POST y GET /api/admin/import-players): cargar a un
// club sin que juegue en ningún torneo, a todos los clubes o a un torneo, contra un servidor real. Usá una base DE PRUEBA,
// no producción. Los nombres y los DNI son inventados. Necesita un administrador:
//
//   TEST_BASE_URL=http://localhost:3000 TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... npm run test:api

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client, RUN, newUser, enrollByInvitation } from "./helpers.mjs";

const adminCreds = process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD;
const skip = !adminCreds && "definí TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD";

async function admin() {
  const client = new Client();
  const r = await client.post("/api/auth/admin-login", { email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return client;
}

// DNI inventados de 8 dígitos, distintos en cada corrida y en cada uso.
let nextDni = 10_000_000 + (Date.now() % 70_000_000);
const dni = () => String(nextDni++);

/** Un club que NO juega en ningún torneo. */
async function loneClub(label) {
  const owner = await newUser(label, ["CLUB_OWNER"]);
  const name = `Solo ${label} ${RUN}`;
  const club = await owner.client.post("/api/clubs", { name, shortName: label.slice(0, 3).toUpperCase() });
  assert.equal(club.status, 201, JSON.stringify(club.data));
  return { id: club.data.id, name, owner };
}

const sheet = (rows) => ["Nombres\tApellidos\tClub\tDNI\tFecha de nacimiento", ...rows.map((r) => r.join("\t"))].join("\n");
const sheetNoClub = (rows) => ["Nombres\tApellidos\tDNI\tFecha de nacimiento", ...rows.map((r) => r.join("\t"))].join("\n");
const send = (a, body) => a.post("/api/admin/import-players", body);

describe("permisos y datos incompletos", () => {
  test("solo un administrador: sin sesión 401, otro rol 403", async () => {
    const org = await newUser("impperm", ["ORGANIZADOR"]);
    assert.equal((await new Client().get("/api/admin/import-players")).status, 401);
    assert.equal((await org.client.get("/api/admin/import-players")).status, 403);
    assert.equal((await send(org.client, { scope: "all", text: "x", dryRun: true })).status, 403);
  });

  test("hay que elegir a dónde cargar, y un club inexistente da 404", { skip }, async () => {
    const a = await admin();
    assert.equal((await send(a, { text: "x", dryRun: true })).status, 400);
    assert.equal((await send(a, { scope: "otro", text: "x", dryRun: true })).status, 400);
    assert.equal((await send(a, { scope: "club", text: "x", dryRun: true })).status, 400, "sin clubId");
    assert.equal((await send(a, { scope: "tournament", text: "x", dryRun: true })).status, 400, "sin tournamentId");
    const missing = await send(a, { scope: "club", clubId: "no-existe", text: sheetNoClub([["Ana", "Prueba", dni(), "1990-01-15"]]), dryRun: true });
    assert.equal(missing.status, 404);
  });
});

describe("cargar a un club, sin torneo", { skip }, () => {
  test("lista los clubes elegibles, incluido uno que no juega en ningún torneo", async () => {
    const a = await admin();
    const club = await loneClub("implist");
    const r = await a.get("/api/admin/import-players");
    assert.equal(r.status, 200);
    assert.ok(r.data.some((c) => c.id === club.id && c.name === club.name));
  });

  test("las filas van al club elegido aunque la hoja no traiga la columna Club; se revisa y luego se guarda", async () => {
    const a = await admin();
    const club = await loneClub("impclub1");
    const text = sheetNoClub([
      ["Ana", "Prueba Uno", dni(), "1990-01-15"],
      ["Luis", "Prueba Dos", dni(), "2012-03-20"],
    ]);

    const review = await send(a, { scope: "club", clubId: club.id, text, dryRun: true });
    assert.equal(review.status, 200, JSON.stringify(review.data));
    assert.equal(review.data.target.kind, "club");
    assert.equal(review.data.target.name, club.name);
    assert.equal(review.data.totals.create, 2);
    assert.equal(review.data.totals.problems, 0);
    assert.equal(review.data.totals.minors, 1, "el de 2012 es menor");
    assert.deepEqual(review.data.totals.byClub, { [club.name]: 2 });

    // Revisar no guarda nada.
    assert.equal((await a.get(`/api/clubs/${club.id}/players`)).data.length, 0);

    const saved = await send(a, { scope: "club", clubId: club.id, text, dryRun: false });
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
    assert.equal(saved.data.created, 2);

    const players = (await a.get(`/api/clubs/${club.id}/players`)).data;
    assert.equal(players.length, 2);
    assert.ok(players.every((p) => p.provisional === true));
  });

  test("repetir la carga no duplica", async () => {
    const a = await admin();
    const club = await loneClub("impclub2");
    const text = sheetNoClub([["Marta", "Prueba Tres", dni(), "1988-07-01"]]);
    assert.equal((await send(a, { scope: "club", clubId: club.id, text, dryRun: false })).data.created, 1);
    const again = await send(a, { scope: "club", clubId: club.id, text, dryRun: false });
    assert.equal(again.status, 200);
    assert.equal(again.data.created, 0);
    assert.equal(again.data.loaded, 1);
    assert.equal((await a.get(`/api/clubs/${club.id}/players`)).data.length, 1);
  });

  test("una fila que nombra a otro club es un problema y no se carga nada (todo o nada)", async () => {
    const a = await admin();
    const club = await loneClub("impclub3");
    const text = sheet([
      ["Pedro", "Prueba Cuatro", club.name, dni(), "1991-02-02"],
      ["Rosa", "Prueba Cinco", "Otro Club Distinto", dni(), "1992-03-03"],
    ]);

    const review = await send(a, { scope: "club", clubId: club.id, text, dryRun: true });
    assert.equal(review.status, 200);
    assert.equal(review.data.totals.problems, 1);
    const bad = review.data.rows.find((r) => r.status === "problem");
    assert.equal(bad.row, 2);
    assert.match(bad.reason, /elegiste cargar en/);

    const saved = await send(a, { scope: "club", clubId: club.id, text, dryRun: false });
    assert.equal(saved.status, 409);
    assert.equal((await a.get(`/api/clubs/${club.id}/players`)).data.length, 0, "ni siquiera la fila buena");
  });

  test("un DNI ya cargado en otro club es un problema (un provisional está en un solo club)", async () => {
    const a = await admin();
    const [one, two] = [await loneClub("impdup1"), await loneClub("impdup2")];
    const shared = dni();
    assert.equal((await send(a, { scope: "club", clubId: one.id, text: sheetNoClub([["Sofía", "Prueba Seis", shared, "1990-01-15"]]), dryRun: false })).data.created, 1);
    const review = await send(a, { scope: "club", clubId: two.id, text: sheetNoClub([["Sofía", "Prueba Seis", shared, "1990-01-15"]]), dryRun: true });
    assert.equal(review.data.totals.problems, 1);
    assert.match(review.data.rows[0].reason, /otro equipo/);
  });
});

describe("cargar a todos los clubes", { skip }, () => {
  test("cada fila va al club que nombra, aunque ninguno juegue en un torneo", async () => {
    const a = await admin();
    const [one, two] = [await loneClub("impall1"), await loneClub("impall2")];
    const text = sheet([
      ["Iván", "Prueba Siete", one.name, dni(), "1990-01-15"],
      ["Elena", "Prueba Ocho", two.name, dni(), "1991-02-02"],
    ]);
    const review = await send(a, { scope: "all", text, dryRun: true });
    assert.equal(review.status, 200, JSON.stringify(review.data));
    assert.equal(review.data.target.kind, "all");
    assert.equal(review.data.totals.create, 2);
    assert.deepEqual(review.data.totals.byClub, { [one.name]: 1, [two.name]: 1 });

    assert.equal((await send(a, { scope: "all", text, dryRun: false })).data.created, 2);
    assert.equal((await a.get(`/api/clubs/${one.id}/players`)).data.length, 1);
    assert.equal((await a.get(`/api/clubs/${two.id}/players`)).data.length, 1);
  });

  test("un club que no existe, o sin club en la fila, es un problema que no habla de torneos", async () => {
    const a = await admin();
    const text = sheet([
      ["Julia", "Prueba Nueve", "Club Fantasma " + RUN, dni(), "1990-01-15"],
      ["Raúl", "Prueba Diez", "", dni(), "1990-01-15"],
    ]);
    const review = await send(a, { scope: "all", text, dryRun: true });
    assert.equal(review.data.totals.problems, 2);
    const [ghost, empty] = review.data.rows;
    assert.match(ghost.reason, /no coincide con ningún club de la plataforma/);
    assert.equal(empty.reason, "Falta el club");
    assert.doesNotMatch(ghost.reason, /torneo/);
  });
});

describe("cargar a un torneo (como siempre)", { skip }, () => {
  test("el club de cada fila se busca entre los equipos del torneo, con o sin indicar el modo", async () => {
    const a = await admin();
    const org = await newUser("impt1org", ["ORGANIZADOR"]);
    const club = await loneClub("imptor");
    const t = await org.client.post("/api/tournaments", { name: `Imp ${RUN}`, startDate: "2026-11-01", location: "Cancha", format: "liga", maxTeams: 4, status: "inscripcion" });
    assert.equal(t.status, 201, JSON.stringify(t.data));
    assert.equal((await enrollByInvitation(org, t.data.id, { client: club.owner.client, clubId: club.id })).status, 200);

    const text = sheet([["Gabriel", "Prueba Once", club.name, dni(), "1990-01-15"]]);
    const explicit = await send(a, { scope: "tournament", tournamentId: t.data.id, text, dryRun: true });
    assert.equal(explicit.status, 200, JSON.stringify(explicit.data));
    assert.equal(explicit.data.target.kind, "tournament");
    assert.equal(explicit.data.totals.create, 1);

    // Los clientes anteriores mandaban solo el torneo.
    const legacy = await send(a, { tournamentId: t.data.id, text, dryRun: true });
    assert.equal(legacy.status, 200);
    assert.equal(legacy.data.totals.create, 1);

    // Un club que no juega en ese torneo no se encuentra entre sus equipos.
    const other = await loneClub("imptor2");
    const miss = await send(a, { scope: "tournament", tournamentId: t.data.id, text: sheet([["Hugo", "Prueba Doce", other.name, dni(), "1990-01-15"]]), dryRun: true });
    assert.equal(miss.data.totals.problems, 1);
    assert.match(miss.data.rows[0].reason, /no es un equipo de este torneo/);
  });
});
