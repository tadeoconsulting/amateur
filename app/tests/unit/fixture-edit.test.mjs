// Pruebas de src/_lib/fixture-edit.ts (editar los cruces de un fixture: cambiar equipo y mover de fecha), sin servidor.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canSave,
  changeTeam,
  changedMatches,
  findProblems,
  restingTeams,
  scheduleClashes,
  swapMatchdays,
  teamsByGroup,
  validateFixtureEdit,
} from "../../src/_lib/fixture-edit.ts";

let n = 0;
// Un partido: id, fecha (matchday), local, visitante y, si se pide, día/hora/sede propios.
const m = (id, matchday, home, away, extra = {}) => ({
  id,
  matchday,
  groupName: null,
  homeTeamId: home,
  awayTeamId: away,
  date: `2026-11-0${matchday}`,
  time: `1${n++ % 9}:00`,
  location: `Cancha ${id}`,
  locked: false,
  ...extra,
});

// Liga de 4 equipos: tres fechas, dos partidos cada una.
const liga4 = () => [
  m("ab", 1, "A", "B"),
  m("cd", 1, "C", "D"),
  m("ac", 2, "A", "C"),
  m("bd", 2, "B", "D"),
  m("ad", 3, "A", "D"),
  m("bc", 3, "B", "C"),
];
// Liga de 5 equipos: cinco fechas, dos partidos y uno que descansa.
const liga5 = () => [
  m("ab", 1, "A", "B"),
  m("cd", 1, "C", "D"), // descansa E
  m("ec", 2, "E", "C"),
  m("ab2", 2, "B", "A"),
];

const byId = (list, id) => list.find((x) => x.id === id);
const pairs = (list, day) => list.filter((x) => x.matchday === day).map((x) => `${x.homeTeamId}-${x.awayTeamId}`).sort();

test("los equipos de cada grupo salen de los partidos", () => {
  const teams = teamsByGroup([m("1", 1, "A", "B"), m("2", 1, "C", "D", { groupName: "B" }), m("3", 2, "A", "C")]);
  assert.deepEqual([...teams.get("")].sort(), ["A", "B", "C"]);
  assert.deepEqual([...teams.get("B")].sort(), ["C", "D"]);
});

test("cambiar un equipo por el de otro partido de la fecha: ese partido recibe al que salió", () => {
  // En A-B cambio B por C: C jugaba contra D, así que ahora D juega contra B.
  const r = changeTeam(liga4(), "ab", "away", "C");
  assert.equal(r.ok, true);
  assert.deepEqual(pairs(r.matches, 1), ["A-C", "B-D"]);
  assert.equal(canSave(r.matches), true);
  // Nadie juega dos veces; solo avisa que A-C y B-D ya se jugaban en la fecha 2 (enfrentamientos repetidos).
  const problems = findProblems(r.matches);
  assert.equal(problems.some((p) => p.kind === "twice"), false);
  assert.deepEqual(problems.map((p) => p.teamIds.join("-")).sort(), ["A-C", "B-D"]);
});

test("cada partido conserva su día, hora y sede al cambiar un equipo", () => {
  const before = liga4();
  const r = changeTeam(before, "ab", "away", "C");
  for (const id of ["ab", "cd"]) {
    const a = byId(before, id);
    const b = byId(r.matches, id);
    assert.deepEqual([b.date, b.time, b.location, b.matchday], [a.date, a.time, a.location, a.matchday]);
  }
  // Y las demás fechas ni se tocan.
  assert.deepEqual(pairs(r.matches, 2), ["A-C", "B-D"]);
});

test("cambiar un equipo por su propio rival invierte local y visitante", () => {
  const r = changeTeam(liga4(), "ab", "home", "B");
  assert.equal(r.ok, true);
  assert.deepEqual([byId(r.matches, "ab").homeTeamId, byId(r.matches, "ab").awayTeamId], ["B", "A"]);
});

test("cambiar por el mismo equipo no hace nada", () => {
  const r = changeTeam(liga4(), "ab", "home", "A");
  assert.deepEqual(r.matches, liga4().map((x) => ({ ...x, time: r.matches.find((y) => y.id === x.id).time })));
});

test("si el equipo que entra descansa esa fecha, pasa a descansar el que salió", () => {
  const matches = liga5();
  const teams = teamsByGroup(matches).get("");
  assert.deepEqual(restingTeams(matches, teams, 1, null), ["E"]);
  const r = changeTeam(matches, "ab", "away", "E"); // entra E en A-B; sale B
  assert.equal(r.ok, true);
  assert.deepEqual(pairs(r.matches, 1), ["A-E", "C-D"]);
  assert.deepEqual(restingTeams(r.matches, teams, 1, null), ["B"]);
  assert.equal(canSave(r.matches), true);
});

test("no deja editar partidos que ya empezaron, ni cambiar al equipo de uno que ya empezó", () => {
  const locked = liga4().map((x) => (x.id === "ab" ? { ...x, locked: true } : x));
  assert.match(changeTeam(locked, "ab", "home", "C").error, /ya empezó/);
  // C-D está bloqueado: no se puede sacar a C de ahí para cambiarlo por B.
  const lockedOther = liga4().map((x) => (x.id === "cd" ? { ...x, locked: true } : x));
  assert.match(changeTeam(lockedOther, "ab", "away", "C").error, /ya empezó/);
});

test("rechaza un equipo de otro grupo o un partido que no existe", () => {
  const grupos = [m("1", 1, "A", "B", { groupName: "A" }), m("2", 1, "C", "D", { groupName: "B" })];
  assert.match(changeTeam(grupos, "1", "home", "C").error, /no juega en este grupo/);
  assert.match(changeTeam(liga4(), "nada", "home", "A").error, /no existe/);
});

test("mover de fecha intercambia fecha, día, hora y sede de los dos partidos", () => {
  const before = liga4();
  const r = swapMatchdays(before, "ab", "ac");
  assert.equal(r.ok, true);
  const ab = byId(r.matches, "ab");
  const ac = byId(r.matches, "ac");
  const [abBefore, acBefore] = [byId(before, "ab"), byId(before, "ac")];
  assert.deepEqual([ab.matchday, ab.date, ab.time, ab.location], [acBefore.matchday, acBefore.date, acBefore.time, acBefore.location]);
  assert.deepEqual([ac.matchday, ac.date, ac.time, ac.location], [abBefore.matchday, abBefore.date, abBefore.time, abBefore.location]);
  // Los equipos de cada partido no cambian, y la cantidad por fecha tampoco.
  assert.deepEqual([ab.homeTeamId, ab.awayTeamId], ["A", "B"]);
  assert.equal(r.matches.filter((x) => x.matchday === 1).length, 2);
  assert.equal(r.matches.filter((x) => x.matchday === 2).length, 2);
});

test("mover de fecha puede dejar a un equipo dos veces en una fecha: se marca y no deja guardar", () => {
  const r = swapMatchdays(liga4(), "ab", "ac");
  const twice = findProblems(r.matches).filter((p) => p.kind === "twice");
  assert.deepEqual(twice.map((p) => `${p.matchday}:${p.teamId}`).sort(), ["1:C", "2:B"]);
  assert.equal(canSave(r.matches), false);
});

test("mover de fecha se arregla cambiando equipos en los partidos afectados (el reacomodo guiado)", () => {
  // Muevo A-B a la fecha 2 a cambio de A-C. Quedan: F1 = A-C, C-D (C dos veces; B descansa) y F2 = A-B, B-D (B dos veces; C descansa).
  let draft = swapMatchdays(liga4(), "ab", "ac").matches;
  // F1: en C-D, el local C pasa a ser B (B descansaba: pasa a descansar C).
  draft = changeTeam(draft, "cd", "home", "B").matches;
  assert.deepEqual(pairs(draft, 1), ["A-C", "B-D"]);
  // F2: en B-D, el local B pasa a ser C (C descansaba).
  draft = changeTeam(draft, "bd", "home", "C").matches;
  assert.deepEqual(pairs(draft, 2), ["A-B", "C-D"]);
  assert.equal(canSave(draft), true);
  assert.deepEqual(findProblems(draft), []);
  // Cada fecha sigue con sus dos partidos y las otras fechas no se tocaron.
  assert.deepEqual(pairs(draft, 3), ["A-D", "B-C"]);
});

test("no deja intercambiar partidos de la misma fecha, de otro grupo o bloqueados", () => {
  assert.match(swapMatchdays(liga4(), "ab", "cd").error, /misma fecha/);
  assert.match(swapMatchdays(liga4(), "ab", "ab").error, /dos partidos distintos/);
  const grupos = [m("1", 1, "A", "B", { groupName: "A" }), m("2", 2, "C", "D", { groupName: "B" })];
  assert.match(swapMatchdays(grupos, "1", "2").error, /mismo grupo/);
  const locked = liga4().map((x) => (x.id === "ac" ? { ...x, locked: true } : x));
  assert.match(swapMatchdays(locked, "ab", "ac").error, /ya empezó/);
});

test("dos equipos que se enfrentan más de una vez son un aviso, no un bloqueo", () => {
  const draft = [m("1", 1, "A", "B"), m("2", 2, "B", "A"), m("3", 3, "A", "C")];
  const repeated = findProblems(draft).filter((p) => p.kind === "repeated");
  assert.equal(repeated.length, 1);
  assert.deepEqual(repeated[0].teamIds, ["A", "B"]);
  assert.equal(canSave(draft), true);
});

test("los partidos cambiados son los que difieren del original", () => {
  const before = liga4();
  assert.deepEqual(changedMatches(before, before), []);
  const r = changeTeam(before, "ab", "away", "C");
  assert.deepEqual(changedMatches(before, r.matches).map((x) => x.id).sort(), ["ab", "cd"]);
  const swapped = swapMatchdays(before, "ab", "ac");
  assert.deepEqual(changedMatches(before, swapped.matches).map((x) => x.id).sort(), ["ab", "ac"]);
});

test("choques de horario: mismo día y hora con un mismo equipo o la misma sede; sin hora no choca", () => {
  const a = m("a", 1, "A", "B", { date: "2026-11-01", time: "10:00", location: "X" });
  const sameTeam = m("b", 2, "A", "C", { date: "2026-11-01", time: "10:00", location: "Y" });
  const samePlace = m("c", 3, "D", "E", { date: "2026-11-01", time: "10:00", location: "X" });
  const other = m("d", 3, "D", "E", { date: "2026-11-01", time: "11:00", location: "X" });
  const undefinedTime = m("e", 3, "A", "B", { date: "2026-11-01", time: "", location: "X" });
  assert.deepEqual(scheduleClashes([a, sameTeam]), [["a", "b"]]);
  assert.deepEqual(scheduleClashes([a, samePlace]), [["a", "c"]]);
  assert.deepEqual(scheduleClashes([a, other]), []);
  assert.deepEqual(scheduleClashes([a, undefinedTime]), []);
});

test("validación de la API: acepta una edición bien hecha", () => {
  const before = liga4();
  const edited = changeTeam(before, "ab", "away", "C").matches;
  assert.equal(validateFixtureEdit(before, edited), null);
  assert.equal(validateFixtureEdit(before, before), null);
});

test("validación de la API: rechaza lo que rompe las reglas", () => {
  const before = liga4();
  const swap = (list, id, patch) => list.map((x) => (x.id === id ? { ...x, ...patch } : x));

  assert.match(validateFixtureEdit(before, before.slice(1)), /no son los del fixture/);
  assert.match(validateFixtureEdit(before, swap(before, "ab", { id: "otro" })), /no son los del fixture/);
  assert.match(validateFixtureEdit(before, swap(before, "ab", { awayTeamId: "A" })), /mismo equipo/);
  assert.match(validateFixtureEdit(before, swap(before, "ab", { groupName: "X" })), /grupo/);
  assert.match(validateFixtureEdit(before, swap(before, "ab", { awayTeamId: "Z" })), /no juega en este grupo/);
  // Un equipo dos veces en la misma fecha.
  assert.match(validateFixtureEdit(before, swap(before, "ab", { awayTeamId: "C" })), /dos veces en la fecha 1/);
  // Pasar un partido a otra fecha sin compensar cambia la cantidad por fecha.
  assert.match(validateFixtureEdit(before, swap(before, "ab", { matchday: 2 })), /cantidad de partidos/);
});

test("validación de la API: un partido bloqueado no se puede tocar", () => {
  const before = liga4().map((x) => (x.id === "ab" ? { ...x, locked: true } : x));
  const edited = before.map((x) => (x.id === "ab" ? { ...x, location: "Otra cancha" } : x));
  assert.match(validateFixtureEdit(before, edited), /ya empezó/);
});

test("validación de la API: dos partidos que quedan chocando en día y hora se rechazan", () => {
  const before = [
    m("1", 1, "A", "B", { date: "2026-11-01", time: "10:00", location: "X" }),
    m("2", 2, "C", "D", { date: "2026-11-08", time: "10:00", location: "Y" }),
    m("3", 3, "A", "C", { date: "2026-11-15", time: "10:00", location: "X" }),
  ];
  // Pongo el partido 2 el mismo día y hora que el 1, en otra sede y sin equipos en común: no choca.
  assert.equal(validateFixtureEdit(before, before.map((x) => (x.id === "2" ? { ...x, date: "2026-11-01" } : x))), null);
  // Pero en la misma sede, sí.
  assert.match(validateFixtureEdit(before, before.map((x) => (x.id === "2" ? { ...x, date: "2026-11-01", location: "X" } : x))), /chocan/);
});
