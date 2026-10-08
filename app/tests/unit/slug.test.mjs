// Pruebas unitarias de src/_lib/slug.ts (sin servidor ni base de datos).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RESERVED_SLUGS, organizerSlugBase, slugify, tournamentPublicPath, tournamentSlugBase, uniqueSlug,
} from "../../src/_lib/slug.ts";

test("slugify quita tildes, símbolos y espacios sobrantes", () => {
  assert.equal(slugify("LIGA 1 - LA ENSENADA"), "liga-1-la-ensenada");
  assert.equal(slugify("  Clausura 2026  "), "clausura-2026");
  assert.equal(slugify("Copa Ñandú: Edición Única!"), "copa-nandu-edicion-unica");
  assert.equal(slugify("---"), "");
  assert.equal(slugify("🏆"), "");
});

test("slugify corta lo muy largo sin dejar un guion al final", () => {
  const long = slugify("a".repeat(59) + " bbbbbb");
  assert.ok(long.length <= 60);
  assert.ok(!long.endsWith("-"));
});

test("uniqueSlug agrega -2, -3... al repetido", () => {
  assert.equal(uniqueSlug("clausura-2026", new Set()), "clausura-2026");
  assert.equal(uniqueSlug("clausura-2026", new Set(["clausura-2026"])), "clausura-2026-2");
  assert.equal(uniqueSlug("clausura-2026", new Set(["clausura-2026", "clausura-2026-2"])), "clausura-2026-3");
});

test("el organizador sale de la organización y, si no hay, de su nombre", () => {
  assert.equal(organizerSlugBase({ organization: "Liga 1 - La Ensenada", firstName: "Robson", lastName: "Guerra" }), "liga-1-la-ensenada");
  assert.equal(organizerSlugBase({ organization: "  ", firstName: "Robson", lastName: "Guerra" }), "robson-guerra");
  assert.equal(organizerSlugBase({ organization: null, firstName: "Robson", lastName: "Guerra" }), "robson-guerra");
  assert.equal(organizerSlugBase({ organization: "!!!", firstName: "", lastName: "" }), "organizador");
});

test("el torneo sale de su nombre, con un respaldo si no queda nada", () => {
  assert.equal(tournamentSlugBase("Clausura 2026"), "clausura-2026");
  assert.equal(tournamentSlugBase("🏆🏆"), "torneo");
});

test("las pantallas de la app están reservadas y bien escritas", () => {
  for (const s of ["admin", "login", "api", "club", "jugador", "torneos", "convocatoria"]) {
    assert.ok(RESERVED_SLUGS.includes(s), s);
  }
  for (const s of RESERVED_SLUGS) assert.equal(slugify(s), s, `${s} debería ser ya un slug`);
});

test("un organizador llamado como una pantalla recibe sufijo, no esa ruta", () => {
  const taken = new Set(RESERVED_SLUGS);
  assert.equal(uniqueSlug(organizerSlugBase({ organization: "Club", firstName: "A", lastName: "B" }), taken), "club-2");
});

test("la ruta pública usa los identificadores y, si faltan, la convocatoria por id", () => {
  assert.equal(tournamentPublicPath({ id: "x1", slug: "clausura-2026", organizerSlug: "liga-1-la-ensenada" }), "/liga-1-la-ensenada/clausura-2026");
  assert.equal(tournamentPublicPath({ id: "x1", slug: null, organizerSlug: "liga" }), "/convocatoria/x1");
  assert.equal(tournamentPublicPath({ id: "x1" }), "/convocatoria/x1");
});
