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

// Pedido del usuario: los tabs van en DM Sans negrita dentro de «Cancha» (los títulos siguen en Barlow Condensed).
// La variante `cancha:` deja el tipo de letra de siempre fuera del organizador.
test("los tabs usan DM Sans en negrita dentro de «Cancha»", () => {
  const archivos = [
    "../../src/_components/pill-tabs.tsx",
    "../../src/_components/category-tabs.tsx",
    "../../src/_components/sub-tabs.tsx",
    "../../src/_components/convocatoria-view.tsx",
    "../../src/app/(organizador)/partidos/page.tsx",
    "../../src/app/(organizador)/torneos/[id]/page.tsx",
    "../../src/app/(organizador)/torneos/page.tsx",
    "../../src/app/(organizador)/torneos/[id]/editar-cruces/page.tsx",
  ];
  for (const archivo of archivos) {
    const source = readFileSync(new URL(archivo, import.meta.url), "utf8");
    assert.match(source, /cancha:font-bold/, `${archivo} debe poner los tabs en negrita`);
    if (!archivo.endsWith("sub-tabs.tsx")) assert.match(source, /cancha:font-body/, `${archivo} debe usar la fuente de cuerpo en los tabs`);
  }
});

// Ajustes de tipografía pedidos por el usuario sobre el organizador (2026-11-16): el nombre del torneo y «Volver» en
// DM Sans, y el menú superior en 16 px. Siempre con la variante `cancha:` para no tocar los otros ámbitos.
test("el nombre del torneo y «Volver» van en DM Sans, y el menú superior en 16 px", () => {
  const pagina = readFileSync(new URL("../../src/app/(organizador)/torneos/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(pagina, /font-heading text-sm font-bold text-text-invert cancha:font-body/, "nombre del torneo");
  assert.match(pagina, /font-heading text-sm font-semibold cancha:font-body cancha:font-bold text-text-primary/, "«Volver»");
  const cabecera = readFileSync(new URL("../../src/_components/tournament-header.tsx", import.meta.url), "utf8");
  assert.match(cabecera, /font-heading text-sm font-bold text-text-invert cancha:font-body/, "cabecera del torneo");
  const menu = readFileSync(new URL("../../src/_components/top-nav.tsx", import.meta.url), "utf8");
  assert.match(menu, /cancha:text-base/, "menú superior a 16 px");
});

// El menú de la cuenta (ítems y encabezado) va a 16 px en el organizador (2026-11-16), solo con `cancha:`.
test("el menú de la cuenta va a 16 px en el organizador", () => {
  const menu = readFileSync(new URL("../../src/_components/account-menu.tsx", import.meta.url), "utf8");
  assert.match(menu, /font-heading text-sm cancha:text-base font-semibold/, "ítems");
  assert.match(menu, /font-heading text-sm cancha:text-base font-bold/, "nombre del encabezado");
  assert.match(menu, /font-body text-xs cancha:text-base/, "rol del encabezado");
});

// La hoja «Agregar partido» usa los componentes únicos de campos (especificación 022): Label, TextField y Picklist; el estilo del
// campo ya no vive en la hoja. Sus botones principales van a 14 px en celular y 16 px desde md.
test("la hoja «Agregar partido» usa los componentes únicos de campos", () => {
  const hoja = readFileSync(new URL("../../src/app/(organizador)/torneos/[id]/_components/match-editor.tsx", import.meta.url), "utf8");
  assert.match(hoja, /import \{ Label \} from "@\/_components\/label"/, "las etiquetas usan el componente Label");
  assert.match(hoja, /import \{ TextField \} from "@\/_components\/text-field"/, "los campos usan TextField");
  assert.match(hoja, /import \{ Picklist \} from "@\/_components\/picklist"/, "los desplegables usan Picklist");
  assert.doesNotMatch(hoja, /const field =|<select\b|<input\b(?![^>]*type="checkbox")/, "sin estilos de campo propios ni controles nativos (salvo la casilla)");
  // Todos los botones de la hoja (también «Cancelar» y «Quitar partido») a 16 px.
  const botones = hoja.split("\n").filter((l) => /<button|className="[^"]*cursor-pointer[^"]*font-heading/.test(l) && l.includes("font-heading"));
  assert.ok(botones.length >= 6, "se encontraron los botones de la hoja");
  for (const b of botones) assert.match(b, /text-base/, `botón a 16 px: ${b.trim().slice(0, 60)}`);
});

test("el ámbito del organizador aplica el tema y carga las fuentes de la landing", () => {
  const layout = readFileSync(new URL("../../src/app/(organizador)/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /tema-cancha/);
  assert.match(layout, /Barlow_Condensed/);
  assert.match(layout, /DM_Sans/);
});
