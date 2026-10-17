// Pruebas de src/_lib/public-cache.ts (caché de borde de las lecturas públicas, OBS-58), sin servidor.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PUBLIC_CACHE_CONTROL, isPublicRead, publicCacheHeaders, withPublicRead } from "../../src/_lib/public-cache.ts";

test("solo `?pub=1` es una lectura pública: cualquier otra cosa queda como siempre", () => {
  assert.equal(isPublicRead("https://x.test/api/matches?tournamentId=t1&pub=1"), true);
  assert.equal(isPublicRead("?pub=1"), true);
  assert.equal(isPublicRead("pub=1&v=5"), true);
  for (const no of ["https://x.test/api/matches?tournamentId=t1", "?pub=0", "?pub=true", "?pub=", "https://x.test/api/matches", ""]) {
    assert.equal(isPublicRead(no), false, no);
  }
});

test("la caché de borde se pide solo con `pub=1`, corta, y el navegador siempre vuelve a preguntar", () => {
  assert.deepEqual(publicCacheHeaders("?pub=1"), { "Cache-Control": PUBLIC_CACHE_CONTROL });
  assert.deepEqual(publicCacheHeaders("?tournamentId=t1"), {});
  assert.match(PUBLIC_CACHE_CONTROL, /\bpublic\b/);
  assert.match(PUBLIC_CACHE_CONTROL, /max-age=0/);
  assert.match(PUBLIC_CACHE_CONTROL, /s-maxage=3\b/);
  assert.ok(!/stale-while-revalidate/.test(PUBLIC_CACHE_CONTROL), "sin servir datos viejos mientras se renueva");
});

test("withPublicRead agrega pub=1 y, si hay versión, v; conserva lo que ya tenía la ruta", () => {
  assert.equal(withPublicRead("/api/tournaments/t1/standings?live=1"), "/api/tournaments/t1/standings?live=1&pub=1");
  assert.equal(withPublicRead("/api/matches?tournamentId=t1", 1700000000123), "/api/matches?tournamentId=t1&pub=1&v=1700000000123");
  assert.equal(withPublicRead("/api/tournaments"), "/api/tournaments?pub=1");
  assert.equal(withPublicRead("/api/tournaments/t1", 0), "/api/tournaments/t1?pub=1", "versión 0: sin v");
});

test("withPublicRead no duplica los parámetros si se aplica dos veces", () => {
  const once = withPublicRead("/api/matches?tournamentId=t1", 5);
  assert.equal(withPublicRead(once, 9), "/api/matches?tournamentId=t1&pub=1&v=9");
});

test("todos los espectadores con la misma versión piden exactamente la misma dirección", () => {
  assert.equal(withPublicRead("/api/matches?tournamentId=t1", 42), withPublicRead("/api/matches?tournamentId=t1", 42));
  assert.notEqual(withPublicRead("/api/matches?tournamentId=t1", 42), withPublicRead("/api/matches?tournamentId=t1", 43));
});
