// Pruebas unitarias de src/_lib/realtime.ts (sin servidor ni Ably real).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { matchChannelName, isRealtimeConfigured, publicarEventoPartido, createMatchViewerToken } from "../../src/_lib/realtime.ts";

describe("nombre de canal", () => {
  test("un partido tiene un canal propio, con prefijo", () => {
    assert.equal(matchChannelName("abc123"), "match:abc123");
    assert.notEqual(matchChannelName("uno"), matchChannelName("otro"));
  });
});

describe("sin ABLY_API_KEY (el caso normal en desarrollo y en estas pruebas)", () => {
  test("isRealtimeConfigured() es false", () => {
    assert.equal(isRealtimeConfigured(), false);
  });

  test("publicarEventoPartido no lanza: una mutación no debe fallar por esto", async () => {
    await assert.doesNotReject(() => publicarEventoPartido("match-inexistente"));
  });

  test("createMatchViewerToken devuelve null en vez de token", async () => {
    assert.equal(await createMatchViewerToken("match-inexistente"), null);
  });
});
