// Pruebas de crear un club desde el admin sin delegado (especificación 009, entrega 5) contra un servidor real. Mismas
// instrucciones que auth.test.mjs: usá una base DE PRUEBA, no producción. Hace falta un administrador:
//
//   TEST_BASE_URL=http://localhost:3000 TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... npm run test:api

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client, PASSWORD, RUN, newUser } from "./helpers.mjs";

const adminCreds = process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD;
const skip = !adminCreds && "definí TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD";

let counter = 0;

async function admin() {
  const client = new Client();
  const r = await client.post("/api/auth/admin-login", { email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return client;
}

const clubBody = (extra = {}) => ({ name: `Sin delegado ${RUN} ${counter++}`, shortName: "SDL", withoutDelegate: true, ...extra });
const guestEmail = () => `sindel-${RUN}-${counter++}@test.amateur`;
const tokenOf = (link) => link.split("/").pop();

describe("crear un club sin delegado", { skip }, () => {
  test("el admin lo crea sin delegado ni correo: queda marcado y con el admin como dueño técnico", async () => {
    const a = await admin();
    const meAdmin = (await a.get("/api/auth/me")).data.user;
    const r = await a.post("/api/clubs", clubBody());
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.equal(r.data.withoutDelegate, true);
    assert.equal(r.data.isTemporary, false);
    assert.equal(r.data.ownerId, meAdmin.id);
    assert.equal(r.data.invitation, undefined, "sin correo no hay invitación");

    // Sin correo, el admin puede sacar el enlace cuando quiera.
    const inv = await a.post(`/api/clubs/${r.data.id}/delegate-invitation`, {});
    assert.equal(inv.status, 201, JSON.stringify(inv.data));
  });

  test("un usuario que no es admin no puede crear un club sin delegado: se ignora la marca", async () => {
    const owner = await newUser("sdlown", ["CLUB_OWNER"]);
    const r = await owner.client.post("/api/clubs", clubBody());
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.equal(r.data.withoutDelegate, false);
    assert.equal(r.data.ownerId, owner.id);
  });

  test("con un correo válido manda la invitación; uno inválido es 400 y no crea el club", async () => {
    const a = await admin();
    const body = clubBody();
    assert.equal((await a.post("/api/clubs", { ...body, inviteEmail: "no-es-un-correo" })).status, 400);
    const listed = await a.get(`/api/clubs?search=${encodeURIComponent(body.name)}&includeTemporary=1`);
    assert.equal(listed.data.length, 0, "no quedó un club a medias");

    const email = guestEmail();
    const r = await a.post("/api/clubs", { ...body, inviteEmail: ` ${email.toUpperCase()} ` });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.equal(r.data.invitation.email, email, "el correo se normaliza");
    assert.ok(["sent", "skipped", "failed"].includes(r.data.invitation.emailed));

    const current = await a.get(`/api/clubs/${r.data.id}/delegate-invitation`);
    assert.equal(current.status, 200);
    assert.equal(current.data.email, email);
    assert.equal(current.data.status, "pending");
  });

  test("sale en la búsqueda de equipos, pero sin los datos personales del admin", async () => {
    const a = await admin();
    const created = await a.post("/api/clubs", clubBody());
    const viewer = await newUser("sdlview", ["ORGANIZADOR"]);

    const search = await viewer.client.get(`/api/clubs?search=${encodeURIComponent(created.data.name)}`);
    assert.equal(search.status, 200);
    const found = search.data.find((c) => c.id === created.data.id);
    assert.ok(found, "es visible para los organizadores");
    assert.equal(found.withoutDelegate, true);
    assert.deepEqual(found.owner, { firstName: "Sin", lastName: "delegado" });

    const detail = await viewer.client.get(`/api/clubs/${created.data.id}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.data.owner.email, "");
    assert.equal(detail.data.owner.phone, null);
    assert.equal(detail.data.owner.lastName, "delegado");

    // El admin sí ve a quién pertenece.
    const adminView = await a.get(`/api/clubs?search=${encodeURIComponent(created.data.name)}&includeTemporary=1`);
    assert.notEqual(adminView.data.find((c) => c.id === created.data.id).owner.lastName, "delegado");
  });

  test("mientras no tiene delegado no acepta solicitudes de jugadores ni co-delegados", async () => {
    const a = await admin();
    const created = await a.post("/api/clubs", clubBody());
    const player = await newUser("sdlplay", ["JUGADOR"]);
    assert.equal((await player.client.post(`/api/clubs/${created.data.id}/join-requests`, {})).status, 409);
    const co = await a.post(`/api/clubs/${created.data.id}/co-delegate-invitations`, {});
    assert.equal(co.status, 409, JSON.stringify(co.data));
    const panel = await a.get(`/api/clubs/${created.data.id}/delegates`);
    assert.equal(panel.status, 200);
    assert.equal(panel.data.canInvite, false);
  });
});

describe("darle un delegado al club", { skip }, () => {
  test("quien acepta la invitación pasa a ser el delegado y el club deja de estar sin delegado", async () => {
    const a = await admin();
    const email = guestEmail();
    const created = await a.post("/api/clubs", clubBody({ inviteEmail: email }));
    const current = await a.get(`/api/clubs/${created.data.id}/delegate-invitation`);
    const token = tokenOf(current.data.url);

    // Lo que ve quien abre el enlace.
    const preview = await new Client().get(`/api/delegate-invitations/${token}`);
    assert.equal(preview.status, 200, JSON.stringify(preview.data));
    assert.equal(preview.data.clubName, created.data.name);

    const guest = new Client();
    const r = await guest.post(`/api/delegate-invitations/${token}/accept`, { firstName: "Delegada", lastName: "Prueba", password: PASSWORD });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    const me = (await guest.get("/api/auth/me")).data.user;
    assert.equal(me.email, email);
    assert.ok(me.roles.includes("CLUB_OWNER"));

    const club = (await guest.get(`/api/clubs/${created.data.id}`)).data;
    assert.equal(club.withoutDelegate, false);
    assert.equal(club.isTemporary, false);
    assert.equal(club.owner.id, me.id);
    assert.equal(club.owner.lastName, "Prueba", "ya se ve su delegado de verdad");

    // Con delegado ya admite solicitudes, y la invitación quedó usada.
    const player = await newUser("sdlafter", ["JUGADOR"]);
    assert.equal((await player.client.post(`/api/clubs/${created.data.id}/join-requests`, {})).status, 201);
    assert.equal((await new Client().get(`/api/delegate-invitations/${token}`)).status, 410);
    assert.equal((await a.post(`/api/clubs/${created.data.id}/delegate-invitation`, {})).status, 409, "ya tiene delegado");
  });

  test("el admin también puede oficializarlo a mano con una cuenta que ya existe", async () => {
    const a = await admin();
    const created = await a.post("/api/clubs", clubBody({ inviteEmail: guestEmail() }));
    const delegate = await newUser("sdlofi", ["CLUB_OWNER"]);
    const token = tokenOf((await a.get(`/api/clubs/${created.data.id}/delegate-invitation`)).data.url);

    const r = await a.post(`/api/clubs/${created.data.id}/oficializar`, { ownerId: delegate.id });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.ownerId, delegate.id);
    assert.equal(r.data.withoutDelegate, false);
    assert.equal(r.data.isTemporary, false);

    // La invitación pendiente se canceló y no se puede oficializar dos veces.
    assert.equal((await new Client().get(`/api/delegate-invitations/${token}`)).status, 410, "la invitación se canceló");
    assert.equal((await a.post(`/api/clubs/${created.data.id}/oficializar`, { ownerId: delegate.id })).status, 409);
  });

  test("una cuenta de admin no puede ser su delegada", async () => {
    const a = await admin();
    const created = await a.post("/api/clubs", clubBody());
    const meAdmin = (await a.get("/api/auth/me")).data.user;
    assert.equal((await a.post(`/api/clubs/${created.data.id}/oficializar`, { ownerId: meAdmin.id })).status, 400);
  });
});

describe("lo de siempre no cambia", { skip }, () => {
  test("crear un club con un delegado existente sigue funcionando", async () => {
    const a = await admin();
    const delegate = await newUser("sdlclasico", ["CLUB_OWNER"]);
    const r = await a.post("/api/clubs", { name: `Clásico ${RUN} ${counter++}`, shortName: "CLA", ownerId: delegate.id });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.equal(r.data.ownerId, delegate.id);
    assert.equal(r.data.withoutDelegate, false);
  });
});
