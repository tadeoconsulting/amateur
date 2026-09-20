// Pruebas de autenticación y permisos contra un servidor real.
//
//   1. Levantá la app apuntando a una base DE PRUEBA (por ejemplo una rama de Neon):
//        npm run build && npm start
//   2. En otra terminal:
//        TEST_BASE_URL=http://localhost:3000 npm run test:auth
//
// Los tests crean usuarios, clubes y torneos nuevos (con un sufijo único), así que no
// dependen del seed, pero SÍ escriben datos: no las corras contra producción.
//
// Los tests de admin necesitan una cuenta ADMIN ya creada (ver `npm run db:make-admin`):
//   TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... npm run test:auth

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BASE, COOKIE_NAME, Client, PASSWORD, RUN, newUser, tomorrow } from "./helpers.mjs";

describe("sin sesión", () => {
  const anon = new Client();

  test("lo público sigue siendo público", async () => {
    assert.equal((await anon.get("/api/tournaments")).status, 200);
    assert.equal((await anon.get("/api/matches")).status, 200);
  });

  test("lo privado exige sesión (401)", async () => {
    for (const path of ["/api/clubs", "/api/players", "/api/users", "/api/admin/stats", "/api/users/x"]) {
      assert.equal((await anon.get(path)).status, 401, `GET ${path}`);
    }
  });

  test("escribir exige sesión (401)", async () => {
    assert.equal((await anon.post("/api/tournaments", { name: "x" })).status, 401);
    assert.equal((await anon.post("/api/clubs", { name: "x" })).status, 401);
    assert.equal((await anon.post("/api/matches", {})).status, 401);
    assert.equal((await anon.patch("/api/users/x", { firstName: "x" })).status, 401);
    assert.equal((await anon.del("/api/users/x")).status, 401);
    assert.equal((await anon.post("/api/matches/x/events", { type: "gol", minute: 1 })).status, 401);
  });

  test("/api/auth/me responde 200 con user null", async () => {
    const r = await anon.get("/api/auth/me");
    assert.equal(r.status, 200);
    assert.equal(r.data.user, null);
  });

  test("una cookie inventada o alterada no vale", async () => {
    const forged = new Client();
    forged.cookie = `${COOKIE_NAME}=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLW9yZy0xIn0.firma-falsa`;
    assert.equal((await forged.get("/api/auth/me")).data.user, null);
    assert.equal((await forged.get("/api/clubs")).status, 401);

    // Un JWT sin firma (alg: none) tampoco.
    const none = new Client();
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    none.cookie = `${COOKIE_NAME}=${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: "user-org-1" })}.`;
    assert.equal((await none.get("/api/auth/me")).data.user, null);
  });
});

describe("registro y login", () => {
  test("rechaza contraseñas cortas y datos faltantes", async () => {
    const c = new Client();
    const weak = await c.post("/api/auth/register", { email: `weak-${RUN}@test.amateur`, password: "corta", firstName: "A" });
    assert.equal(weak.status, 400);
    const missing = await c.post("/api/auth/register", { password: PASSWORD });
    assert.equal(missing.status, 400);
    const badJson = await fetch(BASE + "/api/auth/register", { method: "POST", body: "no es json" });
    assert.equal(badJson.status, 400);
  });

  test("registro crea sesión con cookie httpOnly y rol JUGADOR", async () => {
    const c = new Client();
    const email = `ok-${RUN}@test.amateur`;
    const r = await c.post("/api/auth/register", { email, password: PASSWORD, firstName: "Ana", lastName: "Gómez" });
    assert.equal(r.status, 201);
    assert.deepEqual(r.data.roles, ["JUGADOR"]);
    assert.equal(r.data.passwordHash, undefined);

    const cookie = r.setCookies.find((x) => x.startsWith(COOKIE_NAME));
    assert.ok(cookie, "debe setear la cookie de sesión");
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);

    const me = await c.get("/api/auth/me");
    assert.equal(me.data.user.email, email);
    assert.equal(me.data.user.passwordHash, undefined);
  });

  test("no se puede elegir el rol al registrarse", async () => {
    const c = new Client();
    const r = await c.post("/api/auth/register", {
      email: `roles-${RUN}@test.amateur`,
      password: PASSWORD,
      firstName: "Eva",
      roles: ["ADMIN"],
      role: "ADMIN",
    });
    assert.equal(r.status, 201);
    assert.deepEqual(r.data.roles, ["JUGADOR"]);
  });

  test("correo repetido (aunque cambien las mayúsculas) da 409", async () => {
    const { email } = await newUser("dup");
    const c = new Client();
    const r = await c.post("/api/auth/register", { email: email.toUpperCase(), password: PASSWORD, firstName: "X" });
    assert.equal(r.status, 409);
  });

  test("login: correcto entra, incorrecto da el mismo error para usuario inexistente y clave mala", async () => {
    const { email } = await newUser("login");
    const good = new Client();
    const ok = await good.post("/api/auth/login", { email: email.toUpperCase(), password: PASSWORD });
    assert.equal(ok.status, 200);
    assert.ok(good.cookie);

    const badPass = await new Client().post("/api/auth/login", { email, password: "otra-clave-x" });
    const noUser = await new Client().post("/api/auth/login", { email: `nadie-${RUN}@test.amateur`, password: "otra-clave-x" });
    assert.equal(badPass.status, 401);
    assert.equal(noUser.status, 401);
    assert.equal(badPass.data.error, noUser.data.error);
  });

  test("logout borra la sesión", async () => {
    const { client } = await newUser("logout");
    assert.ok((await client.get("/api/auth/me")).data.user);
    assert.equal((await client.post("/api/auth/logout")).status, 200);
    assert.equal((await client.get("/api/auth/me")).data.user, null);
  });
});

describe("roles", () => {
  test("un JUGADOR no puede crear torneos ni clubes (403)", async () => {
    const { client } = await newUser("jugador");
    const body = { name: "T", format: "liga", maxTeams: 8, startDate: tomorrow(), location: "Lima" };
    assert.equal((await client.post("/api/tournaments", body)).status, 403);
    assert.equal((await client.post("/api/clubs", { name: "C", shortName: "C" })).status, 403);
  });

  test("nadie se da ADMIN a sí mismo", async () => {
    const { client } = await newUser("intruso");
    assert.equal((await client.post("/api/auth/roles", { role: "ADMIN" })).status, 400);
    const me = await client.get("/api/auth/me");
    assert.equal(me.data.user.roles.includes("ADMIN"), false);
  });

  test("tampoco por PATCH /api/users/:id", async () => {
    const { client, id } = await newUser("intruso2");
    const r = await client.patch(`/api/users/${id}`, { roles: ["ADMIN"] });
    assert.equal(r.status, 403);
    const me = await client.get("/api/auth/me");
    assert.equal(me.data.user.roles.includes("ADMIN"), false);
  });

  test("activar ORGANIZADOR habilita crear torneos, y el organizador es siempre quien crea", async () => {
    const { client, id } = await newUser("org", ["ORGANIZADOR"]);
    const r = await client.post("/api/tournaments", {
      name: "Copa " + RUN,
      format: "liga",
      maxTeams: 8,
      startDate: tomorrow(),
      location: "Lima",
      organizerId: "user-org-1", // intento de crearlo a nombre de otro
    });
    assert.equal(r.status, 201);
    assert.equal(r.data.organizerId, id);
  });
});

describe("permisos sobre torneos, clubes y partidos", () => {
  test("solo el organizador edita o borra su torneo, y no puede cambiar el dueño", async () => {
    const a = await newUser("orgA", ["ORGANIZADOR"]);
    const b = await newUser("orgB", ["ORGANIZADOR"]);
    const t = await a.client.post("/api/tournaments", {
      name: "Torneo A", format: "liga", maxTeams: 8, startDate: tomorrow(), location: "Lima",
    });
    assert.equal(t.status, 201);
    const id = t.data.id;

    assert.equal((await b.client.patch(`/api/tournaments/${id}`, { name: "hackeado" })).status, 403);
    assert.equal((await b.client.del(`/api/tournaments/${id}`)).status, 403);

    const own = await a.client.patch(`/api/tournaments/${id}`, { name: "Torneo A2", organizerId: b.id });
    assert.equal(own.status, 200);
    assert.equal(own.data.name, "Torneo A2");
    assert.equal(own.data.organizerId, a.id, "organizerId no debe cambiar");

    assert.equal((await a.client.patch(`/api/tournaments/${id}`, {})).status, 400);
    assert.equal((await a.client.del(`/api/tournaments/${id}`)).status, 200);
  });

  test("solo el dueño edita su club, y no puede cambiar el dueño", async () => {
    const a = await newUser("clubA", ["CLUB_OWNER"]);
    const b = await newUser("clubB", ["CLUB_OWNER"]);
    const c = await a.client.post("/api/clubs", { name: "Club " + RUN, shortName: "CLB", ownerId: b.id });
    assert.equal(c.status, 201);
    assert.equal(c.data.ownerId, a.id, "el dueño es quien lo crea, aunque mande ownerId");

    assert.equal((await b.client.patch(`/api/clubs/${c.data.id}`, { name: "robado" })).status, 403);
    assert.equal((await b.client.post(`/api/clubs/${c.data.id}/invite`, { email: "x@y.z" })).status, 403);
    assert.equal((await b.client.get(`/api/clubs/${c.data.id}/invite`)).status, 403);

    const ok = await a.client.patch(`/api/clubs/${c.data.id}`, { name: "Club editado", ownerId: b.id });
    assert.equal(ok.status, 200);
    assert.equal(ok.data.ownerId, a.id);
  });

  test("eventos de partido: solo el organizador, y los goles simultáneos no se pierden", async () => {
    const org = await newUser("orgM", ["ORGANIZADOR", "CLUB_OWNER"]);
    const other = await newUser("otroM", ["ORGANIZADOR"]);

    const home = await org.client.post("/api/clubs", { name: "Local " + RUN, shortName: "LOC" });
    const away = await org.client.post("/api/clubs", { name: "Visita " + RUN, shortName: "VIS" });
    const t = await org.client.post("/api/tournaments", {
      name: "Copa M", format: "liga", maxTeams: 4, startDate: tomorrow(), location: "Lima",
    });
    const m = await other.client.post("/api/matches", {
      tournamentId: t.data.id, homeTeamId: home.data.id, awayTeamId: away.data.id, date: tomorrow(), time: "18:00",
    });
    assert.equal(m.status, 403, "otro organizador no puede crear partidos en mi torneo");

    const match = await org.client.post("/api/matches", {
      tournamentId: t.data.id, homeTeamId: home.data.id, awayTeamId: away.data.id, date: tomorrow(), time: "18:00",
    });
    assert.equal(match.status, 201);
    const id = match.data.id;

    assert.equal((await other.client.post(`/api/matches/${id}/events`, { type: "gol", minute: 5, teamId: home.data.id })).status, 403);
    assert.equal((await other.client.patch(`/api/matches/${id}`, { homeScore: 9 })).status, 403);

    // Las jugadas solo se registran con el partido en juego.
    const early = await org.client.post(`/api/matches/${id}/events`, { type: "gol", minute: 1, teamId: home.data.id });
    assert.equal(early.status, 409, "el partido todavía no empezó");
    assert.equal((await org.client.patch(`/api/matches/${id}`, { status: "en_curso" })).status, 200);

    // 5 goles del local y 3 del visitante, todos al mismo tiempo.
    const goals = [
      ...Array.from({ length: 5 }, (_, i) => org.client.post(`/api/matches/${id}/events`, { type: "gol", minute: i + 1, teamId: home.data.id })),
      ...Array.from({ length: 3 }, (_, i) => org.client.post(`/api/matches/${id}/events`, { type: "gol", minute: i + 10, teamId: away.data.id })),
    ];
    for (const r of await Promise.all(goals)) assert.equal(r.status, 201);

    const final = await org.client.get(`/api/matches/${id}`);
    assert.equal(final.data.homeScore, 5);
    assert.equal(final.data.awayScore, 3);
    assert.equal(final.data.events.length, 8);

    // Un gol de un equipo que no juega el partido se rechaza y no toca el marcador.
    const foreign = await org.client.post(`/api/matches/${id}/events`, { type: "gol", minute: 50, teamId: "club-que-no-juega" });
    assert.equal(foreign.status, 400);
    assert.equal((await org.client.get(`/api/matches/${id}`)).data.homeScore, 5);
  });

  test("solo el organizador o el dueño del club inscriben equipos", async () => {
    const org = await newUser("orgI", ["ORGANIZADOR"]);
    const owner = await newUser("ownI", ["CLUB_OWNER"]);
    const stranger = await newUser("extI", ["CLUB_OWNER"]);
    const club = await owner.client.post("/api/clubs", { name: "Insc " + RUN, shortName: "INS" });
    const t = await org.client.post("/api/tournaments", {
      name: "Copa I", format: "liga", maxTeams: 4, startDate: tomorrow(), location: "Lima",
    });

    assert.equal((await stranger.client.post(`/api/tournaments/${t.data.id}/teams`, { clubId: club.data.id })).status, 403);
    assert.equal((await owner.client.post(`/api/tournaments/${t.data.id}/teams`, { clubId: club.data.id })).status, 201);
    assert.equal((await owner.client.post(`/api/tournaments/${t.data.id}/teams`, { clubId: club.data.id })).status, 409);
    assert.equal((await owner.client.post(`/api/tournaments/no-existe/teams`, { clubId: club.data.id })).status, 404);
  });
});

describe("datos de usuarios", () => {
  test("el buscador devuelve datos reducidos: sin correo ni teléfono", async () => {
    const seeker = await newUser("buscador");
    const target = await newUser("objetivo");
    const r = await seeker.client.get(`/api/users?search=${encodeURIComponent("objetivo")}`);
    assert.equal(r.status, 200);
    const found = r.data.find((u) => u.id === target.id);
    assert.ok(found, "debe encontrar al usuario");
    for (const field of ["email", "phone", "birthDate", "gender", "department"]) {
      assert.equal(found[field], undefined, `no debe exponer ${field}`);
    }
  });

  test("sin búsqueda (o con menos de 2 letras) no se vuelca la lista", async () => {
    const { client } = await newUser("volcado");
    assert.deepEqual((await client.get("/api/users")).data, []);
    assert.deepEqual((await client.get("/api/users?search=a")).data, []);
  });

  test("no se lee ni edita ni borra el perfil de otro", async () => {
    const a = await newUser("perfilA");
    const b = await newUser("perfilB");
    assert.equal((await a.client.get(`/api/users/${b.id}`)).status, 403);
    assert.equal((await a.client.patch(`/api/users/${b.id}`, { firstName: "x" })).status, 403);
    assert.equal((await a.client.del(`/api/users/${b.id}`)).status, 403);
    // El propio, sí, y sin exponer el hash.
    const own = await a.client.get(`/api/users/${a.id}`);
    assert.equal(own.status, 200);
    assert.equal(own.data.passwordHash, undefined);
    const upd = await a.client.patch(`/api/users/${a.id}`, { firstName: "Nuevo", passwordHash: "x", email: "otro@x.y" });
    assert.equal(upd.status, 200);
    assert.equal(upd.data.firstName, "Nuevo");
    assert.equal(upd.data.passwordHash, undefined);
    assert.notEqual(upd.data.email, "otro@x.y");
  });

  test("/api/players y /api/clubs no exponen contactos a un no-admin", async () => {
    const { client } = await newUser("lector");
    const players = await client.get("/api/players");
    assert.equal(players.status, 200);
    for (const p of players.data) {
      assert.equal(p.user.email, null);
      assert.equal(p.user.phone, null);
    }
    assert.equal((await client.get("/api/admin/stats")).status, 403);
  });
});

describe("protección de páginas (proxy)", () => {
  const paths = ["/torneos", "/club/torneos", "/jugador/torneos", "/admin", "/crear-torneo", "/seleccion-perfil"];

  test("sin sesión redirige al login conservando el destino", async () => {
    for (const path of paths) {
      const res = await fetch(BASE + path, { redirect: "manual" });
      assert.ok([302, 303, 307, 308].includes(res.status), `${path} → ${res.status}`);
      const location = new URL(res.headers.get("location"), BASE);
      assert.equal(location.pathname, "/");
      assert.equal(location.searchParams.get("auth"), "login");
      assert.equal(location.searchParams.get("next"), path);
    }
  });

  test("con sesión deja pasar", async () => {
    const { client } = await newUser("paginas");
    const res = await fetch(BASE + "/torneos", { redirect: "manual", headers: { cookie: client.cookie } });
    assert.equal(res.status, 200);
  });

  test("la landing y la invitación de club siguen públicas", async () => {
    assert.equal((await fetch(BASE + "/", { redirect: "manual" })).status, 200);
    assert.equal((await fetch(BASE + "/jugador/invitacion", { redirect: "manual" })).status, 200);
  });
});

const adminCreds = process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD;

describe("admin", { skip: !adminCreds && "definí TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD" }, () => {
  async function adminClient() {
    const c = new Client();
    const r = await c.post("/api/auth/login", { email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    assert.equal(r.status, 200);
    assert.ok(r.data.roles.includes("ADMIN"), "la cuenta de prueba debe ser ADMIN");
    return { client: c, id: r.data.id };
  }

  test("ve estadísticas y la lista completa de usuarios con contacto", async () => {
    const { client } = await adminClient();
    assert.equal((await client.get("/api/admin/stats")).status, 200);
    const users = await client.get("/api/users");
    assert.equal(users.status, 200);
    assert.ok(users.data.length > 0);
    assert.ok(users.data.every((u) => typeof u.email === "string"));
  });

  test("crea usuarios con contraseña temporal que sirve para entrar", async () => {
    const { client } = await adminClient();
    const email = `creado-${RUN}@test.amateur`;
    const r = await client.post("/api/users", { email, firstName: "Creado", lastName: "Admin", roles: ["JUGADOR"] });
    assert.equal(r.status, 201);
    assert.ok(r.data.temporaryPassword);
    assert.equal(r.data.passwordHash, undefined);
    const login = await new Client().post("/api/auth/login", { email, password: r.data.temporaryPassword });
    assert.equal(login.status, 200);
  });

  test("puede crear torneos a nombre de otro y cambiar roles, pero no quitarse ADMIN", async () => {
    const { client, id } = await adminClient();
    const org = await newUser("orgAdmin", ["ORGANIZADOR"]);
    const t = await client.post("/api/tournaments", {
      name: "Por admin", format: "liga", maxTeams: 4, startDate: tomorrow(), location: "Lima", organizerId: org.id,
    });
    assert.equal(t.status, 201);
    assert.equal(t.data.organizerId, org.id);

    const roles = await client.patch(`/api/users/${org.id}`, { roles: ["ORGANIZADOR", "CLUB_OWNER"] });
    assert.equal(roles.status, 200);
    assert.deepEqual(roles.data.roles.sort(), ["CLUB_OWNER", "ORGANIZADOR"]);

    assert.equal((await client.patch(`/api/users/${id}`, { roles: ["JUGADOR"] })).status, 400);
    // Y puede editar cualquier torneo.
    assert.equal((await client.patch(`/api/tournaments/${t.data.id}`, { name: "Editado por admin" })).status, 200);
  });
});
