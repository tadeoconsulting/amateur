// Pruebas unitarias de src/_lib/safe-next.ts (sin servidor ni base de datos).
import { test } from "node:test";
import assert from "node:assert/strict";
import { safeInternalPath } from "../../src/_lib/safe-next.ts";

test("acepta rutas internas, con query", () => {
  assert.equal(safeInternalPath("/club/torneos", "/x"), "/club/torneos");
  assert.equal(safeInternalPath("/convocatoria/abc?ref=1", "/x"), "/convocatoria/abc?ref=1");
});

test("rechaza destinos externos o ambiguos y usa el de respaldo", () => {
  for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "evil.com", "", null, undefined, "javascript:alert(1)"]) {
    assert.equal(safeInternalPath(bad, "/x"), "/x", String(bad));
  }
});
