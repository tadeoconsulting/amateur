// Pruebas de src/_lib/live-matches.ts (a qué partidos se suscribe una pantalla con tiempo real, OBS-36), sin servidor.
import { test } from "node:test";
import assert from "node:assert/strict";
import { watchableMatchIds } from "../../src/_lib/live-matches.ts";

const m = (id, status) => ({ id, status });

test("se escuchan los programados y los que están en juego; los finalizados no", () => {
  const matches = [m("a", "programado"), m("b", "en_curso"), m("c", "finalizado"), m("d", "programado")];
  assert.deepEqual(watchableMatchIds(matches), ["a", "b", "d"]);
});

test("hay que escuchar los programados desde antes de que arranquen, o nadie se entera del inicio", () => {
  assert.deepEqual(watchableMatchIds([m("a", "programado")]), ["a"]);
});

test("un torneo terminado no suscribe a nada", () => {
  assert.deepEqual(watchableMatchIds([m("a", "finalizado"), m("b", "finalizado")]), []);
  assert.deepEqual(watchableMatchIds([]), []);
});

test("un partido que se reabre vuelve a escucharse (su estado ya no es finalizado)", () => {
  assert.deepEqual(watchableMatchIds([m("a", "en_curso")]), ["a"]);
});

test("no modifica la lista recibida", () => {
  const matches = [m("a", "programado"), m("b", "finalizado")];
  watchableMatchIds(matches);
  assert.equal(matches.length, 2);
});
