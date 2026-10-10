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
    { row: 1, firstName: "Ana María", lastName: "Núñez Peña", dni: "10000001", birthDate: "1990-02-05", clubId: "c-lgk", clubName: "LGK", minor: false },
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

test("las filas pegadas desde una hoja (tabulaciones) se leen con su encabezado, en cualquier orden", async () => {
  const { parseTable } = await import("../../src/_lib/provisional-import.ts");
  const text = ["DNI\tNombres\tApellidos\tClub\tFecha de nacimiento", "10000001\tAna María\tNúñez Peña\tLGK\t1990-02-05", "10000002\tLuis\tPrueba Dos\tLGK\t15/02/1995"].join("\n");
  const rows = parseTable(text);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { dni: "10000001", nombres: "Ana María", apellidos: "Núñez Peña", club: "LGK", fechaNacimiento: "1990-02-05" });
  assert.equal(rows[1].fechaNacimiento, "15/02/1995");
});

test("sin encabezado, las columnas van en el orden nombres, apellidos, club, DNI, fecha de nacimiento", async () => {
  const { parseTable } = await import("../../src/_lib/provisional-import.ts");
  const rows = parseTable("Ana María\tNúñez Peña\tLGK\t10000001\t1990-02-05\n\nLuis\tPrueba Dos\tLGK\t10000002\t1995-02-15\n");
  assert.equal(rows.length, 2); // la línea en blanco no cuenta
  assert.deepEqual(rows[0], { nombres: "Ana María", apellidos: "Núñez Peña", club: "LGK", dni: "10000001", fechaNacimiento: "1990-02-05" });
});

test("un CSV con ; o , y comillas también se lee, y un BOM de Excel no molesta", async () => {
  const { parseTable } = await import("../../src/_lib/provisional-import.ts");
  const semi = parseTable("﻿nombre;apellido;equipo;dni;nacimiento\nAna;Núñez;LGK;10000001;1990-02-05");
  assert.deepEqual(semi, [{ nombres: "Ana", apellidos: "Núñez", club: "LGK", dni: "10000001", fechaNacimiento: "1990-02-05" }]);
  const commas = parseTable('nombres,apellidos,club,dni,fecha de nacimiento\n"Ana, María",Núñez,LGK,10000001,1990-02-05');
  assert.equal(commas[0].nombres, "Ana, María");
  assert.equal(commas[0].dni, "10000001");
});

test("las filas pegadas pasan por la misma validación que el JSON", async () => {
  const { parseTable } = await import("../../src/_lib/provisional-import.ts");
  const rows = parseTable("nombres\tapellidos\tclub\tdni\tfechaNacimiento\nAna\tNúñez\tLGK\t10000001\t1990-02-05\nLuis\tDos\tLGK\t2000002\t1995-02-15");
  const plan = run(rows);
  assert.equal(plan.create.length, 1);
  assert.equal(plan.problems.length, 1);
  assert.match(plan.problems[0].reason, /7 dígitos.*0 al inicio/); // Excel suele quitar el cero inicial
});

test("un encabezado con columna # y la fecha como F.N. se entiende (la columna # se ignora)", async () => {
  const { parseTable } = await import("../../src/_lib/provisional-import.ts");
  const T = "\t";
  const text = ["#", "Nombres", "Apellidos", "Club", "DNI", "F.N."].join(T) + "\n" + ["1", "Ana María", "Núñez Peña", "LGK", "10000001", "05/02/1990"].join(T) + "\n" + ["2", "Luis", "Prueba Dos", "LGK", "10000002", "15/02/1995"].join(T);
  const rows = parseTable(text);
  assert.deepEqual(rows[0], { nombres: "Ana María", apellidos: "Núñez Peña", club: "LGK", dni: "10000001", fechaNacimiento: "05/02/1990" });
  const plan = run(rows);
  assert.equal(plan.problems.length, 0);
  assert.deepEqual(plan.create.map((p) => p.birthDate), ["1990-02-05", "1995-02-15"]);
});

test("el admin corrige datos de un provisional: solo se valida lo que viene", async () => {
  const { parseProvisionalEdit } = await import("../../src/_lib/provisional-import.ts");
  assert.deepEqual(parseProvisionalEdit({}, TODAY), { data: {} });
  assert.deepEqual(parseProvisionalEdit({ firstName: "  Ana   María ", dni: "10000001", birthDate: "1990-02-05" }, TODAY), {
    data: { firstName: "Ana María", dni: "10000001", birthDate: "1990-02-05" },
  });
  assert.match(parseProvisionalEdit({ firstName: "  " }, TODAY).error, /nombres/);
  assert.match(parseProvisionalEdit({ lastName: "" }, TODAY).error, /apellidos/);
  assert.match(parseProvisionalEdit({ dni: "123" }, TODAY).error, /8 dígitos/);
  assert.match(parseProvisionalEdit({ birthDate: "2999-01-01" }, TODAY).error, /fecha/);
  // la posición y demás no son de esta función: se ignoran
  assert.deepEqual(parseProvisionalEdit({ position: "Portero" }, TODAY), { data: {} });
});

test("menor de 18: el día que cumple 18 años ya no lo es", async () => {
  const { ageOn, isMinor } = await import("../../src/_lib/provisional-import.ts");
  assert.equal(ageOn("2008-10-10", "2026-10-10"), 18);
  assert.equal(isMinor("2008-10-10", "2026-10-10"), false); // cumple 18 hoy
  assert.equal(isMinor("2008-10-11", "2026-10-10"), true); // los cumple mañana
  assert.equal(isMinor("2000-02-29", "2026-10-10"), false);
  assert.equal(ageOn("2000-12-31", "2026-01-01"), 25);
});

test("cada fila a crear dice si es menor de 18", () => {
  const plan = run([row({ fechaNacimiento: "2010-05-01" }), row({ dni: "10000002", fechaNacimiento: "1990-02-05" })]);
  assert.deepEqual(plan.create.map((p) => p.minor), [true, false]);
});

test("lo pegado se lee como JSON o como filas, y lo vacío o roto avisa", async () => {
  const { parseInput } = await import("../../src/_lib/provisional-import.ts");
  const json = parseInput('{"equipo":"LGK","jugadores":[{"nombres":"Ana","apellidos":"Núñez","dni":"10000001","fechaNacimiento":"1990-02-05"}]}');
  assert.equal(json.rows.length, 1);
  assert.equal(json.equipo, "LGK");
  assert.equal(parseInput('[{"nombres":"Ana"}]').rows.length, 1);
  const T = "\t";
  const tabla = parseInput(["Nombres", "Apellidos", "Club", "DNI", "F.N."].join(T) + "\n" + ["Ana", "Núñez", "LGK", "10000001", "05/02/1990"].join(T));
  assert.equal(tabla.rows.length, 1);
  assert.equal(tabla.rows[0].club, "LGK");
  assert.match(parseInput("   ").error, /No se encontró/);
  assert.match(parseInput("{no es json").error, /JSON no es válido/);
  assert.match(parseInput('{"jugadores": []}').error, /lista de jugadores/);
});
