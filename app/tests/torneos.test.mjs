// Pruebas de crear torneo y agregar equipos contra un servidor real.
// Mismas instrucciones que auth.test.mjs: usá una base DE PRUEBA, no producción.
//
//   TEST_BASE_URL=http://localhost:3000 npm run test:auth

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Client, RUN, newUser, tomorrow, enrollByInvitation } from "./helpers.mjs";

// Lo mismo que envía el paso 3 del asistente "Crear torneo".
const wizardPayload = (overrides = {}) => ({
  name: "Copa Apertura " + RUN,
  startDate: "2026-10-15",
  location: "Estadio Municipal, Jr. Cruz 435",
  format: "liga",
  maxTeams: 8,
  modality: "7 vs 7",
  gender: "Masculino",
  category: "Libre",
  minutesPerHalf: 25,
  playersPerTeam: 14,
  assignDelegates: true,
  registrationFee: "S/100",
  refereeFee: "S/40 por equipo",
  rules: ["Cada equipo lleva su propio balón.", "Tolerancia de 10 minutos."],
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

describe("crear torneo (asistente)", () => {
  test("guarda todos los datos del asistente y queda abierto a inscripción", async () => {
    const org = await organizer("wizard");
    const created = await org.client.post("/api/tournaments", wizardPayload());
    assert.equal(created.status, 201, JSON.stringify(created.data));
    assert.equal(created.data.organizerId, org.id);
    assert.equal(created.data.status, "inscripcion");

    const detail = await org.client.get(`/api/tournaments/${created.data.id}`);
    assert.equal(detail.status, 200);
    const t = detail.data;
    assert.equal(t.modality, "7 vs 7");
    assert.equal(t.gender, "Masculino");
    assert.equal(t.category, "Libre");
    assert.equal(t.minutesPerHalf, 25);
    assert.equal(t.playersPerTeam, 14);
    assert.equal(t.assignDelegates, true);
    assert.equal(t.registrationFee, "S/100");
    assert.equal(t.refereeFee, "S/40 por equipo");
    assert.deepEqual(t.rules, ["Cada equipo lleva su propio balón.", "Tolerancia de 10 minutos."]);
    assert.equal(t.location, "Estadio Municipal, Jr. Cruz 435");
    assert.equal(new Date(t.startDate).toISOString().slice(0, 10), "2026-10-15");
  });

  test("los campos opcionales pueden ir vacíos", async () => {
    const org = await organizer("minimo");
    const r = await org.client.post("/api/tournaments", {
      name: "Mínimo " + RUN, startDate: "2026-11-01", location: "Cancha 1", format: "relampago", maxTeams: 4,
      gender: null, category: null, minutesPerHalf: null, playersPerTeam: null, registrationFee: null, refereeFee: null,
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.deepEqual(r.data.rules, []);
    assert.equal(r.data.assignDelegates, false);
  });

  test("rechaza datos inválidos con 400", async () => {
    const { client } = await organizer("invalido");
    const bad = async (overrides, why) => {
      const r = await client.post("/api/tournaments", wizardPayload(overrides));
      assert.equal(r.status, 400, `${why}: ${JSON.stringify(r.data)}`);
    };
    await bad({ name: "" }, "nombre vacío");
    await bad({ name: "x".repeat(121) }, "nombre muy largo");
    await bad({ format: "inventado" }, "formato desconocido");
    await bad({ maxTeams: 1 }, "menos de 2 equipos");
    await bad({ maxTeams: 2.5 }, "equipos no entero");
    await bad({ minTeams: 9 }, "mínimo mayor al máximo");
    await bad({ startDate: "no-es-fecha" }, "fecha inválida");
    await bad({ startDate: "2026-02-31" }, "31 de febrero (Date lo pasaría al 3 de marzo)");
    await bad({ endDate: "2020-01-01" }, "fin antes del inicio");
    await bad({ modality: "13 vs 13" }, "modalidad desconocida");
    await bad({ gender: "Otro" }, "género desconocido");
    await bad({ minutesPerHalf: 0 }, "minutos en 0");
    await bad({ playersPerTeam: 51 }, "demasiados jugadores");
    await bad({ assignDelegates: "si" }, "delegado no booleano");
    await bad({ rules: "no es lista" }, "bases no es lista");
    await bad({ rules: ["ok", ""] }, "condición vacía");
    await bad({ rules: Array.from({ length: 51 }, () => "x") }, "demasiadas condiciones");
    await bad({ status: "publicado" }, "estado desconocido");

    for (const field of ["name", "startDate", "location", "format", "maxTeams"]) {
      const payload = wizardPayload();
      delete payload[field];
      const r = await client.post("/api/tournaments", payload);
      assert.equal(r.status, 400, `falta ${field}`);
    }
  });

  test("los campos desconocidos se ignoran (no se puede escribir id ni organizerId)", async () => {
    const org = await organizer("extra");
    const other = await organizer("otro");
    const r = await org.client.post("/api/tournaments", wizardPayload({ organizerId: other.id, id: "torneo-hackeado", createdAt: "2000-01-01" }));
    assert.equal(r.status, 201);
    assert.equal(r.data.organizerId, org.id);
    assert.notEqual(r.data.id, "torneo-hackeado");
  });

  test("editar valida igual y no deja bajar el cupo por debajo de los inscritos", async () => {
    const org = await organizer("editar");
    const t = await org.client.post("/api/tournaments", wizardPayload({ maxTeams: 4 }));
    const a = await clubOwner("edA");
    const b = await clubOwner("edB");
    assert.equal((await enrollByInvitation(org, t.data.id, a)).status, 200);
    assert.equal((await enrollByInvitation(org, t.data.id, b)).status, 200);

    assert.equal((await org.client.patch(`/api/tournaments/${t.data.id}`, { maxTeams: 1 })).status, 400);
    assert.equal((await org.client.patch(`/api/tournaments/${t.data.id}`, { maxTeams: 2 })).status, 200);
    assert.equal((await org.client.patch(`/api/tournaments/${t.data.id}`, { modality: "99 vs 99" })).status, 400);
    assert.equal((await org.client.patch(`/api/tournaments/${t.data.id}`, { rules: ["nueva base"] })).status, 200);
    assert.equal((await org.client.patch(`/api/tournaments/${t.data.id}`, {})).status, 400);
  });

  test("el listado filtra por organizador y trae la modalidad", async () => {
    const mine = await organizer("mio");
    const theirs = await organizer("ajeno");
    const t1 = await mine.client.post("/api/tournaments", wizardPayload({ name: "Mío " + RUN }));
    const t2 = await theirs.client.post("/api/tournaments", wizardPayload({ name: "Ajeno " + RUN }));

    const list = await mine.client.get(`/api/tournaments?organizerId=${mine.id}`);
    const ids = list.data.map((t) => t.id);
    assert.ok(ids.includes(t1.data.id));
    assert.ok(!ids.includes(t2.data.id), "no debe traer torneos de otro organizador");
    assert.equal(list.data.find((t) => t.id === t1.data.id).modality, "7 vs 7");
  });
});

describe("agregar equipos", () => {
  test("un club de otro dueño entra por invitación aceptada; repetirlo da 409; uno que no existe, 404", async () => {
    const org = await organizer("insc");
    const owner = await clubOwner("insc");
    const t = await org.client.post("/api/tournaments", wizardPayload());

    // El organizador no lo inscribe directo: el dueño debe aceptar.
    const direct = await org.client.post(`/api/tournaments/${t.data.id}/teams`, { clubId: owner.clubId });
    assert.equal(direct.status, 403);
    assert.equal(direct.data.code, "invite_required");

    const ok = await enrollByInvitation(org, t.data.id, owner);
    assert.equal(ok.status, 200);
    assert.equal((await org.client.post(`/api/tournaments/${t.data.id}/requests`, { clubId: owner.clubId })).status, 409);
    assert.equal((await org.client.post(`/api/tournaments/${t.data.id}/teams`, { clubId: "no-existe" })).status, 404);
    assert.equal((await org.client.post(`/api/tournaments/${t.data.id}/teams`, {})).status, 400);

    const detail = await org.client.get(`/api/tournaments/${t.data.id}`);
    assert.equal(detail.data.teams.length, 1);
    assert.equal(detail.data.teams[0].club.id, owner.clubId);
    assert.equal(detail.data.teams[0].club.isTemporary, false);
  });

  test("respeta el cupo del torneo", async () => {
    const org = await organizer("cupo");
    const t = await org.client.post("/api/tournaments", wizardPayload({ maxTeams: 2 }));
    const clubs = [await clubOwner("cupo1"), await clubOwner("cupo2"), await clubOwner("cupo3")];

    assert.equal((await enrollByInvitation(org, t.data.id, clubs[0])).status, 200);
    assert.equal((await org.client.post(`/api/tournaments/${t.data.id}/teams`, { newClub: { name: "Temporal", shortName: "TMP" } })).status, 201);
    const third = await org.client.post(`/api/tournaments/${t.data.id}/requests`, { clubId: clubs[2].clubId });
    assert.equal(third.status, 409);
    assert.match(third.data.error, /todos sus equipos/);
    const thirdTemp = await org.client.post(`/api/tournaments/${t.data.id}/teams`, { newClub: { name: "Otro", shortName: "OTR" } });
    assert.equal(thirdTemp.status, 409);
  });

  test("quien no es organizador ni dueño del club no puede inscribir", async () => {
    const org = await organizer("perm");
    const owner = await clubOwner("perm");
    const stranger = await organizer("extrano");
    const t = await org.client.post("/api/tournaments", wizardPayload());

    assert.equal((await stranger.client.post(`/api/tournaments/${t.data.id}/teams`, { clubId: owner.clubId })).status, 403);
    // El dueño del club no se inscribe solo: solicita, y el organizador decide.
    assert.equal((await owner.client.post(`/api/tournaments/${t.data.id}/teams`, { clubId: owner.clubId })).status, 403);
  });

  test("el dueño de un club no puede inscribir el club de otro", async () => {
    const org = await organizer("ajeno");
    const a = await clubOwner("duenoA");
    const b = await clubOwner("duenoB");
    const t = await org.client.post("/api/tournaments", wizardPayload());
    assert.equal((await a.client.post(`/api/tournaments/${t.data.id}/teams`, { clubId: b.clubId })).status, 403);
  });

  test("no se agregan ni quitan equipos cuando el torneo ya empezó", async () => {
    const org = await organizer("empezado");
    const a = await clubOwner("empA");
    const b = await clubOwner("empB");
    const t = await org.client.post("/api/tournaments", wizardPayload());
    await enrollByInvitation(org, t.data.id, a);

    assert.equal((await org.client.patch(`/api/tournaments/${t.data.id}`, { status: "en_curso" })).status, 200);
    assert.equal((await org.client.post(`/api/tournaments/${t.data.id}/requests`, { clubId: b.clubId })).status, 409);
    assert.equal((await org.client.post(`/api/tournaments/${t.data.id}/teams`, { newClub: { name: "Tarde", shortName: "TAR" } })).status, 409);
    assert.equal((await org.client.del(`/api/tournaments/${t.data.id}/teams/${a.clubId}`)).status, 409);
  });
});

describe("equipo temporal", () => {
  test("se crea e inscribe en un paso, a nombre del organizador", async () => {
    const org = await organizer("temp");
    const t = await org.client.post("/api/tournaments", wizardPayload());
    const r = await org.client.post(`/api/tournaments/${t.data.id}/teams`, {
      newClub: { name: "Deportivo Ciudad " + RUN, shortName: "Ciudad", color: "#1565C0" },
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.equal(r.data.club.isTemporary, true);
    assert.equal(r.data.club.ownerId, org.id);
    assert.equal(r.data.club.color, "#1565C0");

    const detail = await org.client.get(`/api/tournaments/${t.data.id}`);
    assert.equal(detail.data.teams.length, 1);
    assert.equal(detail.data.teams[0].club.isTemporary, true);
  });

  test("valida nombre, nombre corto y color", async () => {
    const org = await organizer("tempval");
    const t = await org.client.post("/api/tournaments", wizardPayload());
    const path = `/api/tournaments/${t.data.id}/teams`;
    assert.equal((await org.client.post(path, { newClub: { name: "", shortName: "X" } })).status, 400);
    assert.equal((await org.client.post(path, { newClub: { name: "X", shortName: "" } })).status, 400);
    assert.equal((await org.client.post(path, { newClub: { name: "x".repeat(81), shortName: "X" } })).status, 400);
    assert.equal((await org.client.post(path, { newClub: { name: "X", shortName: "x".repeat(13) } })).status, 400);
    assert.equal((await org.client.post(path, { newClub: { name: "X", shortName: "X", color: "rojo" } })).status, 400);
    assert.equal((await org.client.post(path, { newClub: null })).status, 400);
  });

  test("solo el organizador del torneo puede crear equipos temporales", async () => {
    const org = await organizer("tempperm");
    const owner = await clubOwner("tempperm");
    const stranger = await organizer("tempext");
    const t = await org.client.post("/api/tournaments", wizardPayload());
    const path = `/api/tournaments/${t.data.id}/teams`;
    assert.equal((await owner.client.post(path, { newClub: { name: "X", shortName: "X" } })).status, 403);
    assert.equal((await stranger.client.post(path, { newClub: { name: "X", shortName: "X" } })).status, 403);
  });

  test("no aparece en la búsqueda de la comunidad ni en la de otros; el creador lo ve con ownerId", async () => {
    const org = await organizer("tempbusca");
    const other = await organizer("tempotro");
    const t = await org.client.post("/api/tournaments", wizardPayload());
    const name = "Temporal Secreto " + RUN;
    const r = await org.client.post(`/api/tournaments/${t.data.id}/teams`, { newClub: { name, shortName: "SEC" } });
    const clubId = r.data.club.id;

    const community = await other.client.get(`/api/clubs?search=${encodeURIComponent(name)}`);
    assert.ok(!community.data.some((c) => c.id === clubId), "no debe salir en la búsqueda de otros");
    const spying = await other.client.get(`/api/clubs?ownerId=${org.id}`);
    assert.ok(!spying.data.some((c) => c.id === clubId), "ownerId ajeno no lo revela");
    const own = await org.client.get(`/api/clubs?ownerId=${org.id}`);
    assert.ok(own.data.some((c) => c.id === clubId), "el creador sí lo ve");
  });

  test("otro organizador no puede inscribir un equipo temporal ajeno", async () => {
    const org = await organizer("tempdueno");
    const other = await organizer("templadron");
    const t1 = await org.client.post("/api/tournaments", wizardPayload());
    const t2 = await other.client.post("/api/tournaments", wizardPayload());
    const r = await org.client.post(`/api/tournaments/${t1.data.id}/teams`, { newClub: { name: "Mío", shortName: "MIO" } });
    assert.equal((await other.client.post(`/api/tournaments/${t2.data.id}/teams`, { clubId: r.data.club.id })).status, 403);
  });
});

describe("quitar equipos", () => {
  test("el organizador quita un club; un extraño no; el dueño puede retirar el suyo", async () => {
    const org = await organizer("quitar");
    const owner = await clubOwner("quitar");
    const other = await clubOwner("quitarOtro");
    const stranger = await organizer("quitarExt");
    const t = await org.client.post("/api/tournaments", wizardPayload());
    const path = `/api/tournaments/${t.data.id}/teams`;
    await enrollByInvitation(org, t.data.id, owner);
    await enrollByInvitation(org, t.data.id, other);

    assert.equal((await stranger.client.del(`${path}/${owner.clubId}`)).status, 403);
    assert.equal((await owner.client.del(`${path}/${other.clubId}`)).status, 403, "un dueño no retira el club de otro");
    assert.equal((await owner.client.del(`${path}/${owner.clubId}`)).status, 200, "el dueño retira el suyo");
    assert.equal((await org.client.del(`${path}/${other.clubId}`)).status, 200);
    assert.equal((await org.client.del(`${path}/${other.clubId}`)).status, 404, "ya no está inscrito");

    const detail = await org.client.get(`/api/tournaments/${t.data.id}`);
    assert.equal(detail.data.teams.length, 0);
    // Un club normal se conserva al quitarlo del torneo.
    assert.equal((await org.client.get(`/api/clubs/${owner.clubId}`)).status, 200);
  });

  test("quitar un equipo temporal lo elimina por completo", async () => {
    const org = await organizer("quitartemp");
    const t = await org.client.post("/api/tournaments", wizardPayload());
    const r = await org.client.post(`/api/tournaments/${t.data.id}/teams`, { newClub: { name: "Efímero", shortName: "EFI" } });
    const clubId = r.data.club.id;
    assert.equal((await org.client.get(`/api/clubs/${clubId}`)).status, 200);

    assert.equal((await org.client.del(`/api/tournaments/${t.data.id}/teams/${clubId}`)).status, 200);
    assert.equal((await org.client.get(`/api/clubs/${clubId}`)).status, 404);
  });

  test("no se quita un equipo que ya tiene partidos", async () => {
    const org = await organizer("conpartidos");
    const a = await clubOwner("cpA");
    const b = await clubOwner("cpB");
    const t = await org.client.post("/api/tournaments", wizardPayload());
    const path = `/api/tournaments/${t.data.id}/teams`;
    await enrollByInvitation(org, t.data.id, a);
    await enrollByInvitation(org, t.data.id, b);
    const m = await org.client.post("/api/matches", {
      tournamentId: t.data.id, homeTeamId: a.clubId, awayTeamId: b.clubId, date: tomorrow(), time: "18:00",
    });
    assert.equal(m.status, 201);

    const r = await org.client.del(`${path}/${a.clubId}`);
    assert.equal(r.status, 409);
    assert.match(r.data.error, /partidos/);
  });

  test("sin sesión no se puede quitar nada", async () => {
    const org = await organizer("anonquitar");
    const owner = await clubOwner("anonquitar");
    const t = await org.client.post("/api/tournaments", wizardPayload());
    await enrollByInvitation(org, t.data.id, owner);
    assert.equal((await new Client().del(`/api/tournaments/${t.data.id}/teams/${owner.clubId}`)).status, 401);
  });
});
