// Pruebas unitarias de src/_lib/player-clubs.ts (sin servidor ni base de datos).
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveActiveClubId } from "../../src/_lib/player-clubs.ts";

const m = (clubId, createdAt) => ({ clubId, createdAt });
const A = m("club-a", "2026-01-01T00:00:00Z");
const B = m("club-b", "2026-03-01T00:00:00Z");

test("sin equipos no hay equipo activo", () => {
  assert.equal(resolveActiveClubId([], null), null);
  assert.equal(resolveActiveClubId([], "club-a"), null);
});

test("las fichas libres (sin club) no cuentan como equipo", () => {
  assert.equal(resolveActiveClubId([m(null, "2026-01-01T00:00:00Z")], null), null);
  assert.equal(resolveActiveClubId([m(null, "2026-01-01T00:00:00Z"), B], null), "club-b");
});

test("si nunca eligió, es el equipo más antiguo (sin importar el orden de la lista)", () => {
  assert.equal(resolveActiveClubId([B, A], null), "club-a");
  assert.equal(resolveActiveClubId([B, A], undefined), "club-a");
});

test("si eligió uno y sigue siendo suyo, es ese", () => {
  assert.equal(resolveActiveClubId([A, B], "club-b"), "club-b");
});

test("si el que eligió ya no es uno de sus equipos, vuelve al más antiguo", () => {
  assert.equal(resolveActiveClubId([A, B], "club-que-dejo"), "club-a");
});

test("acepta fechas como Date o como texto", () => {
  assert.equal(resolveActiveClubId([m("x", new Date("2026-05-01")), m("y", new Date("2026-02-01"))], null), "y");
});
