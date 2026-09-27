// Pruebas de invitaciones de staff (delegado, asistente, DT) contra un servidor real. Usá una
// base DE PRUEBA.
//
//   TEST_BASE_URL=http://localhost:3000 npm run test:api

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client, RUN, newUser } from "./helpers.mjs";

async function ownerWithClub(label) {
  const owner = await newUser(`${label}dueno`, ["CLUB_OWNER"]);
  const club = await owner.client.post("/api/clubs", { name: `${label} ${RUN}`, shortName: "STF" });
  assert.equal(club.status, 201);
  return { owner, clubId: club.data.id };
}

describe("crear una invitación de staff", () => {
  test("solo el dueño del club, con email y role válidos", async () => {
    const s = await ownerWithClub("crea1");
    const email = `dt-${RUN}@test.amateur`;

    const noEmail = await s.owner.client.post(`/api/clubs/${s.clubId}/staff-invitations`, { role: "delegado" });
    assert.equal(noEmail.status, 400);

    const badRole = await s.owner.client.post(`/api/clubs/${s.clubId}/staff-invitations`, { email, role: "presidente" });
    assert.equal(badRole.status, 400);

    const stranger = await newUser("crea1extra", ["CLUB_OWNER"]);
    const noPermiso = await stranger.client.post(`/api/clubs/${s.clubId}/staff-invitations`, { email, role: "delegado" });
    assert.equal(noPermiso.status, 403);

    assert.equal((await new Client().post(`/api/clubs/${s.clubId}/staff-invitations`, { email, role: "delegado" })).status, 401);

    const ok = await s.owner.client.post(`/api/clubs/${s.clubId}/staff-invitations`, { email, role: "director_tecnico" });
    assert.equal(ok.status, 201);
    assert.ok(ok.data.token.length >= 20, "token largo");
  });

  test("invitar dos veces al mismo correo y rol devuelve la misma invitación, no crea otra", async () => {
    const s = await ownerWithClub("crea2");
    const email = `repetido-${RUN}@test.amateur`;
    const first = await s.owner.client.post(`/api/clubs/${s.clubId}/staff-invitations`, { email, role: "asistente" });
    assert.equal(first.status, 201);

    const second = await s.owner.client.post(`/api/clubs/${s.clubId}/staff-invitations`, { email, role: "asistente" });
    assert.equal(second.status, 200);
    assert.equal(second.data.alreadyInvited, true);
    assert.equal(second.data.token, first.data.token);
  });

  test("a un rol distinto en el mismo club sí crea una invitación aparte", async () => {
    const s = await ownerWithClub("crea3");
    const email = `dosroles-${RUN}@test.amateur`;
    const asDelegado = await s.owner.client.post(`/api/clubs/${s.clubId}/staff-invitations`, { email, role: "delegado" });
    const asAsistente = await s.owner.client.post(`/api/clubs/${s.clubId}/staff-invitations`, { email, role: "asistente" });
    assert.equal(asDelegado.status, 201);
    assert.equal(asAsistente.status, 201);
    assert.notEqual(asDelegado.data.token, asAsistente.data.token);
  });
});

describe("vista previa pública", () => {
  test("sin sesión, muestra el club, el rol y el correo; un token falso da 404", async () => {
    const s = await ownerWithClub("prev1");
    const email = `preview-${RUN}@test.amateur`;
    const invite = await s.owner.client.post(`/api/clubs/${s.clubId}/staff-invitations`, { email, role: "director_tecnico" });

    const preview = await new Client().get(`/api/staff-invitations/${invite.data.token}`);
    assert.equal(preview.status, 200);
    assert.equal(preview.data.role, "director_tecnico");
    assert.equal(preview.data.email, email);
    assert.equal(preview.data.club.id, s.clubId);

    assert.equal((await new Client().get("/api/staff-invitations/no-existe")).status, 404);
  });
});

describe("aceptar una invitación", () => {
  test("crea la cuenta sin elegir perfil (queda JUGADOR), acepta, y aparece en la planilla del club", async () => {
    const s = await ownerWithClub("acc1");
    const email = `nuevo-dt-${RUN}@test.amateur`;
    const invite = await s.owner.client.post(`/api/clubs/${s.clubId}/staff-invitations`, { email, role: "director_tecnico" });

    const dt = new Client();
    const register = await dt.post("/api/auth/register", { email, password: "clave-segura-123", firstName: "Nuevo", lastName: "DT" });
    assert.equal(register.status, 201);
    assert.deepEqual(register.data.roles, ["JUGADOR"]);

    const accept = await dt.post(`/api/staff-invitations/${invite.data.token}/accept`, {});
    assert.equal(accept.status, 200);
    assert.equal(accept.data.role, "director_tecnico");

    const staff = await s.owner.client.get(`/api/clubs/${s.clubId}/staff`);
    const row = staff.data.find((m) => m.email === email);
    assert.ok(row, "el DT debe aparecer en /staff del club");
    assert.equal(row.role, "director_tecnico");
  });

  test("sin sesión da 401; una cuenta con otro correo no puede aceptarla (403)", async () => {
    const s = await ownerWithClub("acc2");
    const email = `ajena-${RUN}@test.amateur`;
    const invite = await s.owner.client.post(`/api/clubs/${s.clubId}/staff-invitations`, { email, role: "delegado" });

    assert.equal((await new Client().post(`/api/staff-invitations/${invite.data.token}/accept`, {})).status, 401);

    const otro = await newUser("acc2otro");
    assert.equal((await otro.client.post(`/api/staff-invitations/${invite.data.token}/accept`, {})).status, 403);
  });

  test("aceptarla dos veces la segunda vez da 410 (ya fue usada)", async () => {
    const s = await ownerWithClub("acc3");
    const email = `usada-${RUN}@test.amateur`;
    const invite = await s.owner.client.post(`/api/clubs/${s.clubId}/staff-invitations`, { email, role: "delegado" });

    const dt = new Client();
    await dt.post("/api/auth/register", { email, password: "clave-segura-123", firstName: "X", lastName: "Y" });
    assert.equal((await dt.post(`/api/staff-invitations/${invite.data.token}/accept`, {})).status, 200);
    assert.equal((await dt.post(`/api/staff-invitations/${invite.data.token}/accept`, {})).status, 410);
  });
});

describe("rechazar una invitación", () => {
  test("solo la propia cuenta, y no se puede aceptar después", async () => {
    const s = await ownerWithClub("dec1");
    const email = `rechaza-${RUN}@test.amateur`;
    const invite = await s.owner.client.post(`/api/clubs/${s.clubId}/staff-invitations`, { email, role: "asistente" });

    const otro = await newUser("dec1otro");
    assert.equal((await otro.client.post(`/api/staff-invitations/${invite.data.token}/decline`)).status, 403);

    const dt = new Client();
    await dt.post("/api/auth/register", { email, password: "clave-segura-123", firstName: "X", lastName: "Y" });
    assert.equal((await dt.post(`/api/staff-invitations/${invite.data.token}/decline`)).status, 200);
    assert.equal((await dt.post(`/api/staff-invitations/${invite.data.token}/accept`, {})).status, 410);
  });
});

describe("mis invitaciones", () => {
  test("solo las pendientes dirigidas a mi correo, no las de otra persona", async () => {
    const s = await ownerWithClub("mias1");
    const email = `mias-${RUN}@test.amateur`;

    // La cuenta se crea primero: así "mine" filtra por el correo real de la sesión.
    const dt = new Client();
    await dt.post("/api/auth/register", { email, password: "clave-segura-123", firstName: "X", lastName: "Y" });

    assert.equal((await dt.get("/api/staff-invitations/mine")).data.length, 0);

    const invite = await s.owner.client.post(`/api/clubs/${s.clubId}/staff-invitations`, { email, role: "director_tecnico" });
    const mine = await dt.get("/api/staff-invitations/mine");
    assert.equal(mine.status, 200);
    assert.equal(mine.data.length, 1);
    assert.equal(mine.data[0].token, invite.data.token);
    assert.equal(mine.data[0].role, "director_tecnico");

    await dt.post(`/api/staff-invitations/${invite.data.token}/accept`, {});
    assert.equal((await dt.get("/api/staff-invitations/mine")).data.length, 0, "una vez aceptada, deja de estar pendiente");
  });
});
