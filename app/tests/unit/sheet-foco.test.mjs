// Vigila que la hoja (Sheet) enfoque la X una sola vez, al abrirse (sin servidor ni navegador).
//
// El padre de una hoja suele volver a renderizarse seguido (la pantalla del partido corre un reloj cada segundo) y le pasa
// un `onClose` nuevo en cada render. Si el efecto que enfoca la X dependiera de `onClose`, volvería a enfocarla cada vez y
// le quitaría el foco al campo donde se está escribiendo (se veía la X marcada y el teclado dejaba de escribir). Esto no se
// puede atrapar con una prueba de integración, así que se vigila el código.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../src/_components/sheet.tsx", import.meta.url), "utf8");

test("el efecto que enfoca la X corre una sola vez (sin depender de onClose)", () => {
  const start = source.indexOf("closeRef.current?.focus()");
  assert.ok(start > -1, "la hoja enfoca la X al abrirse");
  // Del enfoque hasta el `return (` del componente solo está el cierre de ese efecto.
  const effectTail = source.slice(start, source.indexOf("\n  return (", start));
  assert.match(effectTail, /\}, \[\]\);/, "el efecto debe tener la lista de dependencias vacía");
  assert.doesNotMatch(effectTail, /\[onClose\]/, "el efecto no debe depender de onClose");
});

test("Escape cierra con el onClose más reciente, guardado en una ref", () => {
  assert.match(source, /onCloseRef\.current\(\)/, "Escape debe llamar a onCloseRef.current()");
  assert.doesNotMatch(source, /if \(e\.key === "Escape"\) onClose\(\)/, "no debe capturar onClose directamente");
});
