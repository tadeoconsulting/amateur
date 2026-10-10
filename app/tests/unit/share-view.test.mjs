// Pruebas de la vista que se comparte de un torneo (src/_lib/share-view.ts, sin servidor ni base de datos).
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseView, shareSearch, withView } from "../../src/_lib/share-view.ts";

test("se lee la vista de la URL y se ignora lo inválido", () => {
  assert.deepEqual(parseView("?vista=resultados&sub=goleadores"), { vista: "resultados", sub: "goleadores" });
  assert.deepEqual(parseView("?vista=fixture"), { vista: "fixture", sub: null });
  assert.deepEqual(parseView("?vista=cualquiera&sub=otra"), { vista: null, sub: null });
  assert.deepEqual(parseView(""), { vista: null, sub: null });
});

test("al cambiar de vista se conservan los demás parámetros y se limpia lo que ya no aplica", () => {
  assert.equal(withView("unirme=1&fecha=3", { vista: "resultados", sub: "tabla" }), "unirme=1&vista=resultados&sub=tabla");
  assert.equal(withView("vista=resultados&sub=tabla", { vista: "equipos" }), "vista=equipos");
  assert.equal(withView("unirme=1", { vista: "fixture" }), "unirme=1&vista=fixture");
  // la fecha sobrevive en el fixture
  assert.equal(withView("fecha=3", { vista: "fixture" }), "fecha=3&vista=fixture");
});

test("el enlace para compartir lleva solo la vista: sección, fecha o ronda, o pestaña de resultados", () => {
  assert.equal(shareSearch("?unirme=1&auth=login&fecha=5", { vista: "fixture" }), "vista=fixture&fecha=5");
  assert.equal(shareSearch("?ronda=2&unirme=1", { vista: "fixture" }), "vista=fixture&ronda=2");
  assert.equal(shareSearch("?fecha=5", { vista: "resultados", sub: "goleadores" }), "vista=resultados&sub=goleadores");
  assert.equal(shareSearch("?fecha=5&unirme=1", { vista: "equipos" }), "vista=equipos");
  assert.equal(shareSearch("?fecha=abc", { vista: "fixture" }), "vista=fixture");
  assert.equal(shareSearch("", { vista: "detalles" }), "vista=detalles");
});

test("cada pestaña de jugador y organizador abre la vista pública que le corresponde", async () => {
  const { competitionView } = await import("../../src/_lib/share-view.ts");
  assert.deepEqual(competitionView("partidos"), { vista: "fixture" });
  assert.deepEqual(competitionView("llaves"), { vista: "fixture" });
  assert.deepEqual(competitionView("tabla"), { vista: "resultados", sub: "tabla" });
  assert.deepEqual(competitionView("goleadores"), { vista: "resultados", sub: "goleadores" });
  assert.deepEqual(competitionView("equipos"), { vista: "equipos" });
  assert.deepEqual(competitionView("otra"), { vista: "fixture" });
});

test("las pestañas del club: lo que no es público comparte los detalles", async () => {
  const { clubView } = await import("../../src/_lib/share-view.ts");
  assert.deepEqual(clubView("fixture", "partidos", "tabla"), { vista: "fixture" });
  assert.deepEqual(clubView("resultados", "partidos", "goleadores"), { vista: "resultados", sub: "goleadores" });
  assert.deepEqual(clubView("resultados", "partidos", "tabla"), { vista: "resultados", sub: "tabla" });
  assert.deepEqual(clubView("torneo", "partidos", "tabla"), { vista: "fixture" });
  assert.deepEqual(clubView("torneo", "inscritos", "tabla"), { vista: "equipos" });
  assert.deepEqual(clubView("torneo", "amonestados", "tabla"), { vista: "detalles" });
});

test("el enlace compartido desde una pantalla con sesión lleva la vista y la fecha, y nada más", async () => {
  const { shareUrl, competitionView } = await import("../../src/_lib/share-view.ts");
  const base = "https://cupamateur.com";
  const path = "/liga-1-la-ensenada/clausura-2026";
  assert.equal(shareUrl(base, path, "?fecha=5&saved=true", competitionView("partidos")), `${base}${path}?vista=fixture&fecha=5`);
  assert.equal(shareUrl(base, path, "?fecha=5", competitionView("goleadores")), `${base}${path}?vista=resultados&sub=goleadores`);
  assert.equal(shareUrl(base, path, "", competitionView("equipos")), `${base}${path}?vista=equipos`);
  // la ronda de las llaves se puede pasar como si viniera de la URL
  assert.equal(shareUrl(base, path, "ronda=2", competitionView("llaves")), `${base}${path}?vista=fixture&ronda=2`);
});
