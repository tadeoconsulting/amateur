// Pruebas del cuadro de eliminación directa (especificación 007) contra un servidor real.
// Mismas instrucciones que auth.test.mjs: usá una base DE PRUEBA, no producción.
//
//   TEST_BASE_URL=http://localhost:3000 npm run test:api

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { RUN, newUser } from "./helpers.mjs";

const payload = (overrides = {}) => ({
  name: "Eliminación " + RUN,
  startDate: "2026-11-01",
  location: "Estadio Municipal",
  format: "eliminacion",
  maxTeams: 8,
  status: "inscripcion",
  ...overrides,
});

const organizer = (label) => newUser(label, ["ORGANIZADOR"]);

/** Un torneo de eliminación con `teams` equipos temporales ya inscritos, sin fixture todavía. */
async function tournamentWith(org, teams, overrides = {}) {
  const t = await org.client.post("/api/tournaments", payload(overrides));
  assert.equal(t.status, 201, JSON.stringify(t.data));
  for (let i = 0; i < teams; i++) {
    const r = await org.client.post(`/api/tournaments/${t.data.id}/teams`, {
      newClub: { name: `Equipo ${i + 1} ${RUN}${Math.random().toString(36).slice(2, 6)}`, shortName: `E${i + 1}` },
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
  }
  return t.data.id;
}

const byRound = (matches, round) => matches.filter((m) => m.matchday === round);
const getMatches = async (client, tournamentId) => (await client.get(`/api/matches?tournamentId=${tournamentId}`)).data;

describe("generar el cuadro", () => {
  test("4 equipos: 2 partidos en ronda 1, 1 final, todos decisivos, torneo pasa a en_curso", async () => {
    const org = await organizer("gen4");
    const id = await tournamentWith(org, 4);

    const fx = await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    assert.equal(fx.status, 201, JSON.stringify(fx.data));
    assert.equal(fx.data.mode, "bracket");
    assert.equal(fx.data.totalRounds, 2);
    assert.equal(fx.data.matches, 3);

    const matches = await getMatches(org.client, id);
    assert.equal(matches.length, 3);
    assert.ok(matches.every((m) => m.decisive === true));
    assert.equal(byRound(matches, 1).length, 2);
    assert.equal(byRound(matches, 2).length, 1);
    // Las dos de ronda 1 apuntan a la final, con equipos.
    for (const m of byRound(matches, 1)) {
      assert.ok(m.homeTeamId && m.awayTeamId);
      assert.equal(m.nextMatchId, byRound(matches, 2)[0].id);
    }
    // La final no tiene equipos todavía.
    assert.equal(byRound(matches, 2)[0].homeTeamId, null);
    assert.equal(byRound(matches, 2)[0].awayTeamId, null);

    const detail = await org.client.get(`/api/tournaments/${id}`);
    assert.equal(detail.data.status, "en_curso");
  });

  test("3 equipos: el que sobra pasa directo a la final (bye)", async () => {
    const org = await organizer("gen3");
    const id = await tournamentWith(org, 3);
    const fx = await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    assert.equal(fx.status, 201);
    assert.equal(fx.data.matches, 2);

    const matches = await getMatches(org.client, id);
    const final = byRound(matches, 2)[0];
    const round1 = byRound(matches, 1)[0];
    // Uno de los dos lados de la final ya tiene equipo (el bye); el otro espera a la ronda 1.
    const filled = [final.homeTeamId, final.awayTeamId].filter(Boolean);
    assert.equal(filled.length, 1);
    assert.equal(round1.nextMatchId, final.id);
  });

  test("formato no soportado sigue rechazado; menos de 2 equipos también", async () => {
    const org = await organizer("noSup");
    const idCopa = await tournamentWith(org, 4, { format: "copa" });
    assert.equal((await org.client.post(`/api/tournaments/${idCopa}/fixture`, { mode: "manual" })).status, 409);

    const solo = await org.client.post("/api/tournaments", payload({ name: "Solo " + RUN }));
    const r = await org.client.post(`/api/tournaments/${solo.data.id}/fixture`, { mode: "manual" });
    assert.equal(r.status, 409);
  });
});

describe("un partido decisivo (partido único, sin empate posible)", () => {
  test("no se puede iniciar ni terminar un partido 'por definir'", async () => {
    const org = await organizer("tbd");
    const id = await tournamentWith(org, 4);
    await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    const final = byRound(await getMatches(org.client, id), 2)[0];

    assert.equal((await org.client.patch(`/api/matches/${final.id}`, { status: "en_curso" })).status, 409);
    assert.equal((await org.client.patch(`/api/matches/${final.id}`, { status: "finalizado", homeScore: 1, awayScore: 0 })).status, 409);
  });

  test("con marcador distinto, termina directo y completa el slot del partido siguiente", async () => {
    const org = await organizer("directo");
    const id = await tournamentWith(org, 4);
    await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    const [r1a, r1b] = byRound(await getMatches(org.client, id), 1);
    const final = byRound(await getMatches(org.client, id), 2)[0];

    await org.client.patch(`/api/matches/${r1a.id}`, { status: "en_curso" });
    const done = await org.client.patch(`/api/matches/${r1a.id}`, { status: "finalizado", homeScore: 2, awayScore: 1 });
    assert.equal(done.status, 200, JSON.stringify(done.data));
    assert.equal(done.data.winnerTeamId, r1a.homeTeamId);

    const finalAfter = await org.client.get(`/api/matches/${final.id}`);
    const slot = r1a.nextMatchSlot === "home" ? finalAfter.data.homeTeamId : finalAfter.data.awayTeamId;
    assert.equal(slot, r1a.homeTeamId);

    // El otro lado de la final sigue "por definir" hasta que termine r1b.
    assert.equal((await org.client.patch(`/api/matches/${final.id}`, { status: "en_curso" })).status, 409);
    await org.client.patch(`/api/matches/${r1b.id}`, { status: "en_curso" });
    await org.client.patch(`/api/matches/${r1b.id}`, { status: "finalizado", homeScore: 0, awayScore: 3 });
    const readyFinal = await org.client.get(`/api/matches/${final.id}`);
    assert.ok(readyFinal.data.homeTeamId && readyFinal.data.awayTeamId, "la final ya tiene los dos equipos");
  });

  test("empatado no se puede terminar; hay que pasar de fase en orden y solo si sigue empatado", async () => {
    const org = await organizer("fases");
    const id = await tournamentWith(org, 2);
    await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    const [m] = await getMatches(org.client, id);
    await org.client.patch(`/api/matches/${m.id}`, { status: "en_curso" });

    await org.client.patch(`/api/matches/${m.id}`, { homeScore: 1, awayScore: 1 });
    const tied = await org.client.patch(`/api/matches/${m.id}`, { status: "finalizado" });
    assert.equal(tied.status, 409);

    assert.equal((await org.client.patch(`/api/matches/${m.id}`, { phase: "penales" })).status, 409, "no se salta el tiempo extra");
    const toET = await org.client.patch(`/api/matches/${m.id}`, { phase: "tiempo_extra" });
    assert.equal(toET.status, 200, JSON.stringify(toET.data));
    assert.equal(toET.data.phase, "tiempo_extra");

    // Si deja de estar empatado, ya no hace falta seguir de fase.
    await org.client.patch(`/api/matches/${m.id}`, { homeScore: 2 });
    assert.equal((await org.client.patch(`/api/matches/${m.id}`, { phase: "penales" })).status, 409);
    const wins = await org.client.patch(`/api/matches/${m.id}`, { status: "finalizado" });
    assert.equal(wins.status, 200);
    assert.equal(wins.data.winnerTeamId, m.homeTeamId);
  });

  test("penales: se decide con eventos penal_definicion, no antes de tiempo, y limpia al deshacer", async () => {
    const org = await organizer("penales");
    const id = await tournamentWith(org, 2);
    await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    const [m] = await getMatches(org.client, id);
    await org.client.patch(`/api/matches/${m.id}`, { status: "en_curso", homeScore: 1, awayScore: 1 });
    await org.client.patch(`/api/matches/${m.id}`, { phase: "tiempo_extra" });
    await org.client.patch(`/api/matches/${m.id}`, { phase: "penales" });

    // Un gol normal ya no se acepta en la tanda de penales.
    const golFueraDeLugar = await org.client.post(`/api/matches/${m.id}/events`, { type: "gol", minute: 121, teamId: m.homeTeamId });
    assert.equal(golFueraDeLugar.status, 409);
    // Un penal_definicion sin "scored" es inválido.
    assert.equal((await org.client.post(`/api/matches/${m.id}/events`, { type: "penal_definicion", minute: 121, teamId: m.homeTeamId })).status, 400);

    const kick = (team, scored) => org.client.post(`/api/matches/${m.id}/events`, { type: "penal_definicion", minute: 121, teamId: team, scored });

    // 3-0 tras 3 intentos cada uno: ya está decidido (al visitante no le alcanza).
    let lastEvent;
    for (let i = 0; i < 3; i++) {
      lastEvent = await kick(m.homeTeamId, true);
      assert.equal(lastEvent.status, 201);
      const missEvent = await kick(m.awayTeamId, false);
      assert.equal(missEvent.status, 201);
      if (i === 2) lastEvent = missEvent;
    }
    const early = await org.client.get(`/api/matches/${m.id}`);
    assert.equal(early.data.penaltyHomeScore, 3);
    assert.equal(early.data.penaltyAwayScore, 0);

    const finish = await org.client.patch(`/api/matches/${m.id}`, { status: "finalizado" });
    assert.equal(finish.status, 200, JSON.stringify(finish.data));
    assert.equal(finish.data.winnerTeamId, m.homeTeamId);
    assert.equal(finish.data.homeScore, 1, "los penales no suman al marcador");
    assert.equal(finish.data.awayScore, 1);

    // Deshacer un penal_definicion (reabriendo primero) revierte el conteo.
    await org.client.patch(`/api/matches/${m.id}`, { status: "en_curso" });
    const events = (await org.client.get(`/api/matches/${m.id}/events`)).data;
    const scoredOne = events.find((e) => e.type === "penal_definicion" && e.scored === true);
    const undo = await org.client.del(`/api/matches/${m.id}/events/${scoredOne.id}`);
    assert.equal(undo.status, 200);
    const after = await org.client.get(`/api/matches/${m.id}`);
    assert.equal(after.data.penaltyHomeScore, 2);
  });

  test("penales sin decidir todavía: no se puede finalizar", async () => {
    const org = await organizer("penalesAbierto");
    const id = await tournamentWith(org, 2);
    await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    const [m] = await getMatches(org.client, id);
    await org.client.patch(`/api/matches/${m.id}`, { status: "en_curso", homeScore: 0, awayScore: 0 });
    await org.client.patch(`/api/matches/${m.id}`, { phase: "tiempo_extra" });
    await org.client.patch(`/api/matches/${m.id}`, { phase: "penales" });

    await org.client.post(`/api/matches/${m.id}/events`, { type: "penal_definicion", minute: 121, teamId: m.homeTeamId, scored: true });
    await org.client.post(`/api/matches/${m.id}/events`, { type: "penal_definicion", minute: 121, teamId: m.awayTeamId, scored: true });
    const stillOpen = await org.client.patch(`/api/matches/${m.id}`, { status: "finalizado" });
    assert.equal(stillOpen.status, 409);
    assert.match(stillOpen.data.error, /no termin/);
  });
});

describe("reabrir un partido de eliminación", () => {
  test("si el ganador ya avanzó y el siguiente sigue intacto, se reabre y se vacía el slot", async () => {
    const org = await organizer("reabreOk");
    const id = await tournamentWith(org, 4);
    await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    const [r1a] = byRound(await getMatches(org.client, id), 1);
    const final = byRound(await getMatches(org.client, id), 2)[0];

    await org.client.patch(`/api/matches/${r1a.id}`, { status: "en_curso" });
    await org.client.patch(`/api/matches/${r1a.id}`, { status: "finalizado", homeScore: 2, awayScore: 0 });

    const reopened = await org.client.patch(`/api/matches/${r1a.id}`, { status: "en_curso" });
    assert.equal(reopened.status, 200, JSON.stringify(reopened.data));
    assert.equal(reopened.data.winnerTeamId, null);

    const finalAfter = await org.client.get(`/api/matches/${final.id}`);
    const slot = r1a.nextMatchSlot === "home" ? finalAfter.data.homeTeamId : finalAfter.data.awayTeamId;
    assert.equal(slot, null, "el cupo que había llenado se vació");
  });

  test("si el siguiente ya empezó, no se puede reabrir", async () => {
    const org = await organizer("reabreNo");
    const id = await tournamentWith(org, 3); // el bye ya deja a la final con un equipo puesto
    await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    const round1 = byRound(await getMatches(org.client, id), 1)[0];
    const final = byRound(await getMatches(org.client, id), 2)[0];

    await org.client.patch(`/api/matches/${round1.id}`, { status: "en_curso" });
    await org.client.patch(`/api/matches/${round1.id}`, { status: "finalizado", homeScore: 3, awayScore: 1 });
    // La final ya tiene los dos equipos: se puede iniciar.
    await org.client.patch(`/api/matches/${final.id}`, { status: "en_curso" });

    const blocked = await org.client.patch(`/api/matches/${round1.id}`, { status: "en_curso" });
    assert.equal(blocked.status, 409);
    assert.match(blocked.data.error, /siguiente/);
  });

  test("volver a 'programado' también limpia ganador y fase", async () => {
    const org = await organizer("reabreProg");
    const id = await tournamentWith(org, 2);
    await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    const [m] = await getMatches(org.client, id);
    await org.client.patch(`/api/matches/${m.id}`, { status: "en_curso", homeScore: 2, awayScore: 1 });
    await org.client.patch(`/api/matches/${m.id}`, { status: "finalizado" });

    // finalizado no pasa directo a programado (spec 004): primero se reabre a en_curso.
    assert.equal((await org.client.patch(`/api/matches/${m.id}`, { status: "programado" })).status, 409);
    await org.client.patch(`/api/matches/${m.id}`, { status: "en_curso" });
    const back = await org.client.patch(`/api/matches/${m.id}`, { status: "programado" });
    assert.equal(back.status, 200, JSON.stringify(back.data));
    assert.equal(back.data.winnerTeamId, null);
    assert.equal(back.data.phase, "regulacion");
  });
});

describe("campos del torneo para eliminación", () => {
  test("extraTimeMinutes y groupsAdvancePerGroup se validan al crear y editar", async () => {
    const org = await organizer("campos");
    const bad1 = await org.client.post("/api/tournaments", payload({ name: "X1 " + RUN, extraTimeMinutes: 0 }));
    assert.equal(bad1.status, 400);
    const bad2 = await org.client.post("/api/tournaments", payload({ name: "X2 " + RUN, groupsAdvancePerGroup: 5 }));
    assert.equal(bad2.status, 400);

    const ok = await org.client.post("/api/tournaments", payload({ name: "X3 " + RUN, extraTimeMinutes: 15, groupsAdvancePerGroup: 3 }));
    assert.equal(ok.status, 201, JSON.stringify(ok.data));
    assert.equal(ok.data.extraTimeMinutes, 15);
    assert.equal(ok.data.groupsAdvancePerGroup, 3);

    const edited = await org.client.patch(`/api/tournaments/${ok.data.id}`, { extraTimeMinutes: 20 });
    assert.equal(edited.status, 200);
    assert.equal(edited.data.extraTimeMinutes, 20);
    assert.equal((await org.client.patch(`/api/tournaments/${ok.data.id}`, { groupsAdvancePerGroup: 10 })).status, 400);
  });
});

describe("relámpago: mismo cuadro, un solo día", () => {
  test("modo manual: igual que eliminación, sin programar", async () => {
    const org = await organizer("relManual");
    const id = await tournamentWith(org, 4, { format: "relampago" });
    const fx = await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "manual" });
    assert.equal(fx.status, 201, JSON.stringify(fx.data));
    const matches = await getMatches(org.client, id);
    assert.ok(matches.every((m) => m.time === "" && m.decisive === true));
  });

  test("modo auto: todos los partidos el mismo día, uno detrás de otro, en la sede del torneo", async () => {
    const org = await organizer("relAuto");
    const id = await tournamentWith(org, 4, { format: "relampago", minutesPerHalf: 20 }); // 50' por horario
    const fx = await org.client.post(`/api/tournaments/${id}/fixture`, {
      mode: "auto",
      day: { date: "2026-11-14", startTime: "09:00", endTime: "13:00" },
    });
    assert.equal(fx.status, 201, JSON.stringify(fx.data));
    assert.equal(fx.data.matches, 3);

    const matches = await getMatches(org.client, id);
    const round1 = byRound(matches, 1).sort((a, b) => a.time.localeCompare(b.time));
    const final = byRound(matches, 2)[0];
    assert.deepEqual(round1.map((m) => m.time), ["09:00", "09:50"]);
    assert.equal(final.time, "10:40");
    assert.ok(matches.every((m) => m.location === "Estadio Municipal"));
    assert.ok(matches.every((m) => new Date(m.date).toISOString().slice(0, 10) === "2026-11-14"));
  });

  test("modo auto sin 'day' es un 400 claro; si no alcanza el horario, no crea nada", async () => {
    const org = await organizer("relError");
    const id = await tournamentWith(org, 4, { format: "relampago" });
    const sinDay = await org.client.post(`/api/tournaments/${id}/fixture`, { mode: "auto" });
    assert.equal(sinDay.status, 400);

    const id2 = await tournamentWith(org, 8, { format: "relampago" }); // 7 partidos
    const corto = await org.client.post(`/api/tournaments/${id2}/fixture`, {
      mode: "auto",
      day: { date: "2026-11-14", startTime: "09:00", endTime: "10:00" },
    });
    assert.equal(corto.status, 400);
    assert.match(corto.data.error, /7 partidos/);
    assert.equal((await getMatches(org.client, id2)).length, 0, "no queda nada a medias");
    assert.equal((await org.client.get(`/api/tournaments/${id2}`)).data.status, "inscripcion");
  });

  test("una vez armado, se juega igual que eliminación (fases, penales, avance automático)", async () => {
    const org = await organizer("relJuega");
    const id = await tournamentWith(org, 2, { format: "relampago" });
    await org.client.post(`/api/tournaments/${id}/fixture`, {
      mode: "auto",
      day: { date: "2026-11-14", startTime: "09:00", endTime: "12:00" },
    });
    const [m] = await getMatches(org.client, id);
    await org.client.patch(`/api/matches/${m.id}`, { status: "en_curso", homeScore: 1, awayScore: 1 });
    assert.equal((await org.client.patch(`/api/matches/${m.id}`, { status: "finalizado" })).status, 409);
    await org.client.patch(`/api/matches/${m.id}`, { phase: "tiempo_extra" });
    await org.client.patch(`/api/matches/${m.id}`, { phase: "penales" });
    // 3-0 tras 3 intentos cada uno: recién ahí es matemáticamente imposible de alcanzar.
    for (let i = 0; i < 3; i++) {
      await org.client.post(`/api/matches/${m.id}/events`, { type: "penal_definicion", minute: 121, teamId: m.homeTeamId, scored: true });
      await org.client.post(`/api/matches/${m.id}/events`, { type: "penal_definicion", minute: 121, teamId: m.awayTeamId, scored: false });
    }
    const done = await org.client.patch(`/api/matches/${m.id}`, { status: "finalizado" });
    assert.equal(done.status, 200, JSON.stringify(done.data));
    assert.equal(done.data.winnerTeamId, m.homeTeamId);
  });
});
