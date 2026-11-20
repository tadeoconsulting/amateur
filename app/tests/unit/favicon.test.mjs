// Favicon de la plataforma (2026-11-19): Next.js lo toma de `src/app/icon.png` (pestaña del navegador) y de
// `src/app/apple-icon.png` (pantalla de inicio del iPhone). Son el logo cuadrado de 400 × 400 px.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

for (const nombre of ["icon.png", "apple-icon.png"]) {
  test(`${nombre} es un PNG cuadrado de 400 px`, () => {
    const bytes = readFileSync(new URL(`../../src/app/${nombre}`, import.meta.url));
    assert.deepEqual([...bytes.subarray(0, 8)], PNG, "firma de PNG");
    // El tamaño va en el bloque IHDR: ancho y alto como enteros de 4 bytes desde el byte 16.
    assert.equal(bytes.readUInt32BE(16), 400, "ancho");
    assert.equal(bytes.readUInt32BE(20), 400, "alto");
  });
}
