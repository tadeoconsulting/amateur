// Pruebas unitarias de src/_lib/time-ago.ts (sin servidor ni base de datos).
import { test } from "node:test";
import assert from "node:assert/strict";
import { timeAgo } from "../../src/_lib/time-ago.ts";

const NOW = Date.parse("2026-10-01T12:00:00Z");
const ago = (ms) => new Date(NOW - ms).toISOString();

test("menos de un minuto es 'ahora'", () => {
  assert.equal(timeAgo(ago(0), NOW), "ahora");
  assert.equal(timeAgo(ago(59_000), NOW), "ahora");
});

test("minutos, horas y días", () => {
  assert.equal(timeAgo(ago(60_000), NOW), "hace 1 min");
  assert.equal(timeAgo(ago(59 * 60_000), NOW), "hace 59 min");
  assert.equal(timeAgo(ago(60 * 60_000), NOW), "hace 1 h");
  assert.equal(timeAgo(ago(23 * 3_600_000), NOW), "hace 23 h");
  assert.equal(timeAgo(ago(24 * 3_600_000), NOW), "hace 1 día");
  assert.equal(timeAgo(ago(3 * 24 * 3_600_000), NOW), "hace 3 días");
});

test("una fecha futura (reloj desajustado) no da un número negativo", () => {
  assert.equal(timeAgo(new Date(NOW + 5 * 60_000).toISOString(), NOW), "ahora");
});
