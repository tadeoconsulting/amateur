// Utilidades compartidas por las pruebas de integración (ver auth.test.mjs).
import assert from "node:assert/strict";

export const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
export const RUN = Date.now().toString(36);
export const PASSWORD = "Passw0rd-de-prueba";
export const COOKIE_NAME = "amateur_session";

export class Client {
  cookie = "";

  async request(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      redirect: "manual",
      headers: {
        "Content-Type": "application/json",
        ...(this.cookie ? { cookie: this.cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const setCookies = res.headers.getSetCookie?.() ?? [];
    for (const raw of setCookies) {
      const [pair] = raw.split(";");
      const [name, ...rest] = pair.split("=");
      if (name === COOKIE_NAME) this.cookie = rest.join("=") ? `${name}=${rest.join("=")}` : "";
    }

    let data = null;
    try {
      data = await res.json();
    } catch {}
    return { status: res.status, data, res, setCookies };
  }

  get = (path) => this.request("GET", path);
  post = (path, body) => this.request("POST", path, body ?? {});
  patch = (path, body) => this.request("PATCH", path, body);
  del = (path) => this.request("DELETE", path);
}

let counter = 0;
export async function newUser(label, roles = []) {
  const client = new Client();
  const email = `${label}-${RUN}-${counter++}@test.amateur`;
  const reg = await client.post("/api/auth/register", {
    email,
    password: PASSWORD,
    firstName: label,
    lastName: "Prueba",
  });
  assert.equal(reg.status, 201, `registro de ${label}: ${JSON.stringify(reg.data)}`);
  for (const role of roles) {
    const r = await client.post("/api/auth/roles", { role });
    assert.equal(r.status, 200, `rol ${role} para ${label}`);
  }
  return { client, email, id: reg.data.id };
}

export const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString();


/**
 * Inscribe el club de `owner` en un torneo por el camino real: el organizador invita y el
 * dueño acepta. (El organizador ya no puede inscribir directo a un club de otro dueño.)
 * Devuelve la respuesta de aceptar.
 */
export async function enrollByInvitation(org, tournamentId, owner) {
  const invite = await org.client.post(`/api/tournaments/${tournamentId}/requests`, { clubId: owner.clubId });
  assert.equal(invite.status, 201, `invitar: ${JSON.stringify(invite.data)}`);
  return owner.client.post(`/api/tournament-requests/${invite.data.id}/accept`);
}
