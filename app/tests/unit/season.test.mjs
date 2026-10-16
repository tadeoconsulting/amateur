// Pruebas unitarias de src/_lib/season.ts (temporadas, especificación 012), sin servidor ni base de datos.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  FINAL_BRACKET_SIZES,
  countsForGeneral,
  defaultClausuraName,
  finalOutdated,
  finalTeamsOptions,
  parseFinalConfig,
  seasonChampion,
  seasonStatus,
  sumScorers,
  tournamentChampion,
} from "../../src/_lib/season.ts";
import { PLAYOFF_SIZES, seedLeagueBracket } from "../../src/_lib/fixture.ts";
import { computeStandings } from "../../src/_lib/standings.ts";

const row = (clubId, points = 0) => ({ clubId, groupName: null, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points });

describe("parseFinalConfig", () => {
  test("ninguna no lleva clasificados", () => {
    assert.deepEqual(parseFinalConfig("ninguna", 4, 10), { ok: true, finalFormat: "ninguna", finalTeams: null });
  });

  test("llaves: solo 2, 4, 8 o 16 (decisión A)", () => {
    for (const n of [2, 4, 8, 16]) assert.equal(parseFinalConfig("llaves", n, 16).ok, true, `${n}`);
    for (const n of [3, 6, 10]) assert.equal(parseFinalConfig("llaves", n, 16).ok, false, `${n}`);
  });

  test("las llaves de temporada usan los mismos tamaños que las de liga", () => {
    assert.deepEqual([...FINAL_BRACKET_SIZES], [...PLAYOFF_SIZES]);
  });

  test("liguilla: cualquier número desde 3 (decisión B)", () => {
    assert.equal(parseFinalConfig("liguilla", 3, 10).ok, true);
    assert.equal(parseFinalConfig("liguilla", 7, 10).ok, true);
    assert.equal(parseFinalConfig("liguilla", 2, 10).ok, false);
  });

  test("nunca más clasificados que equipos", () => {
    assert.equal(parseFinalConfig("liguilla", 11, 10).ok, false);
    assert.equal(parseFinalConfig("llaves", 16, 10).ok, false);
    assert.equal(parseFinalConfig("liguilla", 10, 10).ok, true);
  });

  test("las opciones del formulario son exactamente las que acepta la validación", () => {
    assert.deepEqual(finalTeamsOptions("llaves", 10), [2, 4, 8]);
    assert.deepEqual(finalTeamsOptions("liguilla", 6), [3, 4, 5, 6]);
    assert.deepEqual(finalTeamsOptions("liguilla", 2), []);
    assert.deepEqual(finalTeamsOptions("ninguna", 10), []);
    for (const format of ["llaves", "liguilla"]) {
      for (const n of finalTeamsOptions(format, 12)) assert.equal(parseFinalConfig(format, n, 12).ok, true, `${format} ${n}`);
    }
  });

  test("formato o número inválidos", () => {
    assert.equal(parseFinalConfig("copa", 4, 10).ok, false);
    assert.equal(parseFinalConfig("liguilla", "4", 10).ok, false);
    assert.equal(parseFinalConfig("liguilla", 4.5, 10).ok, false);
  });
});

describe("tabla General", () => {
  test("solo cuentan los partidos de liga terminados, no las llaves", () => {
    assert.equal(countsForGeneral({ status: "finalizado", decisive: false }), true);
    assert.equal(countsForGeneral({ status: "finalizado", decisive: true }), false);
    assert.equal(countsForGeneral({ status: "en_curso", decisive: false }), false);
  });

  test("suma Apertura y Clausura con la regla de siempre", () => {
    const teams = ["a", "b", "c"].map((clubId) => ({ clubId, groupName: null }));
    const apertura = [
      { homeTeamId: "a", awayTeamId: "b", homeScore: 1, awayScore: 0, status: "finalizado", decisive: false },
      { homeTeamId: "b", awayTeamId: "c", homeScore: 2, awayScore: 0, status: "finalizado", decisive: false },
      // Final de las llaves de la Apertura: no suma.
      { homeTeamId: "a", awayTeamId: "b", homeScore: 0, awayScore: 5, status: "finalizado", decisive: true },
    ];
    const clausura = [{ homeTeamId: "c", awayTeamId: "a", homeScore: 3, awayScore: 0, status: "finalizado", decisive: false }];
    const rows = computeStandings(teams, [...apertura, ...clausura].filter(countsForGeneral));
    const by = Object.fromEntries(rows.map((r) => [r.clubId, r]));
    assert.equal(by.a.points, 3);
    assert.equal(by.b.points, 3);
    assert.equal(by.c.points, 3);
    assert.equal(by.b.goalsFor, 2, "los 5 goles de la final de llaves no cuentan");
    assert.equal(rows[0].clubId, "c", "c tiene la mejor diferencia de gol");
  });
});

describe("siembra de la fase final por llaves", () => {
  test("mejor contra peor, en el orden que empareja planBracket", () => {
    assert.deepEqual(seedLeagueBracket(["1", "2", "3", "4"]), ["1", "4", "2", "3"]);
    assert.deepEqual(seedLeagueBracket(["1", "2", "3", "4", "5", "6", "7", "8"]), ["1", "8", "4", "5", "2", "7", "3", "6"]);
  });
});

describe("tournamentChampion", () => {
  const standings = [row("a", 9), row("b", 6)];
  const final = (winnerTeamId) => ({ decisive: true, nextMatchId: null, winnerTeamId, status: "finalizado" });
  const semi = { decisive: true, nextMatchId: "f", winnerTeamId: "c", status: "finalizado" };

  test("liga sin llaves: el primero de la tabla", () => {
    assert.equal(tournamentChampion({ format: "liga", status: "finalizado", playoffTeams: null }, standings, []), "a");
  });

  test("liga con llaves o eliminación: quien ganó la final", () => {
    assert.equal(tournamentChampion({ format: "liga", status: "finalizado", playoffTeams: 4 }, standings, [semi, final("b")]), "b");
    assert.equal(tournamentChampion({ format: "eliminacion", status: "finalizado", playoffTeams: null }, [], [semi, final("c")]), "c");
  });

  test("sin terminar no hay campeón", () => {
    assert.equal(tournamentChampion({ format: "liga", status: "en_curso", playoffTeams: null }, standings, []), null);
  });
});

describe("seasonStatus", () => {
  const done = { status: "finalizado" };
  const playing = { status: "en_curso" };

  test("recorre Apertura, Clausura y fase final", () => {
    assert.equal(seasonStatus("llaves", { apertura: playing }), "apertura");
    assert.equal(seasonStatus("llaves", { apertura: done }), "apertura");
    assert.equal(seasonStatus("llaves", { apertura: done, clausura: playing }), "clausura");
    assert.equal(seasonStatus("llaves", { apertura: done, clausura: done }), "final_pendiente");
    assert.equal(seasonStatus("llaves", { apertura: done, clausura: done, final: playing }), "final");
    assert.equal(seasonStatus("llaves", { apertura: done, clausura: done, final: done }), "terminada");
  });

  test("sin fase final termina con el Clausura", () => {
    assert.equal(seasonStatus("ninguna", { apertura: done, clausura: done }), "terminada");
  });
});

describe("seasonChampion", () => {
  const general = [row("a", 20), row("b", 18)];

  test("sin fase final: el primero de la General, recién al terminar", () => {
    assert.equal(seasonChampion("ninguna", "terminada", general, null), "a");
    assert.equal(seasonChampion("ninguna", "clausura", general, null), null);
  });

  test("con fase final: su campeón", () => {
    assert.equal(seasonChampion("llaves", "terminada", general, "b"), "b");
    assert.equal(seasonChampion("liguilla", "final", general, null), null);
  });
});

describe("finalOutdated (decisión G)", () => {
  const general = [row("a"), row("b"), row("c"), row("d"), row("e")];

  test("mismos clasificados, en cualquier orden: al día", () => {
    assert.equal(finalOutdated(general, 4, ["a", "d", "b", "c"]), false);
  });

  test("entró uno que hoy ya no clasifica: desactualizada", () => {
    assert.equal(finalOutdated(general, 4, ["a", "b", "c", "e"]), true);
  });
});

describe("sumScorers", () => {
  test("suma por jugador, de más a menos goles, y deja afuera a quien no marcó", () => {
    const stats = [
      { playerId: "p1", goals: 3, matchesPlayed: 5 },
      { playerId: "p2", goals: 4, matchesPlayed: 5 },
      { playerId: "p1", goals: 2, matchesPlayed: 4 },
      { playerId: "p3", goals: 0, matchesPlayed: 9 },
      { playerId: "p2", goals: 0, matchesPlayed: 3 },
    ];
    const rows = sumScorers(stats);
    assert.deepEqual(rows.map((r) => [r.playerId, r.goals, r.matchesPlayed]), [["p1", 5, 9], ["p2", 4, 8]]);
  });

  test("no modifica las filas recibidas", () => {
    const stats = [{ playerId: "p1", goals: 1, matchesPlayed: 1 }, { playerId: "p1", goals: 1, matchesPlayed: 1 }];
    sumScorers(stats);
    assert.equal(stats[0].goals, 1);
  });
});

test("defaultClausuraName usa el año de la Apertura", () => {
  assert.equal(defaultClausuraName(new Date("2026-03-01T00:00:00Z")), "Clausura 2026");
});
