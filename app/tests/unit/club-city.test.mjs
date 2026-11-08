// La ciudad de un club (especificación 009, entrega 6). Las ciudades son inventadas.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CITY_MAX, cityValidationError, cleanCity } from "../../src/_lib/club-city.ts";

describe("cityValidationError", () => {
  test("sin ciudad, vacía o null está bien: se borra", () => {
    for (const v of [undefined, null, "", "   "]) assert.equal(cityValidationError(v), null, String(v));
  });

  test("un texto de hasta 60 caracteres está bien", () => {
    assert.equal(cityValidationError("Ciudad Prueba"), null);
    assert.equal(cityValidationError("a".repeat(CITY_MAX)), null);
    assert.equal(cityValidationError(`  ${"a".repeat(CITY_MAX)}  `), null, "los espacios no cuentan");
  });

  test("uno más largo, o que no es texto, se rechaza", () => {
    assert.match(cityValidationError("a".repeat(CITY_MAX + 1)), /hasta 60/);
    for (const v of [5, true, {}, []]) assert.equal(cityValidationError(v), "city inválido");
  });
});

describe("cleanCity", () => {
  test("recorta y junta espacios; vacía es null", () => {
    assert.equal(cleanCity("  Ciudad   Prueba "), "Ciudad Prueba");
    assert.equal(cleanCity(""), null);
    assert.equal(cleanCity("   "), null);
    assert.equal(cleanCity(undefined), null);
    assert.equal(cleanCity(null), null);
  });
});
