// Pruebas unitarias de src/_lib/match-tone.ts (sin servidor ni React).
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchTone, MATCH_TONE } from "../../src/_lib/match-tone.ts";

test("en vivo es rojo, descanso es negro y finalizado es gris", () => {
  assert.equal(matchTone("en_curso", "primer_tiempo"), "live");
  assert.equal(matchTone("en_curso", "segundo_tiempo"), "live");
  assert.equal(matchTone("en_curso", null), "live", "un partido sin tiempos sigue en vivo");
  assert.equal(matchTone("en_curso", "descanso"), "break");
  assert.equal(matchTone("finalizado", "segundo_tiempo"), "finished");
  assert.equal(matchTone("finalizado", "descanso"), "finished", "terminado desde el descanso, ya es final");
  assert.equal(matchTone("programado"), "scheduled");

  assert.match(MATCH_TONE.live.bar, /red/);
  assert.match(MATCH_TONE.break.bar, /surface-secondary/, "negro (#1B1B1B)");
  assert.match(MATCH_TONE.finished.bar, /brand-500/, "gris (#6D6D6D)");
});

test("ningún estado en vivo, descanso o final usa el verde", () => {
  for (const tone of ["live", "break", "finished"]) {
    for (const cls of Object.values(MATCH_TONE[tone])) assert.doesNotMatch(cls, /green|verification/);
  }
});
