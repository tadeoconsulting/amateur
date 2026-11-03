// Pruebas de la regla de una contraseña nueva (observación 65: al menos 8 caracteres y una mayúscula) contra un servidor
// real: registro, cambio de contraseña, que iniciar sesión no la revise y las contraseñas temporales de un admin.
// Usá una base DE PRUEBA, no producción. La última necesita un administrador:
//
//   TEST_BASE_URL=http://localhost:3000 TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... npm run test:api

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client, PASSWORD, RUN, newUser } from "./helpers.mjs";

const adminCreds = process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD;
const skip = !adminCreds && "definí TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD";

const NEEDS_UPPER = "Agrega al menos una letra mayúscula a tu contraseña";

describe("registrarse", () => {
  test("sin mayúscula se rechaza con un mensaje que dice qué agregar", async () => {
    const r = await new Client().post("/api/auth/register", { email: `sinmay-${RUN}@test.amateur`, password: "sinmayuscula123", firstName: "A" });
    assert.equal(r.status, 400);
    assert.equal(r.data.error, NEEDS_UPPER);
  });

  test("corta y sin mayúscula pide las dos cosas; solo corta, el aviso de siempre", async () => {
    const both = await new Client().post("/api/auth/register", { email: `corta1-${RUN}@test.amateur`, password: "corta", firstName: "A" });
    assert.equal(both.status, 400);
    assert.match(both.data.error, /al menos 8 caracteres y una letra mayúscula/);

    const short = await new Client().post("/api/auth/register", { email: `corta2-${RUN}@test.amateur`, password: "Corta1", firstName: "A" });
    assert.equal(short.status, 400);
    assert.equal(short.data.error, "La contraseña debe tener al menos 8 caracteres");
  });

  test("con una mayúscula (y 8 caracteres) se crea la cuenta y se puede entrar", async () => {
    const email = `conmay-${RUN}@test.amateur`;
    const c = new Client();
    const r = await c.post("/api/auth/register", { email, password: "ConMayuscula123", firstName: "A" });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.equal((await new Client().post("/api/auth/login", { email, password: "ConMayuscula123" })).status, 200);
  });

  test("una mayúscula con tilde o Ñ también vale", async () => {
    const r = await new Client().post("/api/auth/register", { email: `tilde-${RUN}@test.amateur`, password: "contraseñaÑ", firstName: "A" });
    assert.equal(r.status, 201, JSON.stringify(r.data));
  });
});

describe("cambiar la contraseña", () => {
  test("una nueva sin mayúscula se rechaza y la anterior sigue sirviendo; con mayúscula se cambia", async () => {
    const u = await newUser("cpw");
    const weak = await u.client.post("/api/auth/password", { currentPassword: PASSWORD, newPassword: "sinmayuscula123" });
    assert.equal(weak.status, 400);
    assert.equal(weak.data.error, NEEDS_UPPER);
    assert.equal((await new Client().post("/api/auth/login", { email: u.email, password: PASSWORD })).status, 200, "la anterior sigue sirviendo");

    const ok = await u.client.post("/api/auth/password", { currentPassword: PASSWORD, newPassword: "NuevaClave123" });
    assert.equal(ok.status, 200, JSON.stringify(ok.data));
    assert.equal((await new Client().post("/api/auth/login", { email: u.email, password: "NuevaClave123" })).status, 200);
  });
});

describe("iniciar sesión", () => {
  test("no revisa la regla: una contraseña sin mayúscula equivocada da 401, no 400 (las cuentas que ya existen siguen entrando)", async () => {
    const u = await newUser("loginreg");
    const r = await new Client().post("/api/auth/login", { email: u.email, password: "todaenminuscula" });
    assert.equal(r.status, 401);
  });
});

describe("contraseñas temporales de un admin", { skip }, () => {
  test("todas llevan mayúscula: 40 cuentas seguidas se crean sin un solo rechazo", async () => {
    const admin = new Client();
    assert.equal((await admin.post("/api/auth/admin-login", { email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD })).status, 200);
    for (let i = 0; i < 40; i++) {
      const r = await admin.post("/api/users", { email: `temp${i}-${RUN}@test.amateur`, firstName: "Temp", lastName: "Admin", roles: ["JUGADOR"] });
      assert.equal(r.status, 201, `cuenta ${i}: ${JSON.stringify(r.data)}`);
      assert.match(r.data.temporaryPassword, /[A-Z]/);
    }
  });

  test("una contraseña que el admin elige también debe cumplir la regla", async () => {
    const admin = new Client();
    assert.equal((await admin.post("/api/auth/admin-login", { email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD })).status, 200);
    const weak = await admin.post("/api/users", { email: `elegida-${RUN}@test.amateur`, firstName: "E", lastName: "A", roles: ["JUGADOR"], password: "sinmayuscula123" });
    assert.equal(weak.status, 400);
    assert.equal(weak.data.error, NEEDS_UPPER);
    const ok = await admin.post("/api/users", { email: `elegida2-${RUN}@test.amateur`, firstName: "E", lastName: "A", roles: ["JUGADOR"], password: "ConMayuscula123" });
    assert.equal(ok.status, 201, JSON.stringify(ok.data));
  });
});
