// Pruebas unitarias del menú «Acciones» (especificación 021), sin servidor ni navegador: la navegación con teclado
// (src/_lib/actions-menu.ts) y que la pantalla del torneo use el menú en vez de las acciones sueltas.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
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
  // «Agregar partido» es un «+» fijo a la derecha de las fechas, en la fila de las fechas (no un botón lima suelto ni en la fila de tabs).
  assert.match(page, /onAdd=\{\(\) => setEditor\(\{ match: null \}\)\}/, "la pantalla pasa onAdd a la lista de fechas");
  assert.doesNotMatch(page, /aria-label="Agregar partido"/, "ya no hay un «+» en la fila de tabs principales");
  const fechas = readFileSync(new URL("../../src/_components/fixture-tabs.tsx", import.meta.url), "utf8");
  assert.match(fechas, /aria-label="Agregar partido"[\s\S]{0,900}M12 5v14M5 12h14[\s\S]{0,200}Agregar partido<\/span>/, "botón con el ícono +");
  assert.match(fechas, /<\/div>\s*\{addButton\}\s*<\/div>/, "el «+» queda fuera de la barra que se desplaza, a la derecha de las fechas");
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

// En el celular el botón es solo un ícono (pedido del usuario, 2026-11-16); sigue con nombre para el lector de pantalla.
test("el botón «Acciones» en el celular muestra solo el ícono", () => {
  const source = readFileSync(new URL("../../src/_components/actions-menu.tsx", import.meta.url), "utf8");
  assert.match(source, /aria-label=\{label\}/, "el botón conserva su nombre accesible");
  assert.match(source, /className="sm:hidden"/, "el ícono de tres puntos solo en el celular");
  assert.match(source, /<span className="hidden sm:inline">\{label\}<\/span>/, "el texto se oculta en el celular");
});

// El encabezado del día («Por definir», «Dom 15 Nov») va a 14 px solo en el organizador (2026-11-16): la lista de fechas
// la comparten el club, el jugador y el fan, que siguen igual.
test("el encabezado del día en la lista de fechas va a 14 px solo con el tema del organizador", () => {
  const fechas = readFileSync(new URL("../../src/_components/fixture-tabs.tsx", import.meta.url), "utf8");
  assert.match(fechas, /<h3 className="[^"]*font-heading text-xs cancha:text-sm font-bold/);
});

// Los tabs de las fechas («Fecha 1»…) van a 14 px solo en el organizador (2026-11-16); el club, el jugador y el fan siguen en 12 px.
test("los tabs de las fechas van a 14 px solo con el tema del organizador", () => {
  const tabs = readFileSync(new URL("../../src/_components/pill-tabs.tsx", import.meta.url), "utf8");
  assert.match(tabs, /"cancha:text-base" : "cancha:text-sm"/, "14 px por omisión, 16 px con size=base");
  const sub = readFileSync(new URL("../../src/_components/sub-tabs.tsx", import.meta.url), "utf8");
  assert.equal((sub.match(/cancha:text-base/g) ?? []).length, 2, "SubTabs en celular (dos variantes) a 16 px");
  assert.match(sub, /size="base"/, "y las píldoras de escritorio también");
});

// Filtros en píldora (Competencia / Convocatoria / Finalizados y equivalentes) a 14 px en el organizador, y la barra de
// abajo (celular) a 12 px en todos los ámbitos (2026-11-16).
test("los filtros en píldora van a 14 px en el organizador y la barra de abajo a 12 px", () => {
  const leer = (ruta) => readFileSync(new URL(`../../src/${ruta}`, import.meta.url), "utf8");
  for (const ruta of ["app/(organizador)/partidos/page.tsx", "app/(organizador)/torneos/page.tsx", "app/(organizador)/torneos/[id]/editar-cruces/page.tsx", "_components/convocatoria-view.tsx", "_components/category-tabs.tsx"]) {
    assert.match(leer(ruta), /cancha:text-sm font-(medium|semibold) cancha:font-body cancha:font-bold/, `píldoras a 14 px: ${ruta}`);
  }
  for (const ruta of ["_components/bottom-nav.tsx", "app/(organizador)/_components/bottom-nav.tsx", "app/(club)/_components/club-bottom-nav.tsx"]) {
    const fuente = leer(ruta);
    assert.doesNotMatch(fuente, /text-\[10px\]/, `sin 10 px: ${ruta}`);
    assert.match(fuente, /text-base/, `16 px: ${ruta}`);
  }
});

// La campana de notificaciones va en la barra de arriba, a la izquierda de la cuenta y a 16 px (`gap-4`); ya no está en
// «Mis torneos». El título de las tarjetas de torneo va a 16 px (2026-11-16).
test("la campana va junto a la cuenta con 16 px y los títulos de las tarjetas a 16 px", () => {
  const leer = (ruta) => readFileSync(new URL(`../../src/${ruta}`, import.meta.url), "utf8");
  const layout = leer("app/(organizador)/layout.tsx");
  assert.match(layout, /<div className="flex items-center gap-4">\s*<NotificationsLink \/>\s*<AccountMenu/, "campana a la izquierda de la cuenta, a 16 px");
  assert.match(leer("app/(organizador)/_components/notifications-link.tsx"), /size-11/, "área clicable de 44 px");
  assert.doesNotMatch(leer("app/(organizador)/torneos/page.tsx"), /\/notificaciones/, "ya no hay campana en «Mis torneos»");
  for (const ruta of ["app/(organizador)/torneos/page.tsx", "app/(jugador)/jugador/mis-torneos/page.tsx", "app/(jugador)/jugador/torneos/page.tsx"]) {
    assert.match(leer(ruta), /font-heading text-base font-bold text-text-primary">\{t(ournament)?\.name\}/, `título a 16 px: ${ruta}`);
  }
});

// Los botones principales (fondo lima, letra de títulos en negrita sobre texto invertido) van siempre a 16 px, en celular
// y en escritorio, en toda la app (2026-11-16): `text-base`. Un botón nuevo con ese estilo no debe usar text-xs ni text-sm.
test("los botones principales van siempre a 16 px", () => {
  const raiz = fileURLToPath(new URL("../../src/", import.meta.url));
  const malos = [];
  const recorrer = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const ruta = join(dir, e.name);
      if (e.isDirectory()) recorrer(ruta);
      else if (e.name.endsWith(".tsx")) {
        readFileSync(ruta, "utf8").split("\n").forEach((l, i) => {
          if (l.includes("bg-surface-secondary") && /font-heading text-(xs|sm)\b[^"`]*font-bold text-text-invert/.test(l)) malos.push(`${ruta.replace(raiz, "")}:${i + 1}`);
        });
      }
    }
  };
  recorrer(raiz);
  assert.deepEqual(malos, [], "botones principales que no están a 16 px");
});

// El título de la franja de cada partido («General» o el grupo) va a 14 px en el organizador (2026-11-16).
test("el título de la franja del partido va a 14 px en el organizador", () => {
  for (const ruta of ["manual/page.tsx", "en-vivo/[matchId]/page.tsx", "partido/[matchId]/page.tsx", "resultado/[matchId]/page.tsx"]) {
    const fuente = readFileSync(new URL(`../../src/app/(organizador)/torneos/[id]/${ruta}`, import.meta.url), "utf8");
    assert.match(fuente, /bg-btn-regular px-4 py-2">\s*<span className="font-heading text-xs cancha:text-sm font-bold/, ruta);
  }
});

// Los botones «Volver» / «Salir» (flecha + texto) van a 14 px en el celular en toda la app (2026-11-16): los que tenían
// 16 px llevan `max-md:text-sm`.
test("los botones de volver no pasan de 14 px en el celular", () => {
  const raiz = fileURLToPath(new URL("../../src/", import.meta.url));
  const malos = [];
  const recorrer = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const ruta = join(dir, e.name);
      if (e.isDirectory()) recorrer(ruta);
      else if (e.name.endsWith(".tsx")) {
        readFileSync(ruta, "utf8").split("\n").forEach((l, i) => {
          if (l.includes("items-center gap-1 font-heading text-base font-semibold text-text-primary") && !l.includes("max-md:text-sm")) malos.push(`${ruta.replace(raiz, "")}:${i + 1}`);
        });
      }
    }
  };
  recorrer(raiz);
  assert.deepEqual(malos, [], "botones de volver a 16 px en el celular");
});

// Las pestañas principales de «Mis torneos» (Torneos / Temporadas) se distinguen de las píldoras de abajo (Competencia /
// Convocatoria / Finalizados): llevan el subrayado también en escritorio (2026-11-19). El resto de los `SubTabs` no cambia.
test("las pestañas principales de Mis torneos van con subrayado también en escritorio", () => {
  const sub = readFileSync(new URL("../../src/_components/sub-tabs.tsx", import.meta.url), "utf8");
  assert.match(sub, /desktop = "pills"/, "por omisión siguen como píldoras");
  assert.match(sub, /desktop === "pills" \? "md:hidden" : ""/, "con underline el subrayado no se oculta en escritorio");
  const pagina = readFileSync(new URL("../../src/app/(organizador)/torneos/page.tsx", import.meta.url), "utf8");
  assert.match(pagina, /<SubTabs[^>]*desktop="underline"/, "Mis torneos usa el subrayado en escritorio");
});

