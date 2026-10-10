// Pruebas de la asignación de una cuenta a un jugador provisional (src/_lib/provisional-link.ts, sin base de datos).
import { test } from "node:test";
import assert from "node:assert/strict";
import { planLink, sumStats } from "../../src/_lib/provisional-link.ts";

const prov = (over = {}) => ({ clubId: "c-lgk", firstName: "Ana María", lastName: "Núñez Peña", dni: "10000001", birthDate: "1990-02-05", position: null, number: null, categoryId: null, ...over });
const account = (over = {}) => ({ id: "u1", firstName: "Ana María", lastName: "Núñez Peña", dni: null, birthDate: null, isAdmin: false, hasPlayerRole: true, profiles: [], ...over });
const profile = (over = {}) => ({ id: "p1", clubId: "c-ude", position: null, number: null, categoryId: null, ...over });

test("una cuenta sin ficha en ese equipo: el perfil provisional pasa a ser su ficha (vincular)", () => {
  const plan = planLink(prov(), account({ profiles: [profile({ clubId: "c-ude" })] })); // juega en otro equipo: no choca
  assert.equal(plan.ok, true);
  assert.equal(plan.mode, "link");
  assert.equal(plan.targetProfileId, null);
  assert.deepEqual(plan.warnings, []);
});

test("una cuenta que ya tiene ficha en ese equipo: se unen los perfiles", () => {
  const plan = planLink(prov(), account({ profiles: [profile({ id: "p9", clubId: "c-lgk" })] }));
  assert.equal(plan.mode, "merge");
  assert.equal(plan.targetProfileId, "p9");
});

test("una ficha libre (sin equipo) también se une, y pasa a ser la de este equipo", () => {
  const plan = planLink(prov(), account({ profiles: [profile({ id: "pf", clubId: null })] }));
  assert.equal(plan.mode, "merge");
  assert.equal(plan.targetProfileId, "pf");
  assert.equal(plan.profileFill.clubId, "c-lgk");
  assert.ok(plan.warnings.some((w) => /sin equipo/.test(w)));
});

test("si hay ficha en el equipo y también una libre, se une con la del equipo", () => {
  const plan = planLink(prov(), account({ profiles: [profile({ id: "pf", clubId: null }), profile({ id: "pl", clubId: "c-lgk" })] }));
  assert.equal(plan.targetProfileId, "pl");
});

test("nunca se pisa un dato de la cuenta: se completa lo vacío y se avisa lo distinto", () => {
  const vacia = planLink(prov(), account());
  assert.deepEqual(vacia.accountFill, { dni: "10000001", birthDate: "1990-02-05" });
  assert.deepEqual(vacia.warnings, []);

  const distinta = planLink(prov(), account({ dni: "20000002", birthDate: "1991-03-06" }));
  assert.deepEqual(distinta.accountFill, {}); // no se toca nada de la cuenta
  assert.equal(distinta.warnings.length, 2);
  assert.match(distinta.warnings[0], /DNI de la cuenta \(20000002\).*distinto.*se conserva/);
  assert.match(distinta.warnings[1], /fecha de nacimiento/);

  const igual = planLink(prov(), account({ dni: "10000001", birthDate: "1990-02-05" }));
  assert.deepEqual(igual.warnings, []);
});

test("un nombre distinto se avisa (tildes y mayúsculas no cuentan)", () => {
  assert.deepEqual(planLink(prov(), account({ firstName: "ANA MARIA", lastName: "nunez peña" })).warnings, []);
  const otro = planLink(prov(), account({ firstName: "Anita", lastName: "Núñez" }));
  assert.ok(otro.warnings.some((w) => /nombre de la cuenta/.test(w)));
});

test("al unir se le completa a la ficha de la cuenta lo que tiene vacío, sin pisar lo que ya tiene", () => {
  const plan = planLink(
    prov({ position: "Portero", number: 1, categoryId: "cat-1" }),
    account({ profiles: [profile({ id: "p9", clubId: "c-lgk", position: "Delantero", number: null, categoryId: null })] })
  );
  assert.deepEqual(plan.profileFill, { number: 1, categoryId: "cat-1" }); // la posición de la cuenta se queda
});

test("una cuenta de administrador no se puede vincular, y a quien no tiene el rol de jugador se le da", () => {
  const admin = planLink(prov(), account({ isAdmin: true }));
  assert.equal(admin.ok, false);
  assert.match(admin.reason, /administrador/);
  assert.equal(planLink(prov(), account({ hasPlayerRole: false })).grantPlayerRole, true);
  assert.equal(planLink(prov(), account()).grantPlayerRole, false);
});

test("las estadísticas del mismo torneo se suman", () => {
  assert.deepEqual(
    sumStats({ goals: 3, assists: 1, yellowCards: 2, redCards: 0, matchesPlayed: 4 }, { goals: 2, assists: 0, yellowCards: 1, redCards: 1, matchesPlayed: 3 }),
    { goals: 5, assists: 1, yellowCards: 3, redCards: 1, matchesPlayed: 7 }
  );
});
