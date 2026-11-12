// W.O. y resultado directo de un partido (especificación 019). Los nombres son inventados.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { directResultProblem, isWalkover, walkoverNote, walkoverScore, walkoverWinnerSide, WALKOVER_GOALS } from "../../src/_lib/walkover.ts";

describe("W.O.", () => {
  test("solo existen home, away y both", () => {
    for (const v of ["home", "away", "both"]) assert.ok(isWalkover(v), v);
    for (const v of ["", "local", null, undefined, 1, "HOME"]) assert.ok(!isWalkover(v), String(v));
  });

  test("el marcador: 3-0 para quien se presentó y 0-0 si no se presentó ninguno", () => {
    assert.equal(WALKOVER_GOALS, 3);
    assert.deepEqual(walkoverScore("home"), { home: 3, away: 0 });
    assert.deepEqual(walkoverScore("away"), { home: 0, away: 3 });
    assert.deepEqual(walkoverScore("both"), { home: 0, away: 0 });
  });

  test("quién gana: el que se presentó, y nadie en un W.O. doble", () => {
    assert.equal(walkoverWinnerSide("home"), "home");
    assert.equal(walkoverWinnerSide("away"), "away");
    assert.equal(walkoverWinnerSide("both"), null);
  });

  test("la frase nombra al equipo que no se presentó", () => {
    assert.equal(walkoverNote("home", "Club Uno", "Club Dos"), "W.O.: no se presentó Club Dos");
    assert.equal(walkoverNote("away", "Club Uno", "Club Dos"), "W.O.: no se presentó Club Uno");
    assert.match(walkoverNote("both", "Club Uno", "Club Dos"), /ninguno de los dos/);
  });
});

describe("directResultProblem", () => {
  const base = { decisive: false, homeScore: 2, awayScore: 1 };

  test("un partido que admite empate o con ganador no pide nada", () => {
    assert.equal(directResultProblem(base), null);
    assert.equal(directResultProblem({ ...base, homeScore: 1, awayScore: 1 }), null, "empate en liga");
    assert.equal(directResultProblem({ decisive: true, homeScore: 2, awayScore: 0 }), null, "eliminación con ganador");
  });

  test("fuera de un empate de eliminación no se aceptan ganador ni penales", () => {
    assert.match(directResultProblem({ ...base, winner: "home" }), /Solo un empate/);
    assert.match(directResultProblem({ ...base, penaltyHome: 3, penaltyAway: 1 }), /Solo un empate/);
    assert.match(directResultProblem({ decisive: false, homeScore: 1, awayScore: 1, winner: "away" }), /Solo un empate/);
    assert.match(directResultProblem({ decisive: true, homeScore: 3, awayScore: 1, winner: "home" }), /Solo un empate/);
  });

  test("un empate de eliminación necesita quién avanza", () => {
    const tied = { decisive: true, homeScore: 1, awayScore: 1 };
    assert.match(directResultProblem(tied), /elige quién avanza/);
    assert.equal(directResultProblem({ ...tied, winner: "home" }), null);
    assert.equal(directResultProblem({ ...tied, winner: "away" }), null);
  });

  test("los penales son opcionales, van de a dos y el que avanza gana la tanda", () => {
    const tied = { decisive: true, homeScore: 0, awayScore: 0, winner: "home" };
    assert.equal(directResultProblem({ ...tied, penaltyHome: 4, penaltyAway: 3 }), null);
    assert.equal(directResultProblem({ ...tied, penaltyHome: 5, penaltyAway: 0 }), null);
    assert.match(directResultProblem({ ...tied, penaltyHome: 4 }), /los dos equipos/);
    assert.match(directResultProblem({ ...tied, penaltyAway: 4 }), /los dos equipos/);
    assert.match(directResultProblem({ ...tied, penaltyHome: 3, penaltyAway: 3 }), /empatados/);
    assert.match(directResultProblem({ ...tied, penaltyHome: 2, penaltyAway: 4 }), /ganar la tanda/);
    assert.match(directResultProblem({ ...tied, winner: "away", penaltyHome: 4, penaltyAway: 3 }), /ganar la tanda/);
  });
});
