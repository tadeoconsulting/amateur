// Pruebas unitarias de src/_lib/email.ts y email-templates.ts (sin red: fetch se reemplaza).
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { enviarCorreo, isEmailConfigured } from "../../src/_lib/email.ts";
import { invitacionJugador, invitacionStaff, STAFF_ROLE_LABELS } from "../../src/_lib/email-templates.ts";

const realFetch = globalThis.fetch;
const CORREO = { to: "ana@ejemplo.com", subject: "Asunto", text: "texto", html: "<p>html</p>" };

let calls;
beforeEach(() => {
  calls = [];
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

const configure = () => {
  process.env.RESEND_API_KEY = "re_clave_de_prueba";
  process.env.EMAIL_FROM = "Amateur <no-reply@mail.ejemplo.com>";
};
const stubFetch = (impl) => {
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return impl();
  };
};
const response = (status, body = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

describe("enviarCorreo", () => {
  test("sin clave o sin remitente no sale nada y no se llama a la red", async () => {
    stubFetch(() => response(200));
    assert.equal(isEmailConfigured(), false);
    assert.equal(await enviarCorreo(CORREO), "skipped");
    process.env.RESEND_API_KEY = "re_x"; // falta EMAIL_FROM
    assert.equal(await enviarCorreo(CORREO), "skipped");
    assert.equal(calls.length, 0);
  });

  test("configurado, manda a la API de Resend con la clave en el encabezado y el cuerpo esperado", async () => {
    configure();
    stubFetch(() => response(200, { id: "abc" }));
    assert.equal(isEmailConfigured(), true);
    assert.equal(await enviarCorreo(CORREO), "sent");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.resend.com/emails");
    assert.equal(calls[0].init.headers.Authorization, "Bearer re_clave_de_prueba");
    const body = JSON.parse(calls[0].init.body);
    assert.deepEqual(body.to, ["ana@ejemplo.com"]);
    assert.equal(body.from, "Amateur <no-reply@mail.ejemplo.com>");
    assert.equal(body.subject, "Asunto");
    assert.equal("key" in body, false);
  });

  test("si el proveedor lo rechaza devuelve 'failed' y nunca lanza", async () => {
    configure();
    const logged = [];
    const realError = console.error;
    console.error = (...args) => logged.push(args.join(" "));
    try {
      stubFetch(() => response(403, { message: "domain not verified" }));
      assert.equal(await enviarCorreo(CORREO), "failed");
      assert.ok(logged.some((l) => l.includes("403") && l.includes("domain not verified")));
      assert.ok(logged.every((l) => !l.includes("re_clave_de_prueba")), "la clave no se registra");
    } finally {
      console.error = realError;
    }
  });

  test("si la red falla devuelve 'failed' y nunca lanza", async () => {
    configure();
    const realError = console.error;
    console.error = () => {};
    try {
      stubFetch(() => {
        throw new Error("fetch failed");
      });
      assert.equal(await enviarCorreo(CORREO), "failed");
    } finally {
      console.error = realError;
    }
  });
});

describe("plantillas", () => {
  const base = { clubName: "Sport <Lima> & Cía", inviterName: 'Ana "la DT"', url: "https://app.test/staff/invitacion?token=t1", days: 7 };

  test("la invitación a un jugador lleva el club, quién invita, el link y los días", () => {
    const c = invitacionJugador(base);
    assert.equal(c.subject, "Sport <Lima> & Cía te invitó a su equipo en Amateur");
    assert.ok(c.text.includes(base.url) && c.text.includes("7 días") && c.text.includes('Ana "la DT"'));
    assert.ok(c.html.includes(base.url));
  });

  test("lo que escribe una persona se escapa en el HTML (no se puede inyectar marcado)", () => {
    const html = invitacionJugador(base).html;
    assert.ok(!html.includes("<Lima>"));
    assert.ok(html.includes("Sport &lt;Lima&gt; &amp; Cía"));
    assert.ok(html.includes("Ana &quot;la DT&quot;"));
  });

  test("el link también se escapa en el atributo del botón", () => {
    const html = invitacionJugador({ ...base, url: 'https://app.test/?a="><script>1</script>' }).html;
    assert.ok(!html.includes("<script>"));
  });

  test("la invitación de staff nombra el rol en la frase", () => {
    const c = invitacionStaff({ ...base, roleLabel: STAFF_ROLE_LABELS.director_tecnico });
    assert.ok(c.subject.endsWith("te invitó como director técnico en Amateur"));
    assert.ok(c.text.includes("director técnico") && c.text.includes(base.url));
  });

  test("hay etiqueta para cada rol de staff", () => {
    for (const role of ["delegado", "asistente", "director_tecnico"]) assert.ok(STAFF_ROLE_LABELS[role]);
  });
});
