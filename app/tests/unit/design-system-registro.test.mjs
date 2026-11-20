// El design system y el sistema se mantienen sincronizados (especificación 022): todo archivo de `src/_components/` está
// clasificado en el registro, y lo «documentado» lo importa de verdad la página del design system.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { documentados, pendientes, dominio } from "../../src/app/design-system/registro.ts";

const src = fileURLToPath(new URL("../../src/", import.meta.url));

test("todo archivo de _components está clasificado en UNA lista del registro", () => {
  const reales = readdirSync(join(src, "_components")).filter((n) => /\.tsx?$/.test(n)).map((n) => `_components/${n}`);
  const clasificados = [...documentados.map((d) => d.archivo), ...pendientes, ...dominio];
  const sinClasificar = reales.filter((r) => !clasificados.includes(r));
  assert.deepEqual(sinClasificar, [], "archivos nuevos: agrégalos a `documentados` (lo normal: se documentan al crearlos) o a `dominio` en src/app/design-system/registro.ts");
  const repetidos = clasificados.filter((c, i) => clasificados.indexOf(c) !== i);
  assert.deepEqual(repetidos, [], "un archivo no puede estar en dos listas");
  const fantasmas = clasificados.filter((c) => !existsSync(join(src, c)));
  assert.deepEqual(fantasmas, [], "el registro menciona archivos que ya no existen");
});

test("lo documentado lo importa la página del design system", () => {
  const faltan = [];
  for (const { archivo, pagina } of documentados) {
    const modulo = `@/${archivo.replace(/\.tsx?$/, "")}`;
    const ruta = join(src, "app/design-system", pagina, "page.tsx");
    const fuente = existsSync(ruta) ? readFileSync(ruta, "utf8") : "";
    if (!fuente.includes(`"${modulo}"`)) faltan.push(`${archivo} no se importa en design-system/${pagina}/page.tsx`);
  }
  assert.deepEqual(faltan, []);
});

test("la deuda visible: lo pendiente solo puede bajar, no crecer", () => {
  // Si agregas un componente de interfaz nuevo, documéntalo en el design system al crearlo; no lo agregues a `pendientes`.
  assert.ok(pendientes.length <= 16, `pendientes creció a ${pendientes.length}: documenta el componente nuevo en el design system`);
});
