// Formato de la hora a la que se jugó un partido (junto a «Final» en la fila del fixture).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { playedTimeLabel } from "../../src/_lib/match-format.ts";

describe("playedTimeLabel", () => {
  test("usa la hora real de inicio, en hora de Lima (UTC-5)", () => {
    assert.equal(playedTimeLabel({ startedAt: "2026-11-21T20:05:00.000Z", time: "10:00" }), "03:05 pm");
    assert.equal(playedTimeLabel({ startedAt: "2026-11-21T15:00:00.000Z", time: "" }), "10:00 am");
  });
  test("pasada la medianoche UTC sigue siendo la noche anterior en Lima", () => {
    assert.equal(playedTimeLabel({ startedAt: "2026-11-22T01:30:00.000Z", time: "" }), "08:30 pm");
  });
  test("sin hora real, usa la programada", () => {
    assert.equal(playedTimeLabel({ startedAt: null, time: "18:30" }), "06:30 pm");
    assert.equal(playedTimeLabel({ time: "09:15" }), "09:15 am");
  });
  test("una hora real inválida cae a la programada", () => {
    assert.equal(playedTimeLabel({ startedAt: "no-es-una-fecha", time: "18:30" }), "06:30 pm");
  });
  test("sin ninguna de las dos, no hay hora (partidos antiguos cargados sin hora)", () => {
    assert.equal(playedTimeLabel({ startedAt: null, time: "" }), null);
  });
});

describe("la fila del partido", () => {
  const fila = readFileSync(new URL("../../src/_components/match-row.tsx", import.meta.url), "utf8");
  test("muestra la hora solo en los partidos finalizados", () => {
    assert.match(fila, /const playedAt = match\.status === "finalizado" \? playedTimeLabel\(match\) : null;/);
  });
  test("el orden de la columna, de arriba abajo, es: estado, grupo (si hay) y hora, en las dos tarjetas", () => {
    // Tarjeta angosta
    assert.match(fila, /\{match\.groupName && <p [^>]*>\{match\.groupName\}<\/p>\}\s*\{playedAt && <p /);
    // Tarjeta ancha
    assert.match(fila, /\{match\.groupName && <span [^>]*>\{match\.groupName\}<\/span>\}\s*\{playedAt && <span /);
    assert.doesNotMatch(fila, /Final<\/span>\s*\{\/\*[^*]*\*\/\}\s*\{playedAt/, "la hora ya no va pegada a «Final»");
  });
});
