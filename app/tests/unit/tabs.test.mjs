// Tabs únicos (especificación 024): el teclado de los tabs y que no queden tabs hechos a mano ni los componentes viejos.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { nextTabIndex, nextTabIndexWrapping } from "../../src/_lib/tabs.ts";

describe("nextTabIndex (teclado de los tabs)", () => {
  test("→ y ← avanzan y retroceden, y se detienen en los bordes", () => {
    assert.equal(nextTabIndex("ArrowRight", 0, 3), 1);
    assert.equal(nextTabIndex("ArrowLeft", 2, 3), 1);
    assert.equal(nextTabIndex("ArrowRight", 2, 3), null);
    assert.equal(nextTabIndex("ArrowLeft", 0, 3), null);
  });
  test("Inicio y Fin saltan al primero y al último", () => {
    assert.equal(nextTabIndex("Home", 2, 4), 0);
    assert.equal(nextTabIndex("End", 0, 4), 3);
    assert.equal(nextTabIndex("Home", 0, 4), null);
  });
  test("otras teclas o listas vacías no mueven nada", () => {
    assert.equal(nextTabIndex("a", 1, 3), null);
    assert.equal(nextTabIndex("ArrowRight", 0, 0), null);
    assert.equal(nextTabIndex("ArrowRight", -1, 3), null);
  });
});

describe("nextTabIndexWrapping (la landing)", () => {
  test("da la vuelta en los bordes", () => {
    assert.equal(nextTabIndexWrapping("ArrowRight", 3, 4), 0);
    assert.equal(nextTabIndexWrapping("ArrowLeft", 0, 4), 3);
    assert.equal(nextTabIndexWrapping("End", 0, 4), 3);
  });
});

function archivos(dir, salida = []) {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) archivos(ruta, salida);
    else if (/\.tsx?$/.test(nombre)) salida.push(ruta);
  }
  return salida;
}

describe("un solo componente de tabs", () => {
  test("los componentes viejos ya no existen", () => {
    for (const f of ["pill-tabs.tsx", "sub-tabs.tsx", "category-tabs.tsx"]) {
      assert.equal(existsSync(join("src/_components", f)), false, `${f} debe haberse eliminado: se usa Tabs`);
    }
  });
  test("nadie importa los componentes viejos ni arma tabs a mano (role=\"tab\")", () => {
    for (const ruta of archivos("src")) {
      if (ruta.endsWith(join("_components", "tabs.tsx"))) continue;
      const texto = readFileSync(ruta, "utf8");
      assert.ok(!/_components\/(pill-tabs|sub-tabs|category-tabs)/.test(texto), `${ruta} importa un componente de tabs eliminado`);
      assert.ok(!/role="tab"/.test(texto), `${ruta} arma tabs a mano: usa Tabs de @/_components/tabs`);
    }
  });
});
