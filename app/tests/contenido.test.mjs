// Pruebas del contenido editable (especificación 016: GET y PUT /api/admin/contenido/:kind y las páginas públicas)
// contra un servidor real. Mismas instrucciones que auth.test.mjs: usá una base DE PRUEBA, no producción.
// Las que necesitan un administrador:
//
//   TEST_BASE_URL=http://localhost:3000 TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... npm run test:api

import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { BASE, Client, RUN, newUser } from "./helpers.mjs";

const adminCreds = process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD;
const skip = !adminCreds && "definí TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD";

async function admin() {
  const client = new Client();
  const r = await client.post("/api/auth/admin-login", { email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return client;
}

const put = (client, slug, sections) => client.request("PUT", `/api/admin/contenido/${slug}`, { sections });
const page = async (path) => (await fetch(BASE + path)).text();

describe("quién puede editar el contenido", () => {
  test("sin sesión: 401", async () => {
    const c = new Client();
    assert.equal((await c.get("/api/admin/contenido/ayuda")).status, 401);
    assert.equal((await put(c, "ayuda", [])).status, 401);
  });

  test("un organizador no es administrador: 403", async () => {
    const org = await newUser("orgcont", ["ORGANIZADOR"]);
    assert.equal((await org.client.get("/api/admin/contenido/terminos")).status, 403);
    assert.equal((await put(org.client, "terminos", [{ body: "Intento de colarme." }])).status, 403);
  });
});

describe("editar el contenido", { skip }, () => {
  // Deja cada tipo como estaba (sin texto propio), para no afectar a otras pruebas ni a quien use esa base.
  after(async () => {
    const a = await admin();
    for (const slug of ["ayuda", "terminos", "politicas"]) await put(a, slug, []);
  });

  test("un tipo desconocido da 404", async () => {
    const a = await admin();
    assert.equal((await a.get("/api/admin/contenido/otro")).status, 404);
    assert.equal((await put(a, "otro", [])).status, 404);
  });

  test("sin texto propio devuelve el de partida y las páginas lo muestran", async () => {
    const a = await admin();
    for (const slug of ["ayuda", "terminos", "politicas"]) await put(a, slug, []);
    const r = await a.get("/api/admin/contenido/terminos");
    assert.equal(r.status, 200);
    assert.equal(r.data.usingDefaults, true);
    assert.ok(r.data.sections.length > 0);
    assert.match(await page("/terminos"), /Términos y condiciones/);
  });

  test("lo guardado se lee igual y aparece en la página pública, en orden", async () => {
    const a = await admin();
    const marca = `Cláusula-${RUN}`;
    const r = await put(a, "terminos", [
      { title: "", body: `Apertura ${marca}` },
      { title: "1. Primera.", body: `Texto uno ${marca}\n\nSegundo párrafo ${marca}` },
    ]);
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.usingDefaults, false);
    assert.equal(r.data.sections.length, 2);

    const back = await a.get("/api/admin/contenido/terminos");
    assert.deepEqual(back.data.sections.map((s) => s.title), ["", "1. Primera."]);

    const html = await page("/terminos");
    assert.ok(html.includes(`Apertura ${marca}`));
    assert.ok(html.includes(`Segundo párrafo ${marca}`));
    assert.ok(html.indexOf(`Apertura ${marca}`) < html.indexOf(`Texto uno ${marca}`));
    // El texto de partida ya no aparece.
    assert.ok(!html.includes("Limitación de responsabilidad"));
  });

  test("guardar reemplaza lo anterior: no quedan secciones viejas", async () => {
    const a = await admin();
    await put(a, "politicas", [{ body: `Vieja uno ${RUN}` }, { body: `Vieja dos ${RUN}` }, { body: `Vieja tres ${RUN}` }]);
    const r = await put(a, "politicas", [{ body: `Nueva ${RUN}` }]);
    assert.equal(r.data.sections.length, 1);
    const html = await page("/privacidad");
    assert.ok(html.includes(`Nueva ${RUN}`));
    assert.ok(!html.includes(`Vieja uno ${RUN}`));
  });

  test("la lista vacía vuelve al texto de partida", async () => {
    const a = await admin();
    await put(a, "politicas", [{ body: `Propia ${RUN}` }]);
    const r = await put(a, "politicas", []);
    assert.equal(r.status, 200);
    assert.equal(r.data.usingDefaults, true);
    assert.ok(!(await page("/privacidad")).includes(`Propia ${RUN}`));
  });

  test("Ayuda: guarda preguntas con categoría y las pestañas salen de ellas", async () => {
    const a = await admin();
    const r = await put(a, "ayuda", [
      { category: `Cat A ${RUN}`, title: `¿Pregunta A? ${RUN}`, body: "Respuesta A." },
      { category: `Cat B ${RUN}`, title: `¿Pregunta B? ${RUN}`, body: "Respuesta B." },
    ]);
    assert.equal(r.status, 200, JSON.stringify(r.data));
    const html = await page("/ayuda");
    assert.ok(html.includes(`Cat A ${RUN}`));
    assert.ok(html.includes(`Cat B ${RUN}`));
    assert.ok(html.includes(`¿Pregunta A? ${RUN}`));
  });

  test("datos inválidos dan 400 y no cambian lo guardado", async () => {
    const a = await admin();
    await put(a, "ayuda", [{ category: "General", title: "Estable", body: "Sigue igual." }]);
    assert.equal((await put(a, "ayuda", [{ category: "", title: "Sin categoría", body: "x" }])).status, 400);
    assert.equal((await put(a, "ayuda", [{ category: "G", title: "", body: "x" }])).status, 400);
    assert.equal((await a.request("PUT", "/api/admin/contenido/ayuda", { sections: "no es una lista" })).status, 400);
    const back = await a.get("/api/admin/contenido/ayuda");
    assert.deepEqual(back.data.sections.map((s) => s.title), ["Estable"]);
  });

  test("lo que se escribe nunca se interpreta como HTML", async () => {
    const a = await admin();
    await put(a, "terminos", [{ title: "", body: `<script>alert("${RUN}")</script> y <b>negrita</b>` }]);
    const html = await page("/terminos");
    assert.ok(!html.includes(`<script>alert("${RUN}")`));
    assert.ok(!html.includes("<b>negrita</b>"));
  });
});
