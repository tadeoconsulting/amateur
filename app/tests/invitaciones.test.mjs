// Pruebas de invitaciones a un club contra un servidor real: el link para compartir, las
// invitaciones a un jugador concreto y el registro con token. Usá una base DE PRUEBA.
//
//   TEST_BASE_URL=http://localhost:3000 npm run test:api

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client, PASSWORD, RUN, newUser } from "./helpers.mjs";

let counter = 0;

async function ownerWithClub(label) {
  const owner = await newUser(`${label}dueno`, ["CLUB_OWNER"]);
  const club = await owner.client.post("/api/clubs", { name: `${label} ${RUN}`, shortName: "CLB" });
  assert.equal(club.status, 201);
  return { owner, clubId: club.data.id };
}

const linkOf = async (s) => (await s.owner.client.get(`/api/clubs/${s.clubId}/invite-link`)).data;
const clubOf = async (client, userId) => (await client.get(`/api/users/${userId}`)).data.playerProfile?.club?.id ?? null;
const register = (body) => new Client().post("/api/auth/register", { password: PASSWORD, firstName: "Nuevo", lastName: "Jugador", ...body });

describe("link del club", () => {
  test("lo genera el dueño, es estable y solo el dueño lo ve", async () => {
    const s = await ownerWithClub("lk1");
    const a = await s.owner.client.get(`/api/clubs/${s.clubId}/invite-link`);
    assert.equal(a.status, 200);
    assert.ok(a.data.token.length >= 20, "token largo");
    assert.equal(a.data.path, `/jugador/invitacion?token=${a.data.token}`);
    assert.equal((await linkOf(s)).token, a.data.token, "pedirlo de nuevo no cambia el link");

    const stranger = await newUser("lk1extra", ["CLUB_OWNER"]);
    assert.equal((await stranger.client.get(`/api/clubs/${s.clubId}/invite-link`)).status, 403);
    assert.equal((await stranger.client.post(`/api/clubs/${s.clubId}/invite-link`)).status, 403);
    assert.equal((await new Client().get(`/api/clubs/${s.clubId}/invite-link`)).status, 401);
    assert.equal((await s.owner.client.get(`/api/clubs/club-inexistente/invite-link`)).status, 403);
  });

  test("generar uno nuevo revoca el anterior", async () => {
    const s = await ownerWithClub("lk2");
    const old = (await linkOf(s)).token;
    const rotated = await s.owner.client.post(`/api/clubs/${s.clubId}/invite-link`);
    assert.equal(rotated.status, 200);
    assert.notEqual(rotated.data.token, old);

    assert.equal((await new Client().get(`/api/invitations/${old}`)).status, 404, "el viejo ya no sirve");
    assert.equal((await new Client().get(`/api/invitations/${rotated.data.token}`)).status, 200);
  });

  test("la vista previa es pública y muestra solo lo del club", async () => {
    const s = await ownerWithClub("lk3");
    const { token } = await linkOf(s);
    const r = await new Client().get(`/api/invitations/${token}`);
    assert.equal(r.status, 200);
    assert.equal(r.data.kind, "link");
    assert.equal(r.data.club.id, s.clubId);
    assert.ok(r.data.club.name.startsWith("lk3"));
    assert.deepEqual(Object.keys(r.data.club).sort(), ["color", "id", "logoUrl", "name", "shortName"]);
    assert.equal(r.data.email, undefined);
    assert.equal(JSON.stringify(r.data).includes("owner"), false, "no filtra datos del dueño");

    assert.equal((await new Client().get(`/api/invitations/token-que-no-existe`)).status, 404);
    assert.equal((await new Client().get(`/api/invitations/${"x".repeat(150)}`)).status, 404);
  });

  test("una cuenta nueva se registra con el link y entra al club", async () => {
    const s = await ownerWithClub("lk4");
    const { token } = await linkOf(s);
    const email = `lk4-${RUN}-${counter++}@test.amateur`;
    const c = new Client();
    const r = await c.post("/api/auth/register", { email, password: PASSWORD, firstName: "Ana", lastName: "Link", position: "Portero", clubToken: token });
    assert.equal(r.status, 201, JSON.stringify(r.data));

    assert.equal(await clubOf(c, r.data.id), s.clubId);
    const roster = (await s.owner.client.get(`/api/clubs/${s.clubId}/players`)).data;
    const me = roster.find((p) => p.user.firstName === "Ana");
    assert.ok(me, "aparece en la plantilla del club");
    assert.equal(me.position, "Portero");
    // El link sirve para muchos: otra persona también.
    const second = await register({ email: `lk4b-${RUN}-${counter++}@test.amateur`, clubToken: token });
    assert.equal(second.status, 201);
    assert.equal((await s.owner.client.get(`/api/clubs/${s.clubId}/players`)).data.length, 2);
  });

  test("con un link inválido o revocado NO se crea la cuenta", async () => {
    const s = await ownerWithClub("lk5");
    const { token } = await linkOf(s);
    await s.owner.client.post(`/api/clubs/${s.clubId}/invite-link`);
    const email = `lk5-${RUN}@test.amateur`;

    const bad = await register({ email, clubToken: token });
    assert.equal(bad.status, 404, "link revocado");
    const bogus = await register({ email, clubToken: "token-inventado" });
    assert.equal(bogus.status, 404);
    // La cuenta no quedó a medias: el mismo correo se puede registrar sin token.
    assert.equal((await register({ email })).status, 201);
  });

  test("una persona con sesión acepta el link; repetirlo es inofensivo", async () => {
    const s = await ownerWithClub("lk6");
    const { token } = await linkOf(s);
    const p = await newUser("lk6jug");

    const r = await p.client.post(`/api/invitations/${token}/accept`, { position: "Delantero" });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.joined, true);
    assert.equal(r.data.already, false);
    assert.equal(await clubOf(p.client, p.id), s.clubId);

    const again = await p.client.post(`/api/invitations/${token}/accept`, {});
    assert.equal(again.status, 200);
    assert.equal(again.data.already, true);

    assert.equal((await new Client().post(`/api/invitations/${token}/accept`, {})).status, 401, "sin sesión");
  });

  test("quien ya está en otro club no se mueve sin confirmarlo", async () => {
    const a = await ownerWithClub("lk7a");
    const b = await ownerWithClub("lk7b");
    const p = await newUser("lk7jug");
    assert.equal((await p.client.post(`/api/invitations/${(await linkOf(a)).token}/accept`, {})).status, 200);

    const tokenB = (await linkOf(b)).token;
    const blocked = await p.client.post(`/api/invitations/${tokenB}/accept`, {});
    assert.equal(blocked.status, 409);
    assert.equal(blocked.data.currentClub.id, a.clubId);
    assert.equal(await clubOf(p.client, p.id), a.clubId, "sigue en su club");

    const moved = await p.client.post(`/api/invitations/${tokenB}/accept`, { replace: true });
    assert.equal(moved.status, 200);
    assert.equal(await clubOf(p.client, p.id), b.clubId);
  });

  test("un dueño no puede llevarse a un jugador de otro club", async () => {
    const a = await ownerWithClub("lk8a");
    const b = await ownerWithClub("lk8b");
    const p = await newUser("lk8jug");
    await p.client.post(`/api/invitations/${(await linkOf(a)).token}/accept`, {});

    const steal = await b.owner.client.post(`/api/clubs/${b.clubId}/players`, { userId: p.id });
    assert.equal(steal.status, 409);
    assert.equal(await clubOf(p.client, p.id), a.clubId);
    // En su propio club sí puede editarlo.
    assert.equal((await a.owner.client.post(`/api/clubs/${a.clubId}/players`, { userId: p.id, number: 7 })).status, 201);
  });
});

describe("invitación a un jugador de la comunidad", () => {
  test("el dueño invita por userId, el jugador la ve y la acepta", async () => {
    const s = await ownerWithClub("iv1");
    const p = await newUser("iv1jug");

    const inv = await s.owner.client.post(`/api/clubs/${s.clubId}/invite`, { userId: p.id });
    assert.equal(inv.status, 201, JSON.stringify(inv.data));
    assert.ok(inv.data.token);

    const mine = await p.client.get("/api/invitations/mine");
    assert.equal(mine.status, 200);
    assert.equal(mine.data.length, 1);
    assert.equal(mine.data[0].club.id, s.clubId);
    assert.equal(mine.data[0].token, inv.data.token);
    assert.ok(mine.data[0].invitedBy.startsWith("iv1dueno"));

    const preview = await new Client().get(`/api/invitations/${inv.data.token}`);
    assert.equal(preview.data.kind, "email");

    const ok = await p.client.post(`/api/invitations/${inv.data.token}/accept`, {});
    assert.equal(ok.status, 200);
    assert.equal(await clubOf(p.client, p.id), s.clubId);
    assert.equal((await p.client.get("/api/invitations/mine")).data.length, 0, "ya no está pendiente");
    assert.equal((await p.client.post(`/api/invitations/${inv.data.token}/accept`, {})).status, 410, "una sola vez");
  });

  test("invitar dos veces devuelve la misma; a un miembro o a un desconocido, error", async () => {
    const s = await ownerWithClub("iv2");
    const p = await newUser("iv2jug");
    const first = await s.owner.client.post(`/api/clubs/${s.clubId}/invite`, { userId: p.id });
    const second = await s.owner.client.post(`/api/clubs/${s.clubId}/invite`, { userId: p.id });
    assert.equal(second.status, 200);
    assert.equal(second.data.alreadyInvited, true);
    assert.equal(second.data.token, first.data.token);

    assert.equal((await s.owner.client.post(`/api/clubs/${s.clubId}/invite`, { userId: "no-existe" })).status, 404);
    assert.equal((await s.owner.client.post(`/api/clubs/${s.clubId}/invite`, {})).status, 400);

    await p.client.post(`/api/invitations/${first.data.token}/accept`, {});
    const member = await s.owner.client.post(`/api/clubs/${s.clubId}/invite`, { userId: p.id });
    assert.equal(member.status, 409);
    assert.match(member.data.error, /parte del club/);
  });

  test("solo el dueño invita; también por correo", async () => {
    const s = await ownerWithClub("iv3");
    const stranger = await newUser("iv3extra", ["CLUB_OWNER"]);
    const p = await newUser("iv3jug");
    assert.equal((await stranger.client.post(`/api/clubs/${s.clubId}/invite`, { userId: p.id })).status, 403);
    assert.equal((await new Client().post(`/api/clubs/${s.clubId}/invite`, { userId: p.id })).status, 401);
    assert.equal((await s.owner.client.post(`/api/clubs/${s.clubId}/invite`, { email: `iv3-${RUN}@test.amateur` })).status, 201);
  });

  test("solo la cuenta invitada puede aceptar o rechazar", async () => {
    const s = await ownerWithClub("iv4");
    const p = await newUser("iv4jug");
    const other = await newUser("iv4otro");
    const inv = await s.owner.client.post(`/api/clubs/${s.clubId}/invite`, { userId: p.id });
    const t = inv.data.token;

    assert.equal((await other.client.post(`/api/invitations/${t}/accept`, {})).status, 403, "otra cuenta con el token");
    assert.equal((await other.client.post(`/api/invitations/${t}/decline`, {})).status, 403);
    assert.equal((await new Client().post(`/api/invitations/${t}/decline`, {})).status, 401);
    assert.equal(await clubOf(other.client, other.id), null);
    assert.equal((await other.client.get("/api/invitations/mine")).data.length, 0, "no ve las de otro");
  });

  test("rechazar la deja sin efecto", async () => {
    const s = await ownerWithClub("iv5");
    const p = await newUser("iv5jug");
    const inv = await s.owner.client.post(`/api/clubs/${s.clubId}/invite`, { userId: p.id });
    assert.equal((await p.client.post(`/api/invitations/${inv.data.token}/decline`, {})).status, 200);
    assert.equal((await p.client.get("/api/invitations/mine")).data.length, 0);
    assert.equal((await p.client.post(`/api/invitations/${inv.data.token}/accept`, {})).status, 410);
    assert.equal(await clubOf(p.client, p.id), null);
    // El link del club no se rechaza.
    const { token } = await linkOf(s);
    assert.equal((await p.client.post(`/api/invitations/${token}/decline`, {})).status, 400);
  });

  test("/api/invitations/mine exige sesión", async () => {
    assert.equal((await new Client().get("/api/invitations/mine")).status, 401);
  });

  test("registrarse con una invitación personal exige el mismo correo", async () => {
    const s = await ownerWithClub("iv6");
    const email = `iv6-${RUN}@test.amateur`;
    const inv = await s.owner.client.post(`/api/clubs/${s.clubId}/invite`, { email });
    const t = inv.data.token;

    assert.equal((await new Client().get(`/api/invitations/${t}`)).data.email, email);
    const wrong = await register({ email: `otro-${RUN}@test.amateur`, clubToken: t });
    assert.equal(wrong.status, 400);
    assert.match(wrong.data.error, /otro correo/);

    const c = new Client();
    const ok = await c.post("/api/auth/register", { email: email.toUpperCase(), password: PASSWORD, firstName: "Iva", clubToken: t });
    assert.equal(ok.status, 201, JSON.stringify(ok.data));
    assert.equal(await clubOf(c, ok.data.id), s.clubId);
    assert.equal((await new Client().get(`/api/invitations/${t}`)).status, 410, "quedó usada");
  });
});

describe("registro: fecha de nacimiento", () => {
  test("rechaza fechas que no existen o imposibles", async () => {
    const bad = async (birthDate) => {
      const r = await register({ email: `bd-${RUN}-${counter++}@test.amateur`, birthDate });
      assert.equal(r.status, 400, `${birthDate}: ${JSON.stringify(r.data)}`);
    };
    await bad("2026-02-31");
    await bad("03/10/1995");
    await bad("1850-01-01");
    await bad("2999-01-01");
    await bad("no-es-fecha");
  });

  test("acepta una fecha válida y la guarda tal cual", async () => {
    const c = new Client();
    const r = await c.post("/api/auth/register", { email: `bdok-${RUN}@test.amateur`, password: PASSWORD, firstName: "Fecha", birthDate: "1995-03-10" });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    const me = await c.get(`/api/users/${r.data.id}`);
    assert.equal(me.data.birthDate.slice(0, 10), "1995-03-10");
  });
});
