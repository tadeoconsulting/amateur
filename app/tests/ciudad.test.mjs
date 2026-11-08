// La ciudad en Admin → Clubes y Admin → Jugadores (especificación 009, entrega 6) contra un servidor real. Mismas
// instrucciones que auth.test.mjs: usá una base DE PRUEBA, no producción. Hace falta un administrador:
//
//   TEST_BASE_URL=http://localhost:3000 TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... npm run test:api
//
// Las ciudades y los nombres son inventados.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client, RUN, newUser } from "./helpers.mjs";

const adminCreds = process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD;
const skip = !adminCreds && "definí TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD";

let counter = 0;

async function admin() {
  const client = new Client();
  const r = await client.post("/api/auth/admin-login", { email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return client;
}

const clubName = () => `Ciudad ${RUN} ${counter++}`;

describe("ciudad del club", () => {
  test("se puede poner al crear el club: se guarda sin espacios sobrantes y sale en la lista", async () => {
    const owner = await newUser("ciudown", ["CLUB_OWNER"]);
    const r = await owner.client.post("/api/clubs", { name: clubName(), shortName: "CIU", city: "  Ciudad   Prueba Uno " });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.equal(r.data.city, "Ciudad Prueba Uno");

    const mine = await owner.client.get(`/api/clubs?ownerId=${owner.id}`);
    assert.equal(mine.data[0].city, "Ciudad Prueba Uno");
    const detail = await owner.client.get(`/api/clubs/${r.data.id}`);
    assert.equal(detail.data.city, "Ciudad Prueba Uno");
  });

  test("sin ciudad queda en null", async () => {
    const owner = await newUser("ciunone", ["CLUB_OWNER"]);
    const r = await owner.client.post("/api/clubs", { name: clubName(), shortName: "CIN" });
    assert.equal(r.status, 201);
    assert.equal(r.data.city, null);
  });

  test("el delegado la cambia y la borra; una demasiado larga o que no es texto es 400", async () => {
    const owner = await newUser("ciuedit", ["CLUB_OWNER"]);
    const club = (await owner.client.post("/api/clubs", { name: clubName(), shortName: "CIE" })).data;

    const set = await owner.client.patch(`/api/clubs/${club.id}`, { city: "Ciudad Prueba Dos" });
    assert.equal(set.status, 200, JSON.stringify(set.data));
    assert.equal(set.data.city, "Ciudad Prueba Dos");

    assert.equal((await owner.client.patch(`/api/clubs/${club.id}`, { city: "a".repeat(61) })).status, 400);
    assert.equal((await owner.client.patch(`/api/clubs/${club.id}`, { city: 5 })).status, 400);
    assert.equal((await owner.client.get(`/api/clubs/${club.id}`)).data.city, "Ciudad Prueba Dos", "los rechazos no la tocaron");

    const cleared = await owner.client.patch(`/api/clubs/${club.id}`, { city: "   " });
    assert.equal(cleared.status, 200);
    assert.equal(cleared.data.city, null);

    const longOnCreate = await owner.client.post("/api/clubs", { name: clubName(), shortName: "CIL", city: "a".repeat(61) });
    assert.equal(longOnCreate.status, 400);
  });

  test("otro usuario no puede cambiarla", async () => {
    const owner = await newUser("ciuown2", ["CLUB_OWNER"]);
    const stranger = await newUser("ciustr", ["CLUB_OWNER"]);
    const club = (await owner.client.post("/api/clubs", { name: clubName(), shortName: "CIX", city: "Ciudad Prueba Tres" })).data;
    assert.equal((await stranger.client.patch(`/api/clubs/${club.id}`, { city: "Otra" })).status, 403);
    assert.equal((await owner.client.get(`/api/clubs/${club.id}`)).data.city, "Ciudad Prueba Tres");
  });

  test("un admin la pone al crear el club con o sin delegado", { skip }, async () => {
    const a = await admin();
    const sinDelegado = await a.post("/api/clubs", { name: clubName(), shortName: "CIA", withoutDelegate: true, city: "Ciudad Prueba Cuatro" });
    assert.equal(sinDelegado.status, 201, JSON.stringify(sinDelegado.data));
    assert.equal(sinDelegado.data.city, "Ciudad Prueba Cuatro");

    const delegate = await newUser("ciudel", ["CLUB_OWNER"]);
    const conDelegado = await a.post("/api/clubs", { name: clubName(), shortName: "CIB", ownerId: delegate.id, city: "Ciudad Prueba Cinco" });
    assert.equal(conDelegado.status, 201, JSON.stringify(conDelegado.data));
    assert.equal(conDelegado.data.city, "Ciudad Prueba Cinco");

    const listed = await a.get(`/api/clubs?search=${encodeURIComponent(sinDelegado.data.name)}&includeTemporary=1`);
    assert.equal(listed.data[0].city, "Ciudad Prueba Cuatro");
    // Un admin también la corrige.
    assert.equal((await a.patch(`/api/clubs/${sinDelegado.data.id}`, { city: "Ciudad Prueba Seis" })).data.city, "Ciudad Prueba Seis");
  });
});

describe("ciudad del jugador (el Departamento de su perfil)", () => {
  test("el admin la ve en la lista de jugadores; los demás, no", { skip }, async () => {
    const a = await admin();
    const owner = await newUser("ciuplown", ["CLUB_OWNER"]);
    const club = (await owner.client.post("/api/clubs", { name: clubName(), shortName: "CIP" })).data;

    const withCity = await newUser("ciujug1", ["JUGADOR"]);
    const withoutCity = await newUser("ciujug2", ["JUGADOR"]);
    assert.equal((await withCity.client.patch(`/api/users/${withCity.id}`, { department: "Lima" })).status, 200);
    for (const u of [withCity, withoutCity]) {
      const added = await owner.client.post(`/api/clubs/${club.id}/players`, { userId: u.id });
      assert.equal(added.status, 201, JSON.stringify(added.data));
    }

    const adminView = (await a.get(`/api/players?clubId=${club.id}`)).data;
    const rowWith = adminView.find((p) => p.userId === withCity.id);
    const rowWithout = adminView.find((p) => p.userId === withoutCity.id);
    assert.equal(rowWith.user.department, "Lima");
    assert.ok(!rowWithout.user.department, "sin departamento no hay ciudad");

    // Un delegado (o cualquier sesión) no recibe el dato.
    const ownerView = (await owner.client.get(`/api/players?clubId=${club.id}`)).data;
    for (const p of ownerView) assert.equal(p.user.department, undefined, "el departamento no sale para quien no es admin");
  });
});
