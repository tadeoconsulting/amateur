// Los campos de toda la plataforma son los componentes únicos (especificación 022): ningún formulario lleva sus propios
// `<input>`, `<select>` o `<textarea>` con estilos, ni constantes de estilo de campo. Si esta prueba falla: usa `TextField`,
// `TextArea`, `Picklist` o `PasswordInput` (y `Field` con `Label`), y documenta lo nuevo en el design system.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("../../src/", import.meta.url));

function archivos(dir, salida = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name);
    if (e.isDirectory()) archivos(ruta, salida);
    else if (e.name.endsWith(".tsx")) salida.push(ruta);
  }
  return salida;
}

// Los componentes de campos (donde sí viven los controles nativos) y las excepciones documentadas.
const COMPONENTES = ["_components/text-field.tsx", "_components/password-input.tsx", "_components/picklist.tsx"];
// El editor de minuto dentro de una fila de la línea de tiempo del partido en vivo: un número chico en la misma línea, no un campo de formulario.
const EXCEPCIONES = ["app/(organizador)/torneos/[id]/en-vivo/[matchId]/page.tsx"];
const NO_TEXTO = /type="(checkbox|radio|file|hidden|range|color)"/;
const ABRE = /<(input|select|textarea)\b((?:[^>{]|\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})*\})*)>/g;

test("no hay <select> ni <textarea> nativos fuera de los componentes", () => {
  const malos = [];
  for (const ruta of archivos(raiz)) {
    const rel = ruta.replace(raiz, "");
    if (COMPONENTES.includes(rel)) continue;
    const s = readFileSync(ruta, "utf8");
    for (const m of s.matchAll(/<(select|textarea)\b/g)) malos.push(`${rel}:${s.slice(0, m.index).split("\n").length} <${m[1]}>`);
  }
  assert.deepEqual(malos, [], "usa Picklist (selector) o TextArea");
});

test("no hay <input> de texto nativos fuera de los componentes", () => {
  const malos = [];
  for (const ruta of archivos(raiz)) {
    const rel = ruta.replace(raiz, "");
    if (COMPONENTES.includes(rel) || EXCEPCIONES.includes(rel)) continue;
    const s = readFileSync(ruta, "utf8");
    for (const m of s.matchAll(ABRE)) {
      if (m[1] !== "input" || NO_TEXTO.test(m[2]) || m[2].includes("sr-only")) continue;
      malos.push(`${rel}:${s.slice(0, m.index).split("\n").length}`);
    }
  }
  assert.deepEqual(malos, [], "usa TextField o PasswordInput");
});

test("ningún archivo define su propia constante de estilo de campo", () => {
  const malos = [];
  for (const ruta of archivos(raiz)) {
    const rel = ruta.replace(raiz, "");
    const s = readFileSync(ruta, "utf8");
    for (const m of s.matchAll(/\bconst (field|fieldClass|inputClass|inputCls|selectClass|FIELD)\s*=/g)) malos.push(`${rel}:${s.slice(0, m.index).split("\n").length} ${m[1]}`);
  }
  assert.deepEqual(malos, [], "el estilo del campo sale de field-styles.ts");
});

// UN SOLO desplegable (2026-11-20): el selector y el menú de acciones son dos variantes de `Picklist`. No se crean otros.
test("hay un solo componente de desplegable: Picklist", () => {
  const dir = join(raiz, "_components");
  const otros = readdirSync(dir).filter((n) => /(menu|dropdown|select|combobox|listbox)/i.test(n) && n !== "picklist.tsx" && n !== "account-menu.tsx");
  assert.deepEqual(otros, [], "usa Picklist (variant=\"field\" o variant=\"menu\") en vez de crear otro desplegable");
  const picklist = readFileSync(join(dir, "picklist.tsx"), "utf8");
  assert.match(picklist, /variant\?: "field"/);
  assert.match(picklist, /variant: "menu"/);
  const cuenta = readFileSync(join(dir, "account-menu.tsx"), "utf8");
  assert.match(cuenta, /<Picklist\s+variant="menu"/, "el menú de la cuenta es Picklist");
  // Ningún archivo arma su propio role="menu" o role="listbox": solo Picklist.
  const propios = [];
  for (const ruta of archivos(raiz)) {
    const rel = ruta.replace(raiz, "");
    if (rel === "_components/picklist.tsx" || rel.startsWith("app/design-system/")) continue;
    if (/role="(menu|listbox)"/.test(readFileSync(ruta, "utf8"))) propios.push(rel);
  }
  assert.deepEqual(propios, [], "un panel con role=menu o role=listbox propio: usa Picklist");
});

