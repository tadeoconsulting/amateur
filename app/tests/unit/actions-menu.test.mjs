// Pruebas del menú «Acciones» (especificación 021) y de varios ajustes de interfaz, sin servidor ni navegador. El menú es la
// variante `menu` del desplegable único `Picklist` (especificación 022); su navegación con teclado se prueba en picklist.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// La pantalla de un torneo agrupa sus acciones secundarias en el menú (decisión del usuario, 2026-11-16): no deben volver
// a aparecer como enlaces sueltos junto a «Agregar partido», y «Agregar partido» sigue siendo la acción principal.
test("la pantalla del torneo usa el menú «Acciones» y no las acciones sueltas", () => {
  const page = readFileSync(new URL("../../src/app/(organizador)/torneos/[id]/page.tsx", import.meta.url), "utf8");
  const acciones = readFileSync(new URL("../../src/app/(organizador)/torneos/[id]/_components/tournament-actions.tsx", import.meta.url), "utf8");
  assert.match(page, /<TournamentActions/);
  assert.match(acciones, /<Picklist variant="menu"/);
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

test("el menú (variante menu de Picklist) es accesible: botón con aria-haspopup, panel role=menu e ítems role=menuitem", () => {
  const source = readFileSync(new URL("../../src/_components/picklist.tsx", import.meta.url), "utf8");
  assert.match(source, /aria-haspopup="menu"/);
  assert.match(source, /aria-expanded/);
  assert.match(source, /role="menu"/);
  assert.match(source, /role="menuitem"/);
  assert.match(source, /Escape/);
});

// En el celular el botón es solo un ícono (pedido del usuario, 2026-11-16); sigue con nombre para el lector de pantalla.
test("el botón «Acciones» en el celular muestra solo el ícono", () => {
  const source = readFileSync(new URL("../../src/_components/picklist.tsx", import.meta.url), "utf8");
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

// Los tabs (fechas, secciones, filtros) son un solo componente desde la especificación 024: píldoras en DM Sans negrita, 14 px por
// omisión y 16 px con size="base" (el nivel principal de «Mis torneos»). La barra de abajo (celular) va a 16 px en todos los ámbitos.
test("los tabs únicos van a 14 px (16 px con size=base) y la barra de abajo a 16 px", () => {
  const leer = (ruta) => readFileSync(new URL(`../../src/${ruta}`, import.meta.url), "utf8");
  const tabs = leer("_components/tabs.tsx");
  assert.match(tabs, /size === "base" \? "text-base" : "text-sm"/, "14 px por omisión, 16 px con size=base");
  assert.match(tabs, /font-body font-bold/, "DM Sans en negrita");
  assert.match(leer("app/(organizador)/torneos/page.tsx"), /<Tabs[^>]*size="base"/, "el nivel principal de Mis torneos a 16 px");
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

// Los botones principales (fondo lima, letra de títulos en negrita sobre texto invertido) van a 14 px en el celular y a
// 16 px desde 768 px (tableta y escritorio), en toda la app (2026-11-19): `text-sm md:text-base`.
test("los botones principales van a 14 px en celular y 16 px desde md", () => {
  const raiz = fileURLToPath(new URL("../../src/", import.meta.url));
  const malos = [];
  const recorrer = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const ruta = join(dir, e.name);
      if (e.isDirectory()) recorrer(ruta);
      else if (e.name.endsWith(".tsx")) {
        readFileSync(ruta, "utf8").split("\n").forEach((l, i) => {
          if (l.includes("bg-surface-secondary") && /font-heading text-[a-z]+[^"`]*font-bold text-text-invert/.test(l) && !/font-heading text-sm md:text-base font-bold text-text-invert/.test(l)) malos.push(`${ruta.replace(raiz, "")}:${i + 1}`);
        });
      }
    }
  };
  recorrer(raiz);
  assert.deepEqual(malos, [], "botones principales que no están a 14 px en celular y 16 px desde md");
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

// Mis torneos (especificación 024): el nivel principal (Torneos / Temporadas) son píldoras de 16 px y el secundario (Competencia /
// Convocatoria / Finalizados) es un segmentado dentro del contenedor.
test("Mis torneos usa píldoras para lo principal y un segmentado para lo secundario", () => {
  const pagina = readFileSync(new URL("../../src/app/(organizador)/torneos/page.tsx", import.meta.url), "utf8");
  assert.match(pagina, /<Tabs tabs=\{mainTabs\}[^>]*size="base"/, "lo principal en píldoras de 16 px");
  assert.match(pagina, /<Tabs variant="segmented"/, "lo secundario, segmentado");
});

// Dos medidas por elemento (2026-11-19): «btnSolid» (p. ej. «Crear temporada») 14 px en el celular y 16 px desde 768 px
// (tableta y escritorio); el nombre del equipo en la lista de equipos del organizador, 16 px solo en escritorio.
test("btnSolid va a 14 px en celular y 16 px desde md; el nombre del equipo a 16 px en escritorio", () => {
  const botones = readFileSync(new URL("../../src/_components/button-styles.ts", import.meta.url), "utf8");
  assert.match(botones, /font-heading text-sm font-bold/, "base de 14 px (celular)");
  assert.match(botones, /btnSolid = `\$\{base\} md:text-base /, "btnSolid a 16 px desde md");
  const equipos = readFileSync(new URL("../../src/_components/teams-list.tsx", import.meta.url), "utf8");
  assert.match(equipos, /font-heading text-sm md:cancha:text-base font-bold[^"]*">\{team\.club\.name\}/, "nombre del equipo a 16 px solo en escritorio del organizador");
});

// Nombre del equipo en la tabla de posiciones del organizador: 12 px en el celular y 16 px en escritorio (2026-11-19).
test("el nombre del equipo en la tabla de posiciones va a 12 px en celular y 16 px en escritorio", () => {
  const pagina = readFileSync(new URL("../../src/app/(organizador)/torneos/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(pagina, /truncate text-xs md:text-base font-medium text-text-primary[^"]*">\{row\.clubName\}/);
});

// Tabla de posiciones del organizador: la columna «#» ocupa solo su contenido (`w-px`) y deja 12 px hasta el escudo del equipo
// (4 px de `pr-1` + 8 px de `pl-2`), en vez de repartirse el ancho sobrante (2026-11-19).
test("la columna de posición de la tabla no se estira y queda a 12 px del equipo", () => {
  const pagina = readFileSync(new URL("../../src/app/(organizador)/torneos/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(pagina, /<th className="w-px whitespace-nowrap border-l-4 border-transparent py-2\.5 pl-2 pr-1 [^"]*">#<\/th>/, "encabezado «#» angosto");
  assert.match(pagina, /className=\{`w-px whitespace-nowrap border-l-4 py-2\.5 pl-2 pr-1 \$\{/, "celda de posición angosta");
  assert.match(pagina, /<th className="py-2\.5 pl-2 pr-1 [^"]*">Equipo<\/th>/, "«Equipo» alineado con el escudo");
  assert.match(pagina, /<td className="py-2\.5 pl-2 pr-1">\s*<Link href=\{clubHref/, "celda del equipo con 8 px a la izquierda");
});

// Clasifica / desciende en la tabla de posiciones del organizador: un borde de color de 4 px a la izquierda de la fila, a todo
// el alto y pegado al borde de la tabla, en lugar de un punto (2026-11-19).
test("la tabla de posiciones marca clasifica y desciende con un borde a la izquierda de la fila", () => {
  const pagina = readFileSync(new URL("../../src/app/(organizador)/torneos/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(pagina, /isTop \? "border-verification" : isBottom \? "border-red-500" : "border-transparent"/, "borde verde, rojo o sin color");
  assert.doesNotMatch(pagina, /h-2 w-2 rounded-full \$\{\s*isTop/, "ya no hay punto en cada fila");
  assert.match(pagina, /h-4 w-1 rounded-sm bg-verification/, "la leyenda usa la misma marca (barrita)");
  assert.match(pagina, /h-4 w-1 rounded-sm bg-red-500/, "también la roja");
});

