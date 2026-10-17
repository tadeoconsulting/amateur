// Pruebas de la invitación a ser delegado de un equipo temporal (especificación 009, entrega 4) contra un servidor
// real. Mismas instrucciones que auth.test.mjs: usá una base DE PRUEBA, no producción. Hace falta un administrador:
//
//   TEST_BASE_URL=http://localhost:3000 TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... npm run test:api

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client, PASSWORD, RUN, newUser } from "./helpers.mjs";

const adminCreds = process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD;
const skip = !adminCreds && "definí TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD";

let counter = 0;
const tokenOf = (link) => link.split("/").pop();

async function admin() {
  const client = new Client();
  const r = await client.post("/api/auth/admin-login", { email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return client;
}

/** Un equipo temporal y una invitación de delegado (con el correo dado, o un enlace sin correo si es null). */
async function invitation(email) {
  const org = await newUser(`orgdel${counter++}`, ["ORGANIZADOR"]);
  const t = await org.client.post("/api/tournaments", { name: `Liga ${RUN} ${counter}`, startDate: "2026-11-01", location: "Cancha", format: "liga", maxTeams: 4, status: "inscripcion" });
  assert.equal(t.status, 201, JSON.stringify(t.data));
  const team = await org.client.post(`/api/tournaments/${t.data.id}/teams`, { newClub: { name: `Temporal ${RUN}${counter}`, shortName: "TMP" } });
  assert.equal(team.status, 201, JSON.stringify(team.data));
  const clubId = team.data.clubId ?? team.data.club?.id;
  const a = await admin();
  const inv = await a.post(`/api/clubs/${clubId}/delegate-invitation`, email ? { email } : {});
  assert.equal(inv.status, 201, JSON.stringify(inv.data));
  const link = inv.data.link ?? inv.data.url;
  return { token: tokenOf(link), clubId, admin: a };
}

const guestEmail = () => `invitado-${RUN}-${counter++}@test.amateur`;

describe("aceptar sin sesión: se crea la cuenta en el mismo paso", { skip }, () => {
  test("con correo en la invitación: la cuenta es de ese correo, queda como delegado y con sesión", async () => {
    const email = guestEmail();
    const { token, clubId } = await invitation(email);

    const guest = new Client();
    const r = await guest.post(`/api/delegate-invitations/${token}/accept`, { firstName: "Delegada", lastName: "Prueba", password: PASSWORD });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.status, "accepted");

    // Quedó con sesión, con el correo de la invitación y con el perfil de delegado.
    const me = await guest.get("/api/auth/me");
    assert.equal(me.data.user.email, email);
    assert.ok(me.data.user.roles.includes("CLUB_OWNER"));
    const club = await guest.get(`/api/clubs/${clubId}`);
    assert.equal(club.data.isTemporary, false);
    assert.equal(club.data.owner.id, me.data.user.id);

    // Y la contraseña que puso sirve para volver a entrar.
    const again = new Client();
    assert.equal((await again.post("/api/auth/login", { email, password: PASSWORD })).status, 200);
  });

  test("el correo de la invitación manda: uno distinto en el cuerpo se ignora", async () => {
    const email = guestEmail();
    const { token } = await invitation(email);
    const guest = new Client();
    const r = await guest.post(`/api/delegate-invitations/${token}/accept`, { firstName: "Otra", password: PASSWORD, email: `otro-${RUN}@test.amateur` });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal((await guest.get("/api/auth/me")).data.user.email, email);
  });

  test("un enlace sin correo pide el correo y crea la cuenta con ese", async () => {
    const { token } = await invitation(null);
    const guest = new Client();
    assert.equal((await guest.post(`/api/delegate-invitations/${token}/accept`, { firstName: "Sin", password: PASSWORD })).status, 400, "falta el correo");

    const email = guestEmail();
    const r = await guest.post(`/api/delegate-invitations/${token}/accept`, { firstName: "Sin", lastName: "Correo", password: PASSWORD, email });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal((await guest.get("/api/auth/me")).data.user.email, email);
  });

  test("valida nombre y contraseña, y no crea nada si algo falla", async () => {
    const email = guestEmail();
    const { token } = await invitation(email);
    const guest = new Client();
    assert.equal((await guest.post(`/api/delegate-invitations/${token}/accept`, { firstName: " ", password: PASSWORD })).status, 400);
    assert.equal((await guest.post(`/api/delegate-invitations/${token}/accept`, { firstName: "Ana", password: "corta" })).status, 400);
    assert.equal((await guest.get("/api/auth/me")).data.user, null, "sin sesión");
    // Sigue vigente: ahora sí, bien.
    assert.equal((await guest.post(`/api/delegate-invitations/${token}/accept`, { firstName: "Ana", password: PASSWORD })).status, 200);
  });

  test("si ese correo ya tiene cuenta, pide iniciar sesión y no la toca", async () => {
    const existing = await newUser("yaexiste", []);
    const { token } = await invitation(existing.email);
    const guest = new Client();
    const r = await guest.post(`/api/delegate-invitations/${token}/accept`, { firstName: "Intruso", password: "OtraClave-12345" });
    assert.equal(r.status, 409);
    assert.equal(r.data.code, "account_exists");
    assert.equal((await guest.get("/api/auth/me")).data.user, null, "no queda con sesión de la cuenta ajena");
    // La cuenta existente conserva su contraseña.
    assert.equal((await new Client().post("/api/auth/login", { email: existing.email, password: PASSWORD })).status, 200);

    // Con su sesión, acepta como siempre.
    const ok = await existing.client.post(`/api/delegate-invitations/${token}/accept`);
    assert.equal(ok.status, 200, JSON.stringify(ok.data));
  });

  test("sin sesión y sin datos para crear la cuenta, sigue pidiendo iniciar sesión (401)", async () => {
    const { token } = await invitation(guestEmail());
    assert.equal((await new Client().post(`/api/delegate-invitations/${token}/accept`)).status, 401);
  });

  test("un enlace usado no se puede usar otra vez ni crea cuentas", async () => {
    const { token } = await invitation(null);
    const first = await new Client().post(`/api/delegate-invitations/${token}/accept`, { firstName: "Primera", password: PASSWORD, email: guestEmail() });
    assert.equal(first.status, 200);

    const lateEmail = guestEmail();
    const late = await new Client().post(`/api/delegate-invitations/${token}/accept`, { firstName: "Tarde", password: PASSWORD, email: lateEmail });
    assert.equal(late.status, 410);
    assert.equal((await new Client().post("/api/auth/login", { email: lateEmail, password: PASSWORD })).status, 401, "no se creó la cuenta");
  });

  test("con sesión de otro correo sigue dando 403, y una invitación cancelada 410", async () => {
    const { token, clubId, admin: a } = await invitation(guestEmail());
    const other = await newUser("otrocorreo", []);
    assert.equal((await other.client.post(`/api/delegate-invitations/${token}/accept`)).status, 403);

    assert.equal((await a.del(`/api/clubs/${clubId}/delegate-invitation`)).status, 200);
    assert.equal((await new Client().post(`/api/delegate-invitations/${token}/accept`, { firstName: "X", password: PASSWORD })).status, 410);
  });
});
