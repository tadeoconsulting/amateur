// Pruebas de solicitudes e invitaciones de equipos a un torneo (especificación 006),
// contra un servidor real. Mismas instrucciones que auth.test.mjs: usá una base DE
// PRUEBA, no producción.
//
//   TEST_BASE_URL=http://localhost:3000 npm run test:api

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client, RUN, newUser } from "./helpers.mjs";

const tournamentPayload = (overrides = {}) => ({
  name: "Copa Solicitudes " + RUN,
  startDate: "2026-10-15",
  location: "Estadio Municipal",
  format: "liga",
  maxTeams: 8,
  status: "inscripcion",
  ...overrides,
});

async function organizer(label) {
  return newUser(label, ["ORGANIZADOR"]);
}

async function clubOwner(label) {
  const owner = await newUser(label, ["CLUB_OWNER"]);
  const club = await owner.client.post("/api/clubs", { name: `Club ${label} ${RUN}`, shortName: "CLB" });
  assert.equal(club.status, 201);
  return { ...owner, clubId: club.data.id };
}

async function setup(label, overrides) {
  const org = await organizer(label);
  const t = await org.client.post("/api/tournaments", tournamentPayload(overrides));
  assert.equal(t.status, 201, JSON.stringify(t.data));
  return { org, id: t.data.id, path: `/api/tournaments/${t.data.id}/requests` };
}

const teamsOf = async (client, id) => (await client.get(`/api/tournaments/${id}`)).data.teams;
const act = (client, requestId, action) => client.post(`/api/tournament-requests/${requestId}/${action}`);

describe("crear una solicitud o invitación", () => {
  test("el dueño del club crea una solicitud y el organizador una invitación", async () => {
    const { org, path } = await setup("crear");
    const a = await clubOwner("crearA");
    const b = await clubOwner("crearB");

    const solicitud = await a.client.post(path, { clubId: a.clubId });
    assert.equal(solicitud.status, 201, JSON.stringify(solicitud.data));
    assert.equal(solicitud.data.kind, "request");
    assert.equal(solicitud.data.status, "pending");
    assert.equal(solicitud.data.createdById, a.id);

    const invitacion = await org.client.post(path, { clubId: b.clubId });
    assert.equal(invitacion.status, 201);
    assert.equal(invitacion.data.kind, "invite");
    assert.equal(invitacion.data.createdById, org.id);
  });

  test("valida sesión, permisos y datos", async () => {
    const { path } = await setup("valida");
    const a = await clubOwner("validaA");
    const stranger = await organizer("validaExt");
    const other = await clubOwner("validaOtro");

    assert.equal((await new Client().post(path, { clubId: a.clubId })).status, 401);
    // Otro dueño no puede pedir por un club que no es suyo, ni un organizador ajeno invitar.
    assert.equal((await other.client.post(path, { clubId: a.clubId })).status, 403);
    assert.equal((await stranger.client.post(path, { clubId: a.clubId })).status, 403);
    assert.equal((await a.client.post(path, {})).status, 400);
    assert.equal((await a.client.post(path, { clubId: "no-existe" })).status, 404);
    assert.equal((await a.client.post(`/api/tournaments/no-existe/requests`, { clubId: a.clubId })).status, 404);
  });

  test("quien organiza el torneo y es dueño del club lo inscribe directo (409)", async () => {
    const { org, path } = await setup("ambos");
    await org.client.post("/api/auth/roles", { role: "CLUB_OWNER" });
    const mine = await org.client.post("/api/clubs", { name: "Mío " + RUN, shortName: "MIO" });
    const r = await org.client.post(path, { clubId: mine.data.id });
    assert.equal(r.status, 409);
    assert.match(r.data.error, /directamente/);
  });

  test("un equipo temporal no se solicita ni se invita (400)", async () => {
    const { org, id } = await setup("temp");
    const other = await setup("tempOtro");
    const temp = await org.client.post(`/api/tournaments/${id}/teams`, {
      newClub: { name: "Temporal " + RUN, shortName: "TMP" },
    });
    assert.equal(temp.status, 201);
    // Otro organizador que intenta invitarlo a su propio torneo.
    const r = await other.org.client.post(other.path, { clubId: temp.data.club.id });
    assert.equal(r.status, 400);
    assert.match(r.data.error, /temporal/);
  });

  test("no se crea si el club ya está inscrito, si no hay cupo o si el torneo empezó", async () => {
    const { org, id, path } = await setup("limites", { maxTeams: 2 });
    const a = await clubOwner("limA");
    const b = await clubOwner("limB");
    const c = await clubOwner("limC");

    const first = await org.client.post(path, { clubId: a.clubId });
    assert.equal((await act(a.client, first.data.id, "accept")).status, 200);
    // Ya inscrito.
    assert.equal((await a.client.post(path, { clubId: a.clubId })).status, 409);
    assert.equal((await org.client.post(path, { clubId: a.clubId })).status, 409);

    // Llena el cupo con un temporal: ya no se admiten solicitudes.
    await org.client.post(`/api/tournaments/${id}/teams`, { newClub: { name: "Relleno", shortName: "REL" } });
    const full = await b.client.post(path, { clubId: b.clubId });
    assert.equal(full.status, 409);
    assert.match(full.data.error, /todos sus equipos/);

    // Torneo empezado.
    const closed = await setup("limCerrado");
    await closed.org.client.patch(`/api/tournaments/${closed.id}`, { status: "en_curso" });
    assert.equal((await c.client.post(closed.path, { clubId: c.clubId })).status, 409);
  });

  test("repetir es inofensivo; el tipo contrario pendiente avisa; tras un rechazo se reabre", async () => {
    const { org, path } = await setup("repite");
    const a = await clubOwner("repA");

    const first = await a.client.post(path, { clubId: a.clubId });
    assert.equal(first.status, 201);
    const again = await a.client.post(path, { clubId: a.clubId });
    assert.equal(again.status, 200);
    assert.equal(again.data.alreadyPending, true);
    assert.equal(again.data.id, first.data.id);

    // El organizador invita a quien ya pidió entrar: 409 con la solicitud que hay que aceptar.
    const opposite = await org.client.post(path, { clubId: a.clubId });
    assert.equal(opposite.status, 409);
    assert.equal(opposite.data.requestId, first.data.id);

    // Tras rechazarla, el club puede volver a pedir: se reabre la misma fila.
    assert.equal((await act(org.client, first.data.id, "decline")).status, 200);
    const reopened = await a.client.post(path, { clubId: a.clubId });
    assert.equal(reopened.status, 201);
    assert.equal(reopened.data.id, first.data.id);
    assert.equal(reopened.data.status, "pending");
    assert.equal(reopened.data.resolvedAt, null);
  });

  test("tras un rechazo, el organizador puede invitar y cambia el tipo de la misma fila", async () => {
    const { org, path } = await setup("cambia");
    const a = await clubOwner("cambiaA");
    const first = await a.client.post(path, { clubId: a.clubId });
    await act(org.client, first.data.id, "decline");
    const invite = await org.client.post(path, { clubId: a.clubId });
    assert.equal(invite.status, 201);
    assert.equal(invite.data.id, first.data.id);
    assert.equal(invite.data.kind, "invite");
  });
});

describe("resolver", () => {
  test("solicitud: la acepta el organizador y crea la inscripción; el club no puede aceptarla", async () => {
    const { org, id, path } = await setup("resSol");
    const a = await clubOwner("resSolA");
    const stranger = await organizer("resSolExt");
    const r = await a.client.post(path, { clubId: a.clubId });

    assert.equal((await act(a.client, r.data.id, "accept")).status, 403, "el club no se acepta a sí mismo");
    assert.equal((await act(stranger.client, r.data.id, "accept")).status, 403);
    assert.equal((await act(new Client(), r.data.id, "accept")).status, 401);
    assert.equal((await teamsOf(org.client, id)).length, 0);

    const ok = await act(org.client, r.data.id, "accept");
    assert.equal(ok.status, 200, JSON.stringify(ok.data));
    assert.equal(ok.data.status, "accepted");
    assert.equal(ok.data.enrollment.clubId, a.clubId);
    const teams = await teamsOf(org.client, id);
    assert.equal(teams.length, 1);
    assert.equal(teams[0].club.id, a.clubId);
  });

  test("invitación: la acepta el dueño del club; el organizador no puede aceptarla por él", async () => {
    const { org, id, path } = await setup("resInv");
    const a = await clubOwner("resInvA");
    const other = await clubOwner("resInvB");
    const r = await org.client.post(path, { clubId: a.clubId });

    assert.equal((await act(org.client, r.data.id, "accept")).status, 403, "el organizador no acepta por el club");
    assert.equal((await act(other.client, r.data.id, "accept")).status, 403);
    assert.equal((await teamsOf(org.client, id)).length, 0);

    assert.equal((await act(a.client, r.data.id, "accept")).status, 200);
    assert.equal((await teamsOf(org.client, id)).length, 1);
  });

  test("rechazar y cancelar: quién puede cada una y el estado que dejan", async () => {
    const { org, id, path } = await setup("resNeg");
    const a = await clubOwner("resNegA");
    const b = await clubOwner("resNegB");
    const c = await clubOwner("resNegC");

    // Solicitud de A: la rechaza el organizador.
    const sa = await a.client.post(path, { clubId: a.clubId });
    assert.equal((await act(a.client, sa.data.id, "decline")).status, 403);
    const declined = await act(org.client, sa.data.id, "decline");
    assert.equal(declined.status, 200);
    assert.equal(declined.data.status, "declined");

    // Solicitud de B: la cancela su club, no el organizador.
    const sb = await b.client.post(path, { clubId: b.clubId });
    assert.equal((await act(org.client, sb.data.id, "cancel")).status, 403);
    assert.equal((await act(b.client, sb.data.id, "cancel")).status, 200);

    // Invitación a C: la rechaza el club; el organizador la puede cancelar.
    const ic = await org.client.post(path, { clubId: c.clubId });
    assert.equal((await act(c.client, ic.data.id, "cancel")).status, 403);
    assert.equal((await act(org.client, ic.data.id, "cancel")).status, 200);
    const ic2 = await org.client.post(path, { clubId: c.clubId });
    assert.equal(ic2.status, 201, "cancelada, se puede volver a invitar");
    assert.equal((await act(c.client, ic2.data.id, "decline")).status, 200);

    assert.equal((await teamsOf(org.client, id)).length, 0, "rechazar o cancelar no inscribe");
    const all = await org.client.get(path);
    const byClub = Object.fromEntries(all.data.map((x) => [x.club.id, x.status]));
    assert.deepEqual(byClub, { [a.clubId]: "declined", [b.clubId]: "cancelled", [c.clubId]: "declined" });
  });

  test("una solicitud ya resuelta no se resuelve otra vez (409); una acción rara o inexistente, 404", async () => {
    const { org, path } = await setup("resDos");
    const a = await clubOwner("resDosA");
    const r = await a.client.post(path, { clubId: a.clubId });
    assert.equal((await act(org.client, r.data.id, "accept")).status, 200);
    assert.equal((await act(org.client, r.data.id, "accept")).status, 409);
    assert.equal((await act(org.client, r.data.id, "decline")).status, 409);
    assert.equal((await act(a.client, r.data.id, "cancel")).status, 409);
    assert.equal((await act(org.client, r.data.id, "aprobar")).status, 404);
    assert.equal((await act(org.client, "no-existe", "accept")).status, 404);
  });

  test("no se acepta si el torneo empezó o si se llenó, y la solicitud sigue pendiente", async () => {
    const { org, id, path } = await setup("resCierre", { maxTeams: 2 });
    const a = await clubOwner("cierreA");
    const b = await clubOwner("cierreB");
    const c = await clubOwner("cierreC");
    const ra = await a.client.post(path, { clubId: a.clubId });
    const rb = await b.client.post(path, { clubId: b.clubId });
    const rc = await c.client.post(path, { clubId: c.clubId });

    // Se llena entre solicitar y aceptar (había 3 pendientes para 2 cupos).
    assert.equal((await act(org.client, ra.data.id, "accept")).status, 200);
    assert.equal((await act(org.client, rb.data.id, "accept")).status, 200);
    const late = await act(org.client, rc.data.id, "accept");
    assert.equal(late.status, 409);
    assert.match(late.data.error, /todos sus equipos/);
    assert.equal((await org.client.get(`${path}?status=pending`)).data.length, 1, "sigue pendiente");
    assert.equal((await teamsOf(org.client, id)).length, 2);

    // Torneo empezado: tampoco se acepta, aunque se pueda rechazar.
    const closed = await setup("resCerrado");
    const d = await clubOwner("cierreD");
    const rd = await d.client.post(closed.path, { clubId: d.clubId });
    await closed.org.client.patch(`/api/tournaments/${closed.id}`, { status: "en_curso" });
    assert.equal((await act(closed.org.client, rd.data.id, "accept")).status, 409);
    assert.equal((await teamsOf(closed.org.client, closed.id)).length, 0);
    assert.equal((await act(closed.org.client, rd.data.id, "decline")).status, 200);
  });

  test("quitar el equipo del torneo permite volver a solicitar", async () => {
    const { org, id, path } = await setup("resVuelve");
    const a = await clubOwner("vuelveA");
    const r = await a.client.post(path, { clubId: a.clubId });
    await act(org.client, r.data.id, "accept");
    assert.equal((await org.client.del(`/api/tournaments/${id}/teams/${a.clubId}`)).status, 200);

    const again = await a.client.post(path, { clubId: a.clubId });
    assert.equal(again.status, 201);
    assert.equal(again.data.id, r.data.id, "misma fila reabierta");
    assert.equal((await act(org.client, again.data.id, "accept")).status, 200);
    assert.equal((await teamsOf(org.client, id)).length, 1);
  });

  test("con 1 cupo y 5 solicitudes aceptadas a la vez, entra exactamente 1", async () => {
    const { org, id, path } = await setup("carrera", { maxTeams: 2 });
    await org.client.post(`/api/tournaments/${id}/teams`, { newClub: { name: "Base", shortName: "BAS" } });
    const owners = await Promise.all([1, 2, 3, 4, 5].map((n) => clubOwner(`carrera${n}`)));
    const requests = [];
    for (const o of owners) requests.push((await o.client.post(path, { clubId: o.clubId })).data);

    const results = await Promise.all(requests.map((r) => act(org.client, r.id, "accept")));
    const statuses = results.map((r) => r.status).sort();
    assert.deepEqual(statuses, [200, 409, 409, 409, 409], JSON.stringify(results.map((r) => r.data?.error)));
    assert.equal((await teamsOf(org.client, id)).length, 2, "nunca supera el cupo");
  });

  test("inscribir directo a un club ajeno o por cuenta propia ya no se puede", async () => {
    const { org, id } = await setup("directo");
    const a = await clubOwner("directoA");
    const byOrganizer = await org.client.post(`/api/tournaments/${id}/teams`, { clubId: a.clubId });
    assert.equal(byOrganizer.status, 403);
    assert.equal(byOrganizer.data.code, "invite_required");
    const byOwner = await a.client.post(`/api/tournaments/${id}/teams`, { clubId: a.clubId });
    assert.equal(byOwner.status, 403);
    assert.equal(byOwner.data.code, "request_required");
    assert.equal((await teamsOf(org.client, id)).length, 0);
  });
});

describe("leer", () => {
  test("el organizador lista las de su torneo, con filtros; un ajeno no puede", async () => {
    const { org, path } = await setup("leer");
    const a = await clubOwner("leerA");
    const b = await clubOwner("leerB");
    const stranger = await organizer("leerExt");
    await a.client.post(path, { clubId: a.clubId });
    await org.client.post(path, { clubId: b.clubId });

    const all = await org.client.get(path);
    assert.equal(all.status, 200);
    assert.equal(all.data.length, 2);
    const one = all.data.find((x) => x.club.id === a.clubId);
    assert.equal(one.kind, "request");
    assert.equal(one.club.name, `Club leerA ${RUN}`);
    assert.equal(one.createdBy.id, a.id);
    assert.equal(typeof one.createdBy.firstName, "string");
    assert.ok(!("email" in one.createdBy), "no expone el correo");

    assert.equal((await org.client.get(`${path}?kind=invite`)).data.length, 1);
    assert.equal((await org.client.get(`${path}?kind=request&status=pending`)).data.length, 1);
    assert.equal((await org.client.get(`${path}?status=accepted`)).data.length, 0);

    assert.equal((await stranger.client.get(path)).status, 403);
    assert.equal((await a.client.get(path)).status, 403, "ni el dueño del club lista las del torneo");
    assert.equal((await new Client().get(path)).status, 401);
    assert.equal((await org.client.get(`/api/tournaments/no-existe/requests`)).status, 404);
  });

  test("el club ve solo las pendientes de sus clubes, con el resumen del torneo", async () => {
    const t1 = await setup("mine1", { name: "Copa Uno " + RUN, category: "Libre", modality: "7 vs 7" });
    const t2 = await setup("mine2", { name: "Copa Dos " + RUN });
    const a = await clubOwner("mineA");
    const b = await clubOwner("mineB");

    await a.client.post(t1.path, { clubId: a.clubId }); // solicitud de A
    const inv = await t2.org.client.post(t2.path, { clubId: a.clubId }); // invitación a A
    await b.client.post(t1.path, { clubId: b.clubId }); // de otro club

    const mine = await a.client.get("/api/tournament-requests/mine");
    assert.equal(mine.status, 200);
    assert.equal(mine.data.length, 2, "solo las de sus clubes");
    const request = mine.data.find((x) => x.kind === "request");
    assert.equal(request.tournament.name, `Copa Uno ${RUN}`);
    assert.equal(request.tournament.category, "Libre");
    assert.equal(request.tournament.modality, "7 vs 7");
    assert.equal(request.tournament.teamsCount, 0);
    assert.equal(request.tournament.maxTeams, 8);
    assert.equal(typeof request.tournament.organizer.firstName, "string");
    assert.equal(request.club.id, a.clubId);
    assert.ok(!("email" in request.tournament.organizer));

    const filtered = await a.client.get(`/api/tournament-requests/mine?tournamentId=${t2.id}`);
    assert.equal(filtered.data.length, 1);
    assert.equal(filtered.data[0].kind, "invite");

    // Las resueltas desaparecen de la lista.
    await act(a.client, inv.data.id, "accept");
    assert.equal((await a.client.get("/api/tournament-requests/mine")).data.length, 1);
    assert.equal((await new Client().get("/api/tournament-requests/mine")).status, 401);
    assert.equal((await organizer("mineVacio").then((u) => u.client.get("/api/tournament-requests/mine"))).data.length, 0);
  });
});
