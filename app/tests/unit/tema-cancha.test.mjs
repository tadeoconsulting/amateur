// Vigila el sistema visual "Cancha" (especificación 020) leyendo globals.css (sin servidor ni navegador): que cada par
// texto/fondo del tema cumpla el contraste de 4,5:1, que los valores salgan de la landing y que el tema claro de siempre
// no cambie (los ámbitos sin migrar siguen igual).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../../src/app/globals.css", import.meta.url), "utf8");
const landing = readFileSync(new URL("../../src/app/(landing)/_components/landing.css", import.meta.url), "utf8");

/** Las variables --c-* de un bloque (`:root` o `.tema-cancha`). */
function vars(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start > -1, `falta el bloque ${selector}`);
  const body = css.slice(start, css.indexOf("\n}", start));
  return Object.fromEntries([...body.matchAll(/--c-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2].toLowerCase()]));
}

const claro = vars(":root");
const cancha = vars(".tema-cancha");

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Rellenos fijos de estado que no cambian con el tema (los mismos de @theme).
const fijos = { verification: "#00ca81", yellow: "#f8e294", red: "#ff6363" };

test("«Cancha» redefine las mismas variables que el tema claro (ninguna queda sin valor oscuro)", () => {
  const sinValor = Object.keys(claro).filter((k) => !(k in cancha));
  assert.deepEqual(sinValor, [], `faltan en .tema-cancha: ${sinValor.join(", ")}`);
});

test("los valores de «Cancha» salen de la landing (--lc-*)", () => {
  const lc = Object.fromEntries([...landing.matchAll(/--lc-([a-z]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2].toLowerCase()]));
  assert.equal(cancha["surface-primary"], lc.bg, "fondo");
  assert.equal(cancha["surface-alt"], lc.surface, "tarjetas");
  assert.equal(cancha["border-primary"], lc.line, "línea");
  assert.equal(cancha["surface-secondary"], lc.lime, "superficie inversa = lima");
  assert.equal(cancha["text-primary"], lc.white, "texto");
  assert.equal(cancha["text-secondary"], lc.muted, "texto apagado");
  assert.equal(cancha["text-invert"], lc.ink, "tinta sobre lima");
});

test("cada par texto/fondo del tema cumple 4,5:1", () => {
  const pares = [
    ["text-primary", "surface-primary"],
    ["text-primary", "surface-alt"],
    ["text-primary", "btn-regular"],
    ["text-primary", "brand-300"],
    ["text-secondary", "surface-primary"],
    ["text-secondary", "surface-alt"],
    ["text-invert", "surface-secondary"], // el botón principal: tinta sobre lima
    ["text-invert", "brand-700"], // y su hover (lima más clara)
    ["text-primary", "tint-green"],
    ["text-primary", "tint-yellow"],
    ["text-primary", "tint-blue"],
  ];
  for (const [fg, bg] of pares) {
    const ratio = contraste(cancha[fg], cancha[bg]);
    assert.ok(ratio >= 4.5, `${fg} (${cancha[fg]}) sobre ${bg} (${cancha[bg]}): ${ratio.toFixed(2)}:1`);
  }
});

test("la tinta se lee sobre los rellenos fijos de estado (verde y amarillo) en los dos temas", () => {
  for (const [nombre, tema] of [["claro", claro], ["cancha", cancha]]) {
    for (const fill of ["verification", "yellow"]) {
      const ratio = contraste(tema.ink, fijos[fill]);
      assert.ok(ratio >= 4.5, `ink (${tema.ink}) sobre ${fill} en ${nombre}: ${ratio.toFixed(2)}:1`);
    }
  }
});

test("el tema claro de siempre no cambia (Crono DS)", () => {
  assert.equal(claro["surface-primary"], "#fafafa");
  assert.equal(claro["surface-secondary"], "#1b1b1b");
  assert.equal(claro["text-primary"], "#1b1b1b");
  assert.equal(claro["text-secondary"], "#6d6d6d");
  assert.equal(claro["text-invert"], "#fafafa");
  assert.equal(claro["border-primary"], "#1b1b1b");
  assert.equal(claro["brand-700"], "#4d4d4d");
});

test("el ámbito del organizador aplica el tema y carga las fuentes de la landing", () => {
  const layout = readFileSync(new URL("../../src/app/(organizador)/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /tema-cancha/);
  assert.match(layout, /Barlow_Condensed/);
  assert.match(layout, /DM_Sans/);
});
