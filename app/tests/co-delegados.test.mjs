// Co-delegados de un equipo (especificación 014) contra un servidor real: invitaciones, permisos, tope de 3, un equipo
// por persona y quitar o salirse. Usá una base DE PRUEBA, no producción.
//
//   TEST_BASE_URL=http://localhost:3000 npm run test:api
//
// Las pruebas que necesitan un administrador se saltan sin TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD (como delegado-invitacion).

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client, RUN, newUser } from "./helpers.mjs";

const adminCreds = process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD;
const skipAdmin = !adminCreds && "definí TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD";

async function admin() {
  const client = new Client();
  const r = await client.post("/api/auth/admin-login", { email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
  assert.equal(r.status, 200, `login de admin: ${JSON.stringify(r.data)}`);
  return client;
}

/** Un delegado principal con su equipo. */
async function setup(label) {
  const owner = await newUser(`${label}own`, ["CLUB_OWNER"]);
  const club = await owner.client.post("/api/clubs", { name: `${label} ${RUN}`, shortName: label.slice(0, 3).toUpperCase() });
  assert.equal(club.status, 201);
  return { owner, clubId: club.data.id };
}

const tokenOf = (url) => url.split("/").pop();
const invite = (s, body = {}) => s.owner.client.post(`/api/clubs/${s.clubId}/co-delegate-invitations`, body);

/** Suma a una persona nueva como co-delegada, por el camino real: invitación y aceptación con su cuenta. */
async function addCo(s, label = "co") {
  const inv = await invite(s);
  assert.equal(inv.status, 201, JSON.stringify(inv.data));
  const co = await newUser(`${s.clubId.slice(-4)}${label}`);
  const accepted = await co.client.post(`/api/co-delegate-invitations/${tokenOf(inv.data.url)}/accept`);
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  return co;
}

describe("invitar y aceptar", () => {
  test("el principal crea un enlace y una cuenta lo acepta: queda como co-delegada", async () => {
    const s = await setup("inv");
    const inv = await invite(s);
    assert.equal(inv.status, 201);
    assert.match(inv.data.url, /\/delegado\/co-delegado\//);

    const preview = await new Client().get(`/api/co-delegate-invitations/${tokenOf(inv.data.url)}`);
    assert.equal(preview.status, 200);
    assert.equal(preview.data.clubName, `inv ${RUN}`);
    assert.equal(preview.data.emailHint, null);

    const co = await newUser("invco");
    const res = await co.client.post(`/api/co-delegate-invitations/${tokenOf(inv.data.url)}/accept`);
    assert.equal(res.status, 200, JSON.stringify(res.data));

    const list = await s.owner.client.get(`/api/clubs/${s.clubId}/delegates`);
    assert.equal(list.status, 200);
    assert.deepEqual(list.data.coDelegates.map((d) => d.userId), [co.id]);
    assert.equal(list.data.principal.userId, s.owner.id);
    // La persona ya ve el equipo como suyo.
    const mine = (await co.client.get(`/api/clubs?delegateId=${co.id}`)).data;
    assert.deepEqual(mine.map((c) => c.id), [s.clubId]);
    // y el perfil de delegado se le dio.
    assert.ok((await co.client.get("/api/auth/me")).data.user.roles.includes("CLUB_OWNER"));
  });

  test("un enlace se usa una sola vez", async () => {
    const s = await setup("once");
    const inv = await invite(s);
    const a = await newUser("onceA");
    const b = await newUser("onceB");
    assert.equal((await a.client.post(`/api/co-delegate-invitations/${tokenOf(inv.data.url)}/accept`)).status, 200);
    const again = await b.client.post(`/api/co-delegate-invitations/${tokenOf(inv.data.url)}/accept`);
    assert.equal(again.status, 410);
    assert.equal(again.data.code, "used");
  });

  test("con correo, solo la cuenta con ese correo; sin sesión se crea la cuenta en el mismo paso", async () => {
    const s = await setup("mail");
    const email = `mail-${RUN}-nuevo@test.amateur`;
    const inv = await invite(s, { email });
    assert.equal(inv.status, 201);
    const token = tokenOf(inv.data.url);

    const other = await newUser("mailotra");
    const wrong = await other.client.post(`/api/co-delegate-invitations/${token}/accept`);
    assert.equal(wrong.status, 403);
    assert.equal(wrong.data.code, "wrong_email");

    const guest = new Client();
    assert.equal((await guest.post(`/api/co-delegate-invitations/${token}/accept`)).status, 401, "sin sesión ni datos hay que iniciar sesión");
    const created = await guest.post(`/api/co-delegate-invitations/${token}/accept`, { firstName: "Nuevo", lastName: "Delegado", password: "Passw0rd-de-prueba" });
    assert.equal(created.status, 200, JSON.stringify(created.data));
    const me = await guest.get("/api/auth/me");
    assert.equal(me.data.user.email, email);
    assert.deepEqual((await s.owner.client.get(`/api/clubs/${s.clubId}/delegates`)).data.coDelegates.map((d) => d.email), [email]);
  });

  test("un correo que ya tiene cuenta debe iniciar sesión", async () => {
    const s = await setup("exist");
    const existing = await newUser("existing");
    const inv = await invite(s, { email: existing.email });
    const res = await new Client().post(`/api/co-delegate-invitations/${tokenOf(inv.data.url)}/accept`, {
      firstName: "X", lastName: "Y", password: "Passw0rd-de-prueba",
    });
    assert.equal(res.status, 409);
    assert.equal(res.data.code, "account_exists");
  });

  test("una invitación cancelada o que no existe no sirve", async () => {
    const s = await setup("canc");
    const inv = await invite(s);
    assert.equal((await s.owner.client.del(`/api/clubs/${s.clubId}/co-delegate-invitations/${inv.data.id}`)).status, 200);
    const co = await newUser("cancco");
    assert.equal((await co.client.post(`/api/co-delegate-invitations/${tokenOf(inv.data.url)}/accept`)).status, 410);
    assert.equal((await new Client().get(`/api/co-delegate-invitations/${tokenOf(inv.data.url)}`)).status, 410);
    assert.equal((await new Client().get("/api/co-delegate-invitations/no-existe")).status, 404);
  });

  test("un correo mal escrito no crea la invitación", async () => {
    const s = await setup("badmail");
    assert.equal((await invite(s, { email: "no-es-un-correo" })).status, 400);
  });
});

describe("un equipo por persona y tope de 3", () => {
  test("hasta 3 co-delegados; las invitaciones vigentes cuentan para el tope", async () => {
    const s = await setup("tope");
    await addCo(s, "a");
    assert.equal((await invite(s)).status, 201); // 1 aceptado + 1 pendiente
    assert.equal((await invite(s)).status, 201); // 1 + 2
    const full = await invite(s);
    assert.equal(full.status, 409);
    assert.equal(full.data.code, "full");
    const list = (await s.owner.client.get(`/api/clubs/${s.clubId}/delegates`)).data;
    assert.equal(list.slotsLeft, 0);
    assert.equal(list.canInvite, false);
    assert.equal(list.invitations.length, 2);
  });

  test("cancelar una invitación libera su lugar", async () => {
    const s = await setup("libera");
    const a = await invite(s);
    await invite(s);
    await invite(s);
    assert.equal((await invite(s)).status, 409);
    assert.equal((await s.owner.client.del(`/api/clubs/${s.clubId}/co-delegate-invitations/${a.data.id}`)).status, 200);
    assert.equal((await invite(s)).status, 201);
  });

  test("quien ya dirige un equipo no puede aceptar", async () => {
    const s = await setup("dirige");
    const otro = await setup("otro");
    const inv = await invite(s);
    const res = await otro.owner.client.post(`/api/co-delegate-invitations/${tokenOf(inv.data.url)}/accept`);
    assert.equal(res.status, 409);
    assert.equal(res.data.code, "has_club");
  });

  test("quien ya es co-delegado de un equipo no puede serlo de otro, ni crear el suyo", async () => {
    const a = await setup("equipoa");
    const b = await setup("equipob");
    const co = await addCo(a);
    const inv = await invite(b);
    const res = await co.client.post(`/api/co-delegate-invitations/${tokenOf(inv.data.url)}/accept`);
    assert.equal(res.status, 409);
    assert.equal(res.data.code, "has_club");

    const own = await co.client.post("/api/clubs", { name: `Propio ${RUN}`, shortName: "PRO" });
    assert.equal(own.status, 409);
  });
});

describe("permisos del co-delegado", () => {
  test("gestiona el equipo con los permisos del principal: planilla y datos del club", async () => {
    const s = await setup("gest");
    const co = await addCo(s);

    const rename = await co.client.patch(`/api/clubs/${s.clubId}`, { name: `Renombrado ${RUN}`, color: "#112233" });
    assert.equal(rename.status, 200, JSON.stringify(rename.data));
    assert.equal(rename.data.name, `Renombrado ${RUN}`);

    // La planilla: crea una categoría y ve el link de invitación de jugadores, que solo ve quien gestiona.
    const category = await co.client.post(`/api/clubs/${s.clubId}/categories`, { name: "Libre", gender: "masculino", ageType: "libre" });
    assert.equal(category.status, 201, JSON.stringify(category.data));

    // Un tercero no puede nada de eso.
    const stranger = await newUser("extrano", ["CLUB_OWNER"]);
    assert.equal((await stranger.client.patch(`/api/clubs/${s.clubId}`, { name: "Robado" })).status, 403);
  });

  test("no puede cambiar el contacto público; el principal sí", async () => {
    const s = await setup("cont");
    const co = await addCo(s);
    const denied = await co.client.patch(`/api/clubs/${s.clubId}`, { delegadoTel: "999111222" });
    assert.equal(denied.status, 403);
    // aunque venga junto a un campo permitido, no se aplica nada
    const mixed = await co.client.patch(`/api/clubs/${s.clubId}`, { name: `Mixto ${RUN}`, delegadoEmail: "x@y.test" });
    assert.equal(mixed.status, 403);
    const club = (await s.owner.client.get(`/api/clubs/${s.clubId}`)).data;
    assert.equal(club.delegadoEmail, null);
    assert.notEqual(club.name, `Mixto ${RUN}`);

    const ok = await s.owner.client.patch(`/api/clubs/${s.clubId}`, { delegadoTel: "999111222" });
    assert.equal(ok.status, 200);
  });

  test("no puede eliminar el club ni invitar o quitar a otros delegados", async () => {
    const s = await setup("noperm");
    const a = await addCo(s, "a");
    const b = await addCo(s, "b");
    assert.equal((await a.client.del(`/api/clubs/${s.clubId}`)).status, 403);
    assert.equal((await a.client.post(`/api/clubs/${s.clubId}/co-delegate-invitations`, {})).status, 403);
    assert.equal((await a.client.del(`/api/clubs/${s.clubId}/delegates/${b.id}`)).status, 403);
    // ni al principal
    assert.equal((await a.client.del(`/api/clubs/${s.clubId}/delegates/${s.owner.id}`)).status, 404);
  });

  test("el co-delegado ve a los delegados, sin correos ni enlaces", async () => {
    const s = await setup("ver");
    const co = await addCo(s);
    await invite(s);
    const forOwner = (await s.owner.client.get(`/api/clubs/${s.clubId}/delegates`)).data;
    assert.equal(forOwner.canManage, true);
    assert.equal(forOwner.invitations.length, 1);
    assert.ok(forOwner.coDelegates[0].email);

    const forCo = (await co.client.get(`/api/clubs/${s.clubId}/delegates`)).data;
    assert.equal(forCo.role, "co");
    assert.equal(forCo.canManage, false);
    assert.equal(forCo.invitations.length, 0);
    assert.equal(forCo.coDelegates[0].email, undefined);
    assert.equal(forCo.principal.userId, s.owner.id);

    const stranger = await newUser("ver-extrano");
    assert.equal((await stranger.client.get(`/api/clubs/${s.clubId}/delegates`)).status, 403);
  });

  test("ve y responde las invitaciones de torneo del equipo, igual que el principal", async () => {
    const s = await setup("torneo");
    const co = await addCo(s);
    const org = await newUser("torneoorg", ["ORGANIZADOR"]);
    const t = await org.client.post("/api/tournaments", {
      name: `Torneo co ${RUN}`, startDate: "2026-10-01", location: "Estadio", format: "liga", maxTeams: 4, status: "inscripcion",
    });
    assert.equal(t.status, 201, JSON.stringify(t.data));
    const invitation = await org.client.post(`/api/tournaments/${t.data.id}/requests`, { clubId: s.clubId });
    assert.equal(invitation.status, 201, JSON.stringify(invitation.data));

    const seen = (await co.client.get("/api/tournament-requests/mine")).data;
    assert.deepEqual(seen.map((r) => r.id), [invitation.data.id]);
    assert.deepEqual((await s.owner.client.get("/api/tournament-requests/mine")).data.map((r) => r.id), [invitation.data.id]);

    const accepted = await co.client.post(`/api/tournament-requests/${invitation.data.id}/accept`);
    assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
    // Un tercero no responde por el equipo.
    const other = await newUser("torneo-otro", ["CLUB_OWNER"]);
    const second = await org.client.post(`/api/tournaments/${t.data.id}/requests`, { clubId: (await setup("tornb")).clubId });
    assert.equal((await other.client.post(`/api/tournament-requests/${second.data.id}/accept`)).status, 403);
  });
});

describe("quitar y salir", () => {
  test("el principal quita a un co-delegado, que deja de gestionar el equipo", async () => {
    const s = await setup("quita");
    const co = await addCo(s);
    assert.equal((await s.owner.client.del(`/api/clubs/${s.clubId}/delegates/${co.id}`)).status, 200);
    assert.equal((await co.client.patch(`/api/clubs/${s.clubId}`, { name: "Ya no" })).status, 403);
    assert.deepEqual((await s.owner.client.get(`/api/clubs/${s.clubId}/delegates`)).data.coDelegates, []);
    // quitar a quien no es co-delegado
    assert.equal((await s.owner.client.del(`/api/clubs/${s.clubId}/delegates/${co.id}`)).status, 404);
  });

  test("un co-delegado puede salirse él mismo, y entonces puede sumarse a otro equipo", async () => {
    const s = await setup("sale");
    const other = await setup("salea");
    const co = await addCo(s);
    assert.equal((await co.client.del(`/api/clubs/${s.clubId}/delegates/${co.id}`)).status, 200);
    const inv = await invite(other);
    assert.equal((await co.client.post(`/api/co-delegate-invitations/${tokenOf(inv.data.url)}/accept`)).status, 200);
  });

  test("otro equipo no puede quitar a un co-delegado ajeno", async () => {
    const s = await setup("ajeno");
    const other = await setup("ajenob");
    const co = await addCo(s);
    assert.equal((await other.owner.client.del(`/api/clubs/${s.clubId}/delegates/${co.id}`)).status, 403);
    assert.equal((await other.owner.client.del(`/api/clubs/${other.clubId}/delegates/${co.id}`)).status, 404);
  });
});

describe("equipos temporales y admin", () => {
  test("un equipo temporal no admite co-delegados", async () => {
    const org = await newUser("tmporg", ["ORGANIZADOR"]);
    const t = await org.client.post("/api/tournaments", {
      name: `Temp ${RUN}`, startDate: "2026-10-01", location: "Estadio", format: "liga", maxTeams: 4, status: "inscripcion",
    });
    const temp = await org.client.post(`/api/tournaments/${t.data.id}/teams`, { newClub: { name: `Temporal ${RUN}`, shortName: "TMP" } });
    assert.equal(temp.status, 201, JSON.stringify(temp.data));
    const res = await org.client.post(`/api/clubs/${temp.data.clubId}/co-delegate-invitations`, {});
    assert.equal(res.status, 409);
  });

  test("el admin invita y quita co-delegados", { skip: skipAdmin }, async () => {
    const a = await admin();
    const s = await setup("adm");
    const inv = await a.post(`/api/clubs/${s.clubId}/co-delegate-invitations`, {});
    assert.equal(inv.status, 201, JSON.stringify(inv.data));
    const co = await newUser("admco");
    assert.equal((await co.client.post(`/api/co-delegate-invitations/${tokenOf(inv.data.url)}/accept`)).status, 200);
    assert.equal((await a.get(`/api/clubs/${s.clubId}/delegates`)).data.coDelegates.length, 1);
    assert.equal((await a.del(`/api/clubs/${s.clubId}/delegates/${co.id}`)).status, 200);
  });

  test("una cuenta de admin no puede ser co-delegada", { skip: skipAdmin }, async () => {
    const a = await admin();
    const s = await setup("admno");
    const inv = await invite(s);
    const res = await a.post(`/api/co-delegate-invitations/${tokenOf(inv.data.url)}/accept`);
    assert.equal(res.status, 400);
    assert.equal(res.data.code, "admin");
  });
});
