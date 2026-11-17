// Pruebas unitarias del menú «Acciones» (especificación 021), sin servidor ni navegador: la navegación con teclado
// (src/_lib/actions-menu.ts) y que la pantalla del torneo use el menú en vez de las acciones sueltas.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { firstEnabledIndex, lastEnabledIndex, nextEnabledIndex } from "../../src/_lib/actions-menu.ts";

const ok = { disabled: false };
const off = { disabled: true };

describe("firstEnabledIndex / lastEnabledIndex", () => {
  test("el primero y el último habilitados", () => {
    assert.equal(firstEnabledIndex([off, ok, ok, off]), 1);
    assert.equal(lastEnabledIndex([off, ok, ok, off]), 2);
  });

  test("sin ítems habilitados devuelven -1", () => {
    assert.equal(firstEnabledIndex([]), -1);
    assert.equal(lastEnabledIndex([off, off]), -1);
  });
});

describe("nextEnabledIndex", () => {
  test("baja y sube de a uno", () => {
    const items = [ok, ok, ok];
    assert.equal(nextEnabledIndex(items, 0, 1), 1);
    assert.equal(nextEnabledIndex(items, 2, -1), 1);
  });

  test("da la vuelta en los bordes", () => {
    const items = [ok, ok, ok];
    assert.equal(nextEnabledIndex(items, 2, 1), 0);
    assert.equal(nextEnabledIndex(items, 0, -1), 2);
  });

  test("salta los deshabilitados", () => {
    const items = [ok, off, off, ok];
    assert.equal(nextEnabledIndex(items, 0, 1), 3);
    assert.equal(nextEnabledIndex(items, 3, -1), 0);
  });

  test("sin nada enfocado (-1) baja al primero y sube al último", () => {
    const items = [off, ok, ok];
    assert.equal(nextEnabledIndex(items, -1, 1), 1);
    assert.equal(nextEnabledIndex(items, -1, -1), 2);
  });

  test("con un solo habilitado se queda en él", () => {
    assert.equal(nextEnabledIndex([off, ok, off], 1, 1), 1);
    assert.equal(nextEnabledIndex([off, ok, off], 1, -1), 1);
  });

  test("sin ítems habilitados (o sin ítems) devuelve -1", () => {
    assert.equal(nextEnabledIndex([off, off], 0, 1), -1);
    assert.equal(nextEnabledIndex([], -1, 1), -1);
  });
});

// La pantalla de un torneo agrupa sus acciones secundarias en el menú (decisión del usuario, 2026-11-16): no deben volver
// a aparecer como enlaces sueltos junto a «Agregar partido», y «Agregar partido» sigue siendo la acción principal.
test("la pantalla del torneo usa el menú «Acciones» y no las acciones sueltas", () => {
  const page = readFileSync(new URL("../../src/app/(organizador)/torneos/[id]/page.tsx", import.meta.url), "utf8");
  const acciones = readFileSync(new URL("../../src/app/(organizador)/torneos/[id]/_components/tournament-actions.tsx", import.meta.url), "utf8");
  assert.match(page, /<TournamentActions/);
  assert.match(acciones, /<ActionsMenu/);
  assert.doesNotMatch(page, /<ShareViewButton/, "Compartir ahora va dentro del menú");
  assert.doesNotMatch(page, /text-xs font-bold text-text-primary underline">\s*(Editar torneo|Mesa|Editar cruces)/, "no quedan enlaces sueltos de acciones");
  assert.doesNotMatch(page, /Deshacer fixture\s*<\/button>/, "«Deshacer fixture» ya no es un botón suelto");
  assert.doesNotMatch(acciones, /Agregar partido"/, "«Agregar partido» no está dentro del menú");
  // Es un tab con «+» junto a los tabs (no un botón lima suelto) y abre la hoja de agregar partido.
  assert.match(page, /aria-label="Agregar partido"[\s\S]{0,900}M12 5v14M5 12h14[\s\S]{0,200}Agregar partido<\/span>/, "tab con el ícono +");
  assert.doesNotMatch(page, /bg-surface-secondary px-4 py-2 font-heading text-xs font-bold text-text-invert[^"]*"\s*>\s*Agregar partido/, "ya no es el botón lima suelto");
  for (const label of ["Compartir", "Editar torneo", "Mesa", "Editar cruces", "Crear temporada con este torneo", "Deshacer fixture"]) {
    assert.ok(acciones.includes(`label: "${label}"`), `falta «${label}» en el menú`);
  }
  assert.match(acciones, /key: "deshacer"[^}]*tone: "danger"[^}]*separated: true/, "lo destructivo va al final, separado y en rojo");
});

test("el menú es accesible: botón con aria-haspopup, panel role=menu e ítems role=menuitem", () => {
  const source = readFileSync(new URL("../../src/_components/actions-menu.tsx", import.meta.url), "utf8");
  assert.match(source, /aria-haspopup="menu"/);
  assert.match(source, /aria-expanded/);
  assert.match(source, /role="menu"/);
  assert.match(source, /role="menuitem"/);
  assert.match(source, /Escape/);
});
