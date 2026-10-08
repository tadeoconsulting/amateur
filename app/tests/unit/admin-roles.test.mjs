// Pruebas unitarias de src/_lib/admin-roles.ts (sin servidor ni base de datos).
import { test } from "node:test";
import assert from "node:assert/strict";
import { adminRolesError } from "../../src/_lib/admin-roles.ts";

test("ADMIN solo es válido", () => {
  assert.equal(adminRolesError(["ADMIN"]), null);
});

test("ADMIN mezclado con cualquier otro perfil se rechaza", () => {
  for (const other of ["ORGANIZADOR", "CLUB_OWNER", "JUGADOR", "SPONSOR", "FAN"]) {
    assert.match(adminRolesError(["ADMIN", other]) ?? "", /no puede tener otros perfiles/);
    assert.match(adminRolesError([other, "ADMIN"]) ?? "", /no puede tener otros perfiles/);
  }
});

test("los perfiles normales, solos o combinados, no se tocan", () => {
  assert.equal(adminRolesError(["ORGANIZADOR", "JUGADOR"]), null);
  assert.equal(adminRolesError([]), null);
});
