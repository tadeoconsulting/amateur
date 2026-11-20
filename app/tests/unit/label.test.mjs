// Las etiquetas de campo de toda la plataforma (2026-11-19): un solo componente, `Label`, con la tipografía DM Sans, 14 px,
// peso 600 definida en un único lugar. Ningún `<label>` de caption repite la fuente, el tamaño ni el peso.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("../../src/", import.meta.url));

test("Label define DM Sans, 14 px y peso 600, y no deja cambiarlo desde afuera", () => {
  const fuente = readFileSync(join(raiz, "_components/label.tsx"), "utf8");
  assert.match(fuente, /export const labelText = "font-body text-sm font-semibold text-text-primary"/);
  assert.match(fuente, /Omit<LabelHTMLAttributes<HTMLLabelElement>, "className" \| "children">/, "className solo para espaciado");
});

test("Label admite span, obligatorio y opcional", () => {
  const fuente = readFileSync(join(raiz, "_components/label.tsx"), "utf8");
  assert.match(fuente, /as\?: "label" \| "span"/);
  assert.match(fuente, /required\?: boolean/);
  assert.match(fuente, /optional\?: boolean/);
});

test("ningún <label> de caption repite la tipografía: todos usan Label", () => {
  const tipografia = /\b(font-(heading|body|sans|medium|semibold|bold)|text-(xs|sm|base|lg))\b/;
  const malos = [];
  const recorrer = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const ruta = join(dir, e.name);
      if (e.isDirectory()) recorrer(ruta);
      else if (e.name.endsWith(".tsx") && e.name !== "label.tsx") {
        const s = readFileSync(ruta, "utf8");
        for (const m of s.matchAll(/<label\b((?:[^>{]|\{[^}]*\})*)>/g)) {
          const cierre = s.indexOf("</label>", m.index);
          const cuerpo = cierre === -1 ? "" : s.slice(m.index, cierre);
          // Se permiten: envoltorios de un campo (casillas, opciones) y el botón de elegir archivo.
          const envuelve = /<(input|select|textarea)\b/.test(cuerpo) || /cursor-pointer/.test(m[1]);
          if (!envuelve && tipografia.test(m[1])) malos.push(`${ruta.replace(raiz, "")}:${s.slice(0, m.index).split("\n").length}`);
        }
      }
    }
  };
  recorrer(raiz);
  assert.deepEqual(malos, [], "labels con tipografía propia");
});
