// Pruebas de src/_lib/content.ts (validación y apoyo del contenido editable: Ayuda, Términos y Políticas), sin servidor.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LIMITS, categoriesOf, kindFromSlug, paragraphsOf, validateSections } from "../../src/_lib/content.ts";
import { DEFAULT_CONTENT } from "../../src/_lib/content-defaults.ts";

const faq = (category, title, body) => ({ category, title, body });

test("el tipo sale de la dirección; uno desconocido es null", () => {
  assert.equal(kindFromSlug("ayuda"), "AYUDA");
  assert.equal(kindFromSlug("terminos"), "TERMINOS");
  assert.equal(kindFromSlug("politicas"), "POLITICAS");
  assert.equal(kindFromSlug("otro"), null);
  assert.equal(kindFromSlug("AYUDA"), null);
});

test("Ayuda: pide categoría, pregunta y respuesta, y recorta los espacios", () => {
  const ok = validateSections("AYUDA", [faq("  General ", " ¿Cómo? ", " Así. ")]);
  assert.deepEqual(ok, { ok: true, sections: [faq("General", "¿Cómo?", "Así.")] });

  assert.match(validateSections("AYUDA", [faq("", "P", "R")]).error, /categoría de la sección 1/);
  assert.match(validateSections("AYUDA", [faq("G", "", "R")]).error, /pregunta de la sección 1/);
  assert.match(validateSections("AYUDA", [faq("G", "P", "  ")]).error, /texto de la sección 1/);
});

test("Términos y Políticas: el título es opcional, el texto no, y no llevan categoría", () => {
  for (const kind of ["TERMINOS", "POLITICAS"]) {
    const r = validateSections(kind, [{ category: "Sobra", title: "", body: "Apertura." }, { title: "1. Uso.", body: "Texto." }]);
    assert.deepEqual(r, {
      ok: true,
      sections: [
        { category: null, title: "", body: "Apertura." },
        { category: null, title: "1. Uso.", body: "Texto." },
      ],
    });
    assert.match(validateSections(kind, [{ title: "Sin texto", body: "" }]).error, /texto de la sección 1/);
  }
});

test("el mensaje dice cuál sección falla", () => {
  const r = validateSections("TERMINOS", [{ body: "bien" }, { body: "bien" }, { body: "" }]);
  assert.match(r.error, /sección 3/);
});

test("rechaza lo que no es una lista de secciones bien formadas", () => {
  assert.equal(validateSections("AYUDA", undefined).ok, false);
  assert.equal(validateSections("AYUDA", "texto").ok, false);
  assert.equal(validateSections("AYUDA", [null]).ok, false);
  assert.equal(validateSections("AYUDA", [{ category: "G", title: 5, body: "R" }]).ok, false);
  assert.equal(validateSections("AYUDA", [{ category: "G", title: "P", body: 7 }]).ok, false);
  assert.equal(validateSections("TERMINOS", [{ body: "x", category: 3 }]).ok, false);
});

test("respeta los límites de largo y de cantidad", () => {
  const largo = (n) => "a".repeat(n);
  assert.equal(validateSections("TERMINOS", [{ title: largo(LIMITS.title), body: largo(LIMITS.body) }]).ok, true);
  assert.equal(validateSections("TERMINOS", [{ title: largo(LIMITS.title + 1), body: "x" }]).ok, false);
  assert.equal(validateSections("TERMINOS", [{ body: largo(LIMITS.body + 1) }]).ok, false);
  assert.equal(validateSections("AYUDA", [faq(largo(LIMITS.category + 1), "P", "R")]).ok, false);

  const muchas = (n) => Array.from({ length: n }, () => ({ body: "x" }));
  assert.equal(validateSections("TERMINOS", muchas(LIMITS.sections)).ok, true);
  assert.equal(validateSections("TERMINOS", muchas(LIMITS.sections + 1)).ok, false);
});

test("una lista vacía es válida (vuelve al texto de partida)", () => {
  assert.deepEqual(validateSections("AYUDA", []), { ok: true, sections: [] });
});

test("las categorías salen sin repetir y en el orden en que aparecen", () => {
  const list = [faq("Torneos", "a", "b"), faq("General", "c", "d"), faq("Torneos", "e", "f")];
  assert.deepEqual(categoriesOf(list), ["Torneos", "General"]);
  assert.deepEqual(categoriesOf([]), []);
  assert.deepEqual(categoriesOf([{ category: null, title: "", body: "x" }]), []);
});

test("los párrafos se separan por una línea en blanco; las líneas sueltas se conservan", () => {
  assert.deepEqual(paragraphsOf("Uno.\n\nDos.\r\n\r\n  \nTres\nsigue."), ["Uno.", "Dos.", "Tres\nsigue."]);
  assert.deepEqual(paragraphsOf("   "), []);
});

test("el texto de partida es válido para su tipo, y Ayuda tiene más de una categoría", () => {
  for (const kind of ["AYUDA", "TERMINOS", "POLITICAS"]) {
    assert.equal(validateSections(kind, DEFAULT_CONTENT[kind]).ok, true, kind);
  }
  assert.ok(categoriesOf(DEFAULT_CONTENT.AYUDA).length >= 2);
});
