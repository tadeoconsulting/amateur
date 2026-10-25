// Pruebas de src/_lib/admin-teams.ts (la vista de equipos del admin: una fila por equipo), sin servidor.
import { test } from "node:test";
import assert from "node:assert/strict";
import { groupTeams, organizersOf } from "../../src/_lib/admin-teams.ts";

const club = (id, name, extra = {}) => ({ id, name, shortName: name.slice(0, 3).toUpperCase(), logoUrl: null, color: null, isTemporary: false, playerCount: 0, ...extra });
const torneo = (id, name, organizerId = "o1", organizerName = "Org Uno") => ({ id, name, status: "en_curso", organizerId, organizerName });

test("un equipo que juega en varios torneos sale una sola vez, con todos", () => {
  const a = club("c1", "Alianza");
  const rows = groupTeams([
    { club: a, tournament: torneo("t1", "Copa Verano") },
    { club: club("c2", "Barrio"), tournament: torneo("t1", "Copa Verano") },
    { club: a, tournament: torneo("t2", "Copa Otoño") },
  ]);
  assert.equal(rows.length, 2);
  // Sus torneos salen por nombre: "Copa Otoño" antes que "Copa Verano".
  assert.deepEqual(rows[0].tournaments.map((t) => t.id), ["t2", "t1"]);
  assert.equal(rows[1].tournaments.length, 1);
});

test("no repite un torneo si la inscripción llega dos veces", () => {
  const rows = groupTeams([
    { club: club("c1", "Alianza"), tournament: torneo("t1", "Copa") },
    { club: club("c1", "Alianza"), tournament: torneo("t1", "Copa") },
  ]);
  assert.equal(rows[0].tournaments.length, 1);
});

test("los equipos salen ordenados por nombre, sin importar tildes ni mayúsculas", () => {
  const rows = groupTeams([
    { club: club("c1", "zorros"), tournament: torneo("t1", "A") },
    { club: club("c2", "Árbol"), tournament: torneo("t1", "A") },
    { club: club("c3", "bravos"), tournament: torneo("t1", "A") },
  ]);
  assert.deepEqual(rows.map((r) => r.name), ["Árbol", "bravos", "zorros"]);
});

test("sin inscripciones no hay equipos", () => {
  assert.deepEqual(groupTeams([]), []);
});

test("conserva si es temporal y cuántos jugadores tiene", () => {
  const [row] = groupTeams([{ club: club("c1", "Temporal", { isTemporary: true, playerCount: 7 }), tournament: torneo("t1", "Copa") }]);
  assert.equal(row.isTemporary, true);
  assert.equal(row.playerCount, 7);
});

test("los organizadores de un equipo salen sin repetir", () => {
  const [row] = groupTeams([
    { club: club("c1", "Alianza"), tournament: torneo("t1", "Copa", "o1", "Org Uno") },
    { club: club("c1", "Alianza"), tournament: torneo("t2", "Liga", "o1", "Org Uno") },
    { club: club("c1", "Alianza"), tournament: torneo("t3", "Taça", "o2", "Org Dos") },
  ]);
  // Sus torneos salen por nombre (Copa, Liga, Taça), así que el orden de los organizadores es el de ese recorrido.
  assert.deepEqual(organizersOf(row), [{ id: "o1", name: "Org Uno" }, { id: "o2", name: "Org Dos" }]);
});
