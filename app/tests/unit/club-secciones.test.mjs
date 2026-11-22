// Secciones del delegado (especificación 023): Equipo unificado, Seguimiento nuevo y Gestión con Dashboard y Pagos. Sin servidor
// ni navegador: la lógica del tab en la dirección y que la barra y las pantallas queden como se decidió.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { tabFromSearch, withTab } from "../../src/_lib/url-tab.ts";

const src = fileURLToPath(new URL("../../src/", import.meta.url));
const club = join(src, "app/(club)/club");
const leer = (ruta) => readFileSync(join(src, ruta), "utf8");

describe("tab en la dirección", () => {
  const validos = ["jugadores", "categorias", "planilla", "delegados"];
  test("lee el tab pedido si es válido y, si no, el de respaldo", () => {
    assert.equal(tabFromSearch("?tab=planilla", validos, "jugadores"), "planilla");
    assert.equal(tabFromSearch("?tab=otra-cosa", validos, "jugadores"), "jugadores");
    assert.equal(tabFromSearch("", validos, "jugadores"), "jugadores");
    assert.equal(tabFromSearch("?x=1&tab=delegados", validos, "jugadores"), "delegados");
  });
  test("escribe el tab conservando los demás parámetros y sin ensuciar la dirección con el de respaldo", () => {
    assert.equal(withTab("", "planilla", "jugadores"), "?tab=planilla");
    assert.equal(withTab("?x=1", "planilla", "jugadores"), "?x=1&tab=planilla");
    assert.equal(withTab("?tab=planilla", "jugadores", "jugadores"), "");
    assert.equal(withTab("?x=1&tab=planilla", "jugadores", "jugadores"), "?x=1");
  });
});

describe("la barra del delegado", () => {
  const nav = leer("app/(club)/_components/club-bottom-nav.tsx");
  const hrefs = [...nav.slice(nav.indexOf("clubNavItems"), nav.indexOf("function NavBadge")).matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
  test("Torneos · Equipo · Seguimiento · Gestión · Ajustes, sin «Jugadores»", () => {
    assert.deepEqual(hrefs, ["/club/torneos", "/club/equipo", "/club/seguimiento", "/club/gestion", "/club/ajustes"]);
  });
  test("la insignia de invitaciones de staff se queda en Equipo", () => {
    assert.match(nav, /"\/club\/equipo": staffInvitesPending/);
  });
});

describe("las secciones", () => {
  test("Equipo: Jugadores · Categorías · Planilla · Delegados", () => {
    const s = leer("app/(club)/club/equipo/page.tsx");
    assert.match(s, /key: "jugadores", label: "Jugadores"[\s\S]*key: "categorias", label: "Categorías"[\s\S]*key: "planilla", label: "Planilla"[\s\S]*key: "delegados", label: "Delegados"/);
    assert.match(s, /useUrlTab<Tab>\(TAB_KEYS, "jugadores"\)/);
    assert.match(s, /<JugadoresView clubId=\{clubId\} \/>/);
  });
  test("Seguimiento: Sesiones y Asistencia", () => {
    const s = leer("app/(club)/club/seguimiento/page.tsx");
    assert.match(s, /key: "sesiones", label: "Sesiones"[\s\S]*key: "asistencia", label: "Asistencia"/);
    assert.match(s, /<SesionesView/);
    assert.match(s, /<AsistenciaView/);
  });
  test("Gestión: Dashboard y Pagos, sin Asistencia ni Sesiones", () => {
    const s = leer("app/(club)/club/gestion/page.tsx");
    assert.match(s, /key: "dashboard", label: "Dashboard"[\s\S]*key: "pagos", label: "Pagos"/);
    assert.doesNotMatch(s, /key: "(asistencia|sesiones)"/, "Asistencia y Sesiones pasaron a Seguimiento");
  });
});

describe("las direcciones viejas ya no existen", () => {
  test("no quedan las páginas sueltas de Jugadores, Asistencia, Sesiones, Dashboard ni Pagos", () => {
    for (const ruta of ["jugadores/page.tsx", "gestion/asistencia/page.tsx", "gestion/sesiones/page.tsx", "gestion/dashboard/page.tsx", "gestion/pagos/page.tsx"]) {
      assert.equal(existsSync(join(club, ruta)), false, ruta);
    }
    assert.equal(existsSync(join(club, "jugadores")), false, "la carpeta /club/jugadores");
  });
  test("ningún archivo enlaza a las direcciones eliminadas", () => {
    const malos = [];
    const recorrer = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const ruta = join(dir, e.name);
        if (e.isDirectory()) recorrer(ruta);
        else if (/\.tsx?$/.test(e.name) && /["'`]\/club\/(jugadores|gestion\/(asistencia|sesiones|dashboard|pagos))/.test(readFileSync(ruta, "utf8"))) malos.push(ruta.replace(src, ""));
      }
    };
    recorrer(src);
    assert.deepEqual(malos, [], "enlaces a direcciones que ya no existen");
  });
});
