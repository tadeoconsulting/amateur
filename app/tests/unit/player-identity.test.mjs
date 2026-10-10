// Pruebas de la identidad de un jugador con o sin cuenta (src/_lib/player-identity.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { compareByLastName, fullName, playerIdentity } from "../../src/_lib/player-identity.ts";

test("un jugador con cuenta toma el nombre de la cuenta, aunque el perfil traiga otro", () => {
  const id = playerIdentity({
    user: { firstName: "Ana", lastName: "Pérez", avatarUrl: "https://x/y.png", birthDate: "2001-01-01" },
    firstName: "Anita",
    lastName: "Perez",
  });
  assert.deepEqual(id, { firstName: "Ana", lastName: "Pérez", avatarUrl: "https://x/y.png", birthDate: "2001-01-01", provisional: false });
});

test("un provisional toma el nombre de su propio perfil y no tiene foto", () => {
  const id = playerIdentity({ user: null, firstName: "Ana María", lastName: "Núñez Peña", birthDate: "1990-02-05" });
  assert.equal(id.firstName, "Ana María");
  assert.equal(id.lastName, "Núñez Peña");
  assert.equal(id.avatarUrl, null);
  assert.equal(id.provisional, true);
  assert.equal(id.birthDate, "1990-02-05");
});

test("un perfil sin cuenta y sin nombre no rompe: nombre vacío", () => {
  const id = playerIdentity({ user: null, firstName: null, lastName: null });
  assert.equal(fullName(id), "");
  assert.equal(id.birthDate, null);
});

test("las listas se ordenan por apellido y, a igual apellido, por nombre, con tildes y eñes en su lugar", () => {
  const rows = [
    { firstName: "Rubén Walter", lastName: "Diaz Ruiz" },
    { firstName: "Beatriz", lastName: "Núñez Peña" },
    { firstName: "Daniel Iván", lastName: "Diaz Ruiz" },
    { firstName: "Zoe", lastName: "Abad Quispe" },
  ].sort(compareByLastName);
  assert.deepEqual(rows.map((r) => r.firstName), ["Zoe", "Daniel Iván", "Rubén Walter", "Beatriz"]);
});
