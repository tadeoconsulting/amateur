// Nombre que se muestra en la navegación principal (especificación 001). Los nombres son inventados.

import { readFileSync } from "node:fs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { fullName, navName, navInitial, shortNavName, NAV_NAME_MAX_MOBILE, NAV_NAME_MAX_DESKTOP } from "../../src/_lib/nav-identity.ts";

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

describe("shortNavName", () => {
  test("hasta 12 caracteres se muestra completo", () => {
    assert.equal(shortNavName("Club Real"), "Club Real");
    assert.equal(shortNavName("123456789012"), "123456789012");
  });
  test("con más de 12, los primeros 12 y dos puntos", () => {
    assert.equal(shortNavName("123456789012345"), "123456789012..");
    assert.equal(shortNavName("organizador Prueba"), "organizador..", "sin el espacio antes de los puntos");
  });
  test("cuenta letras, no unidades internas del texto", () => {
    assert.equal(shortNavName("Álvaro Ñandú Pérez"), "Álvaro Ñandú..");
  });
});

describe("navInitial", () => {
  test("la primera letra en mayúscula", () => {
    assert.equal(navInitial("ana prueba"), "A");
    assert.equal(navInitial("  Álvaro"), "Á");
    assert.equal(navInitial(""), "?");
  });
});

describe("nombre de la cuenta: 12 caracteres en el celular y 24 en escritorio", () => {
  test("el tope de escritorio es el doble del del celular", () => {
    assert.equal(NAV_NAME_MAX_MOBILE, 12);
    assert.equal(NAV_NAME_MAX_DESKTOP, 24);
  });
  test("cada tope recorta distinto", () => {
    const nombre = "LIGA 1 - LA ENSENADA CLUB";
    assert.equal(shortNavName(nombre, NAV_NAME_MAX_MOBILE), "LIGA 1 - LA..");
    assert.equal(shortNavName(nombre, NAV_NAME_MAX_DESKTOP), "LIGA 1 - LA ENSENADA CLU..");
    assert.equal(shortNavName("LIGA 1 - LA ENSENADA", NAV_NAME_MAX_DESKTOP), "LIGA 1 - LA ENSENADA", "20 caracteres caben enteros en escritorio");
  });
  test("el botón muestra uno u otro según el ancho", () => {
    const boton = readFileSync(new URL("../../src/_components/account-menu.tsx", import.meta.url), "utf8");
    assert.match(boton, /md:hidden">\{shortNavName\(name, NAV_NAME_MAX_MOBILE\)\}/, "celular: 12");
    assert.match(boton, /hidden max-w-\[16rem\] truncate md:inline">\{shortNavName\(name, NAV_NAME_MAX_DESKTOP\)\}/, "escritorio: 24");
  });
});

