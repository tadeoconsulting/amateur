// Nombre que se muestra en la navegación principal (especificación 001). Los nombres son inventados.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { fullName, navName, navInitial } from "../../src/_lib/nav-identity.ts";

const ana = { firstName: "Ana", lastName: "Prueba Uno", organization: null };

describe("navName", () => {
  test("el jugador ve su nombre y apellido", () => {
    assert.equal(navName("jugador", ana), "Ana Prueba Uno");
    assert.equal(navName("jugador", { ...ana, organization: "Liga Norte" }), "Ana Prueba Uno", "su organización no cuenta");
  });

  test("el organizador ve su organización, y su nombre si no la puso", () => {
    assert.equal(navName("organizador", { ...ana, organization: "Liga Norte" }), "Liga Norte");
    assert.equal(navName("organizador", { ...ana, organization: "  Liga Norte  " }), "Liga Norte");
    assert.equal(navName("organizador", ana), "Ana Prueba Uno");
    assert.equal(navName("organizador", { ...ana, organization: "   " }), "Ana Prueba Uno");
    assert.equal(navName("organizador", { ...ana, organization: undefined }), "Ana Prueba Uno", "una sesión sin ese dato");
  });

  test("el delegado ve el nombre de su club, y el suyo mientras no tiene uno", () => {
    assert.equal(navName("club", ana, { name: "Club Prueba" }), "Club Prueba");
    assert.equal(navName("club", ana, null), "Ana Prueba Uno");
    assert.equal(navName("club", ana), "Ana Prueba Uno");
    assert.equal(navName("club", ana, { name: "  " }), "Ana Prueba Uno");
  });

  test("sin apellido no deja espacios sobrando", () => {
    assert.equal(fullName({ firstName: "Ana", lastName: "" }), "Ana");
    assert.equal(fullName({ firstName: " Ana ", lastName: "  Prueba   Uno " }), "Ana Prueba Uno");
  });
});

describe("navInitial", () => {
  test("la primera letra en mayúscula", () => {
    assert.equal(navInitial("ana prueba"), "A");
    assert.equal(navInitial("  Álvaro"), "Á");
    assert.equal(navInitial(""), "?");
  });
});
