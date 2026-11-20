# 021 · Menú «Acciones» en la pantalla de un torneo

**Estado:** ✅ **Implementada** (noviembre 2026). Las decisiones las tomó el usuario el 2026-11-16.
**Origen:** el usuario, al revisar el sistema «Cancha» (especificación [020](020-sistema-visual-cancha.md)): «deben ser todos acciones secundarias y deben estar dentro de un picklist moderno llamado "Acciones"», señalando Compartir, Editar torneo, Mesa y Editar cruces.
**Código:** `src/_components/actions-menu.tsx` (menú), `src/_lib/actions-menu.ts` (navegación con teclado, pura), `src/_components/share-view-button.tsx` (el hook `useShareView`), `src/app/(organizador)/torneos/[id]/_components/tournament-actions.tsx` (las acciones del torneo) y `src/app/(organizador)/torneos/[id]/page.tsx` (uso).
**No toca:** la API ni la base de datos.

## Objetivo
La pantalla de un torneo mezcla una acción principal (**Agregar partido**, botón lima) con seis acciones secundarias sueltas, con estilos distintos: «Compartir» (ícono junto a los tabs), «Editar torneo», «Mesa», «Editar cruces» y «Deshacer fixture» (enlaces subrayados en la fila de Partidos) y «Crear temporada con este torneo» (enlace arriba). Se agrupan en **un menú desplegable «Acciones»** para que la pantalla quede limpia y la acción principal destaque.

## Decisiones (del usuario)
| # | Tema | Decisión |
|---|---|---|
| 1 | Qué va dentro | **Las seis:** Compartir, Editar torneo, Mesa, Editar cruces, Crear temporada y Deshacer fixture. «Agregar partido» queda afuera del menú, como un tab con «+» (ver abajo). |
| 2 | Dónde | **A la derecha de los tabs** (Partidos / Tabla / Goleadores / Equipos), en el lugar de «Compartir», así se ve en todas las pestañas. |
| 3 | Nombre | **«Acciones»**, con un menú moderno (desplegable, no un `<select>`). |

## Reglas
- El botón **Acciones** (texto y flecha en tablet y escritorio; **en el celular solo el ícono de tres puntos**, el texto se oculta pero queda como nombre accesible, pedido del usuario 2026-11-16) abre un panel debajo, alineado a la derecha, con un ítem por acción: ícono, texto y, si lleva a otra pantalla, es un enlace; si ejecuta algo (Compartir, Deshacer fixture), es un botón.
- **Cada ítem aparece solo cuando corresponde**, con las mismas condiciones de hoy:
  - *Compartir*: solo con el torneo en marcha (no en convocatoria).
  - *Editar torneo*: siempre.
  - *Mesa*: con el torneo en marcha.
  - *Editar cruces*: si hay algún partido que no sea decisivo.
  - *Crear temporada con este torneo*: liga que todavía no pertenece a una temporada.
  - *Deshacer fixture*: si todos los partidos siguen programados y sin jugadas. Va **al final, separado y en rojo** por ser destructivo, y mantiene su confirmación de siempre.
- Si no queda ningún ítem, el botón no se muestra.
- **Teclado y lector de pantalla:** el botón es `aria-haspopup="menu"` y `aria-expanded`; el panel es `role="menu"` y cada ítem `role="menuitem"`. Enter, Espacio o ↓ abren y enfocan el primer ítem; ↑ y ↓ recorren (con vuelta), Inicio y Fin saltan al primero y al último, **Escape** cierra y devuelve el foco al botón, y **Tab** cierra.
- Se cierra al elegir un ítem y al tocar fuera. Alto táctil de 44 px por ítem.
- **Compartir** conserva su comportamiento (menú de compartir del sistema o copiar el enlace con aviso); la lógica sale de `ShareViewButton` a un hook (`useShareView`) que usan los dos.
- Tipografía y colores del sistema «Cancha»: DM Sans en negrita, panel con la superficie de las tarjetas y borde de la línea del tema.
- «Ver temporada» (la tarjeta de una liga que ya está en una temporada) y «Agregar equipo» **no** son acciones secundarias del mismo tipo y no se mueven.

## «Agregar partido» como «+» a la derecha de las fechas (pedido del usuario, 2026-11-16)
«Agregar partido» deja de ser un botón lima suelto y pasa a ser **un botón con el ícono «+», fijo a la derecha de la fila de las fechas, después de la última visible**: queda siempre a mano aunque la fila se desplace *(una versión anterior lo puso a la izquierda, antes de «Fecha 1»; se movió a la derecha por pedido del usuario)*. Al hacer clic abre la misma hoja de siempre para agregar un partido. Solo lo ve el organizador, en la pestaña Partidos de un torneo en marcha (el club y los demás usan la misma lista de fechas sin el «+»). También aparece cuando todavía no hay partidos. En el celular queda solo el «+» (con `aria-label="Agregar partido"`); desde `sm` lleva también el texto. *(Una primera versión lo puso como un tab junto a Partidos · Tabla · Goleadores; se movió a la fila de las fechas.)*

El encabezado de cada día de la lista de fechas («Por definir», «Dom 15 Nov») va a **14 px** en el organizador (`cancha:text-sm`); el club, el jugador y el fan siguen en 12 px. Los tabs de las fechas («Fecha 1»…, `PillTabs`) van a **14 px** en el organizador (`cancha:text-sm`), también solo ahí. Los `SubTabs` (Torneos / Temporadas y similares, `torneos/page.tsx`) van a **16 px** en el organizador, en celular y en las píldoras de escritorio (`size="base"` de `PillTabs`).

Otros ajustes de tamaño pedidos el mismo día:
- **Filtros en píldora** (Competencia / Convocatoria / Finalizados, el selector de estado de Partidos, `CategoryTabs`, los de Convocatoria y los del editor de cruces): **14 px** en el organizador (`cancha:text-sm`).
- **Título de la franja de cada partido** («General» o el nombre del grupo, en el partido en vivo, el resultado, el partido y el fixture manual): **14 px** en el organizador (`cancha:text-sm`).
- **Botones «Volver» / «Salir»** (flecha y texto): **14 px en el celular** en toda la app; los pocos que estaban en 16 px (editor de cruces y asistente de crear torneo) llevan `max-md:text-sm`, así que en escritorio no cambian.
- **Pestañas principales de «Mis torneos»** (Torneos / Temporadas, `SubTabs`): con **subrayado** también en escritorio (`desktop="underline"`), para distinguirlas de las **píldoras** de abajo (Competencia / Convocatoria / Finalizados). Los demás `SubTabs` (club) siguen como píldoras en escritorio.
- **Dos medidas por elemento** (2026-11-19): `btnSolid` (acción principal de `button-styles.ts`, p. ej. «Crear temporada») va a **14 px en el celular y 16 px desde 768 px** (tableta y escritorio, `md:text-base`). El **nombre del equipo** en la lista de equipos del torneo (`TeamsList`) va a **16 px solo en escritorio** y solo en el organizador (`md:cancha:text-base`); en el celular sigue en 14 px.
- **Botones principales** (fondo lima, letra de títulos en negrita; «Crear torneo», «Guardar», «Agregar partido» de las hojas, etc.): **14 px en el celular y 16 px desde 768 px** (tableta y escritorio), en **toda la app** (`text-sm md:text-base`), la misma medida que `btnSolid`. Un botón nuevo con ese estilo debe llevarla (una prueba lo vigila). *(Historia: primero 16 px en el celular, luego 16 px siempre; el 19/11/2026 el usuario fijó 14 px celular y 16 px tableta y escritorio.)*
- **Barra de abajo del celular** (organizador, club y jugador): las etiquetas pasan de 10 a **16 px** (primero se pidió 12 y después 16), en todos los ámbitos.
- **Título de las tarjetas de torneo** (Mis torneos del organizador y las listas del jugador): **16 px**.
- **Campana de notificaciones** del organizador: sale de «Mis torneos» y pasa a la barra de arriba (celular y escritorio), **a la izquierda de la cuenta y a 16 px de ella**, con un área clicable de 44 × 44 px. **El nombre en el botón de la cuenta** se muestra con **hasta 12 caracteres** y, si tiene más, los primeros 12 seguidos de dos puntos («organizador..»); el nombre completo queda en el encabezado del menú, en `title` y en el nombre accesible (`shortNavName`, vale para todos los roles).

## Reutilización
`ActionsMenu` es un componente general (ítems con `label`, `icon`, `href` u `onSelect`, y `tone: "danger"`). Hoy solo lo usa la pantalla de un torneo; otras pantallas con acciones sueltas (club, partido) pueden adoptarlo después.

## Pruebas
`tests/unit/actions-menu.test.mjs`: la navegación con teclado (siguiente y anterior con vuelta, saltar ítems deshabilitados, primero y último) y que la pantalla del torneo use `ActionsMenu` en vez de los enlaces sueltos. Revisión visual en el navegador, en celular y escritorio.

## Limitaciones
- En un torneo en convocatoria el menú solo trae las acciones que aplican (Editar torneo y, en una liga sin temporada, Crear temporada). El «Editar torneo» que ya había en la lista vacía de equipos se queda.
- En el celular el botón ocupa el lugar de «Compartir» y los tabs se desplazan un poco más.
- Se abre hacia abajo; en una pantalla muy baja el panel puede necesitar scroll de la página.
- Las pantallas de otros ámbitos siguen con sus acciones sueltas hasta adoptar el menú.
