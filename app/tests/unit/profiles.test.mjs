// Pruebas unitarias de src/_lib/profiles.ts (sin servidor ni React).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { PROFILE_ROLES, soleProfileHome } from "../../src/_lib/profiles.ts";

describe("soleProfileHome", () => {
  test("con un solo perfil activable, va directo a su pantalla", () => {
    assert.equal(soleProfileHome(["CLUB_OWNER"]), "/club");
    assert.equal(soleProfileHome(["ORGANIZADOR"]), "/torneos");
    assert.equal(soleProfileHome(["JUGADOR"]), "/jugador");
  });

  test("un rol ajeno a los perfiles (por ejemplo ADMIN) no cuenta, y no destraba nada solo", () => {
    assert.equal(soleProfileHome(["ADMIN"]), undefined);
    assert.equal(soleProfileHome(["CLUB_OWNER", "ADMIN"]), "/club");
  });

  test("con dos o más perfiles, no elige por la persona: undefined (va a seleccionar)", () => {
    assert.equal(soleProfileHome(["ORGANIZADOR", "CLUB_OWNER"]), undefined);
    assert.equal(soleProfileHome(["ORGANIZADOR", "CLUB_OWNER", "JUGADOR"]), undefined);
  });

  test("sin ningún perfil todavía, undefined (va a elegir uno)", () => {
    assert.equal(soleProfileHome([]), undefined);
  });

  test("cubre los tres perfiles reales, no una lista inventada", () => {
    assert.deepEqual(
      PROFILE_ROLES.map((p) => p.role).sort(),
      ["CLUB_OWNER", "JUGADOR", "ORGANIZADOR"]
    );
  });
});
