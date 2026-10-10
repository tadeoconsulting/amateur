// Pruebas de la carga de jugadores provisionales (src/_lib/provisional-import.ts, sin base de datos).
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanName, matchClub, normalizeText, parseBirthDate, parseDni, planImport } from "../../src/_lib/provisional-import.ts";

const TODAY = "2026-10-10";
const clubs = [
  { id: "c-lgk", name: "LGK", shortName: "LGK" },
  { id: "c-ude", name: "Unión Deportiva Ensenada", shortName: "UDE" },
];
const row = (over = {}) => ({ nombres: "Ana María", apellidos: "Núñez Peña", club: "LGK", dni: "10000001", fechaNacimiento: "1990-02-05", ...over });
const run = (rows, extra = {}) =>
  planImport({ rows, clubs, existingProvisional: new Map(), accountDnis: new Set(), today: TODAY, ...extra });

test("el texto se compara sin tildes, sin mayúsculas y sin espacios de más", () => {
  assert.equal(normalizeText("  Unión   Deportiva  "), "union deportiva");
  assert.equal(cleanName("  Núñez   Peña "), "Núñez Peña"); // las eñes y tildes del nombre no se tocan
  assert.equal(cleanName(null), "");
});

test("el DNI son 8 dígitos, como texto o número", () => {
  assert.equal(parseDni("10000001"), "10000001");
  assert.equal(parseDni(10000001), "10000001");
  assert.equal(parseDni(" 10000001 "), "10000001");
  assert.equal(parseDni("7125983"), null);
  assert.equal(parseDni("7125983A"), null);
  assert.equal(parseDni(undefined), null);
});

test("la fecha de nacimiento acepta AAAA-MM-DD y DD/MM/AAAA, y rechaza lo imposible o futuro", () => {
  assert.equal(parseBirthDate("1990-02-05", TODAY), "1990-02-05");
  assert.equal(parseBirthDate("5/2/1990", TODAY), "1990-02-05");
  assert.equal(parseBirthDate("05/02/1990", TODAY), "1990-02-05");
  assert.equal(parseBirthDate("1990-02-31", TODAY), null);
  assert.equal(parseBirthDate("2027-01-01", TODAY), null);
  assert.equal(parseBirthDate("1850-01-01", TODAY), null);
  assert.equal(parseBirthDate("ayer", TODAY), null);
  assert.equal(parseBirthDate(19900205, TODAY), null);
});

test("el club se busca por nombre o abreviatura entre los del torneo", () => {
  assert.equal(matchClub("lgk", clubs).club.id, "c-lgk");
  assert.equal(matchClub("unión deportiva ensenada", clubs).club.id, "c-ude");
  assert.equal(matchClub("Union Deportiva Ensenada", clubs).club.id, "c-ude");
  assert.equal(matchClub("UDE", clubs).club.id, "c-ude");
  assert.equal(matchClub("Otro", clubs).error, "no_coincide");
  assert.equal(matchClub("", clubs).error, "falta");
  assert.equal(matchClub("x", [{ id: "1", name: "X", shortName: "A" }, { id: "2", name: "Y", shortName: "x" }]).error, "ambiguo");
});

test("una fila correcta se crea con el nombre limpio y el club del torneo", () => {
  const plan = run([row({ nombres: "  Ana   María " })]);
  assert.equal(plan.problems.length, 0);
  assert.deepEqual(plan.create, [
    { row: 1, firstName: "Ana María", lastName: "Núñez Peña", dni: "10000001", birthDate: "1990-02-05", clubId: "c-lgk", clubName: "LGK" },
  ]);
});

test("una fila sin club usa el equipo del archivo", () => {
  const plan = run([row({ club: undefined })], { defaultClub: "LGK" });
  assert.equal(plan.create.length, 1);
  assert.equal(run([row({ club: undefined })]).problems[0].reason, "Falta el club");
});

test("cada dato inválido se reporta con su fila y no se crea", () => {
  const plan = run([
    row({ nombres: "" }),
    row({ apellidos: " " }),
    row({ dni: "123" }),
    row({ fechaNacimiento: "1990-13-01" }),
    row({ club: "Fantasma" }),
  ]);
  assert.equal(plan.create.length, 0);
  assert.deepEqual(plan.problems.map((p) => p.row), [1, 2, 3, 4, 5]);
  assert.match(plan.problems[4].reason, /no es un equipo de este torneo/);
});

test("un DNI repetido en el archivo marca todas sus filas y no crea ninguna", () => {
  const plan = run([row(), row({ nombres: "Otro", dni: "10000001" }), row({ dni: "10000002" })]);
  assert.deepEqual(plan.problems.map((p) => p.row), [1, 2]);
  assert.equal(plan.create.length, 1);
  assert.equal(plan.create[0].dni, "10000002");
});

test("un DNI que ya tiene cuenta se avisa para vincularlo, no se duplica", () => {
  const plan = run([row()], { accountDnis: new Set(["10000001"]) });
  assert.equal(plan.create.length, 0);
  assert.match(plan.problems[0].reason, /Ya existe una cuenta/);
});

test("correr la carga otra vez no duplica: lo ya cargado en ese equipo se omite", () => {
  const plan = run([row()], { existingProvisional: new Map([["10000001", "c-lgk"]]) });
  assert.equal(plan.create.length, 0);
  assert.equal(plan.alreadyLoaded.length, 1);
  assert.equal(plan.problems.length, 0);
});

test("un provisional solo está en un equipo: el mismo DNI en otro equipo es un problema", () => {
  const plan = run([row()], { existingProvisional: new Map([["10000001", "c-ude"]]) });
  assert.equal(plan.create.length, 0);
  assert.match(plan.problems[0].reason, /solo está en uno/);
});
