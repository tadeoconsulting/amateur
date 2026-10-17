// Pruebas de a dónde lleva "¿No es tu cuenta?" en las invitaciones (src/_lib/switch-account.ts, sin servidor).
import { test } from "node:test";
import assert from "node:assert/strict";
import { switchAccountPath } from "../../src/_lib/switch-account.ts";
import { safeInternalPath } from "../../src/_lib/safe-next.ts";

const here = "/delegado/invitacion/abc_DEF-123";

test("el registro deja elegido el perfil de la invitación y vuelve a la misma página", () => {
  assert.equal(switchAccountPath("register", here, "CLUB_OWNER"), "/?auth=register&rol=CLUB_OWNER&next=%2Fdelegado%2Finvitacion%2Fabc_DEF-123");
  assert.equal(
    switchAccountPath("register", "/jugador/invitacion/perfil/xyz", "JUGADOR"),
    "/?auth=register&rol=JUGADOR&next=%2Fjugador%2Finvitacion%2Fperfil%2Fxyz"
  );
});

test("el inicio de sesión no elige perfil", () => {
  assert.equal(switchAccountPath("login", here, "CLUB_OWNER"), "/?auth=login&next=%2Fdelegado%2Finvitacion%2Fabc_DEF-123");
});

test("lo que vuelve en `next` es una ruta interna válida y es la misma invitación", () => {
  for (const view of ["login", "register"]) {
    const next = new URL(switchAccountPath(view, here, "CLUB_OWNER"), "http://x").searchParams.get("next");
    assert.equal(next, here);
    assert.equal(safeInternalPath(next, "/"), here);
  }
});
