// Pruebas de src/_lib/live-version.ts (versión del último aviso en vivo, OBS-58), sin servidor.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getLiveVersion, noteLiveVersion, resetLiveVersion, versionOf } from "../../src/_lib/live-version.ts";

beforeEach(() => resetLiveVersion());

test("antes de cualquier aviso la versión es 0 (primera carga, sin `v`)", () => {
  assert.equal(getLiveVersion(), 0);
});

test("la versión sale del aviso; sin ella (servidor anterior) se usa la hora del navegador", () => {
  assert.equal(versionOf({ v: 1700000000123 }), 1700000000123);
  assert.equal(versionOf(null, 555), 555);
  assert.equal(versionOf(undefined, 555), 555);
  assert.equal(versionOf({}, 555), 555);
  assert.equal(versionOf({ v: "no" }, 555), 555);
  assert.equal(versionOf({ v: -4 }, 555), 555);
  assert.equal(versionOf({ v: NaN }, 555), 555);
  assert.equal(versionOf({ v: 12.9 }, 555), 12, "se queda con la parte entera");
});

test("la versión solo sube: un aviso atrasado no hace volver a una lectura vieja", () => {
  assert.equal(noteLiveVersion({ v: 100 }), 100);
  assert.equal(noteLiveVersion({ v: 250 }), 250);
  assert.equal(noteLiveVersion({ v: 120 }), 250, "uno anterior no la baja");
  assert.equal(getLiveVersion(), 250);
});

test("dos espectadores que reciben el mismo aviso quedan con la misma versión", () => {
  const aviso = { v: 1700000000999 };
  assert.equal(noteLiveVersion(aviso, 1), 1700000000999);
  resetLiveVersion();
  assert.equal(noteLiveVersion(aviso, 99999), 1700000000999, "sin importar su reloj");
});
