# 020 · Sistema visual «Cancha»: alinear la plataforma con la landing (empezando por el organizador)

**Estado:** 🟡 **Entrega 1 implementada** (sistema + ámbito del organizador); faltan los demás ámbitos. Las decisiones las tomó el usuario el 2026-11-14.
**Origen:** pedido del usuario: «alinear el diseño de la plataforma en UI y colores, tomando de referencia la landing», empezando por el organizador.
**Código:** `src/app/globals.css` (variables `--c-*`, clase `.tema-cancha`, variante `cancha:`), `src/app/(organizador)/layout.tsx` (ámbito y fuentes), los componentes compartidos que se ven dentro del ámbito, `src/app/design-system/color/page.tsx` (referencia viva) y `tests/unit/tema-cancha.test.mjs`. Antecede: [013](013-landing-cancha.md), que dejó el lineamiento solo en la landing.
**No toca:** la API, la base de datos ni los correos.

## Objetivo
Hoy la landing es oscura con acento lima y tipografía condensada, y el resto de la app es clara y en grises (Crono DS). Quien entra por la landing y pasa al panel ve dos productos distintos. Esta especificación lleva el lenguaje de la landing a la app, **por ámbitos**, para ver el resultado antes de comprometer todo.

## Decisiones (del usuario)
| # | Tema | Decisión |
|---|---|---|
| 1 | Dirección | **Oscuro + lima**, como la landing. Reemplaza el aspecto claro de Crono DS en los ámbitos migrados. |
| 2 | Tipografía | **Barlow Condensed en títulos y DM Sans en cuerpo**, el mismo par de la landing. Barlow solo en títulos y cifras grandes (marcadores, encabezados): listas, etiquetas y formularios no van todos en mayúsculas, para que se lean bien. |
| 3 | Alcance | **El organizador primero, con tokens por ámbito.** Club, jugador, mesa, admin y las vistas públicas siguen como hoy y se migran en PR siguientes, cada uno con su revisión. |
| 4 | Crono DS | Se actualiza la página interna `/design-system` para que refleje el sistema nuevo. **No** se tocan los correos (los clientes de correo no manejan bien el modo oscuro) **ni** el archivo de Figma «Cronos». |

## Cómo se aplica: tokens por ámbito
La app ya pinta casi todo con unos pocos tokens semánticos (`text-text-primary` ~1.350 usos, `bg-surface-primary`, `bg-btn-regular`…), así que **cambiar el valor de los tokens recolorea una pantalla entera sin tocar sus componentes**.

- Cada token de color pasa a leer una variable (`--c-…`) que vale lo de hoy por omisión. El ámbito del organizador añade la clase `tema-cancha` en su contenedor y esa clase redefine las variables. Nada fuera del contenedor cambia.
- No hay portales (`createPortal`): hojas, diálogos y avisos se renderizan dentro del contenedor y heredan el tema.
- La landing conserva sus propias variables (`--lc-*`); los valores de «Cancha» salen de ellas, así que las dos no se separan.

### Valores
| Token | Hoy (claro) | `tema-cancha` | Uso |
|---|---|---|---|
| `surface-primary` | `#FAFAFA` | `#101512` | Fondo de la página |
| `surface-alt` | `#FDFDFD` | `#1b221d` | Tarjetas y bloques |
| `surface-secondary` | `#1B1B1B` | `#c3fa73` (lima) | Superficie **inversa**: hoy es el fondo del botón principal y de los bloques de énfasis, así que en «Cancha» pasa a ser lima |
| `text-primary` | `#1B1B1B` | `#f3f4ed` | Texto |
| `text-secondary` | `#6D6D6D` | `#adb5ad` | Texto apagado |
| `text-invert` | `#FAFAFA` | `#132016` (tinta) | Texto sobre la superficie inversa (tinta sobre lima) |
| `border-primary` | `#1B1B1B` | `#344037` | Bordes de tarjetas y campos |
| `border-secondary` | `#4D4D4D` | `#475449` | Bordes de más énfasis |
| `btn-regular` / `btn-secondary` / `btn-disabled` | `#EBEBEB` / `#4D4D4D` / `#E5E5E5` | `#232c26` / `#344037` / `#1b221d` | Botones y rellenos secundarios |
| `brand-100` / `brand-200` / `brand-300` | `#FDFDFD` / `#E5E5E5` / `#EBEBEB` | `#1b221d` / `#344037` / `#232c26` | Rellenos y líneas tenues |
| `brand-500` | `#6D6D6D` | `#7c887e` | Texto o línea media |
| `brand-700` | `#4D4D4D` | `#d6ff94` | Hover de la superficie inversa (lima más clara) |
| `green` / `verification` / `yellow` / `red` / `error` | sin cambio | sin cambio | Estados: se leen bien sobre oscuro |
| Radio de tarjetas y botones | 8 px | **16 px** en tarjetas, 12 px en botones | |

Acento: lima `#c3fa73` solo para la acción principal, lo «en vivo» y el foco; los estados (verde, rojo, amarillo) conservan su significado.

### Tipografía
`font-heading` pasa a Barlow Condensed y el cuerpo a DM Sans dentro del ámbito, con las mismas variables indirectas. Las fuentes se cargan una vez con `next/font/google` en el layout del organizador.

## Lo que no se resuelve con los tokens
Los colores **sueltos** no siguen el tema y hay que reemplazarlos por tokens dentro del ámbito:
- `bg-white` (17 usos en el ámbito) → `bg-surface-alt`; `text-white` (29): se queda sobre fotos y superposiciones oscuras; sobre un relleno del tema pasa a `text-text-invert` o `text-text-primary` según el fondo.
- `bg-yellow`, `bg-green` y similares **opacos** con `text-text-primary` encima: el texto pasa a `text-text-invert` (tinta), porque `text-primary` se vuelve claro. Las fichas translúcidas (`bg-yellow/30`) se quedan con `text-text-primary`.
- `text-brand-900` (texto sobre fichas de estado translúcidas) → `text-text-primary`; `bg-brand-900` con texto claro (botones) → `bg-surface-secondary text-text-invert`; `border-brand-900` → `border-border-primary`; `bg-brand-100` → `bg-surface-alt`.
- Colores sin token (`amber-*`, `gray-*`, hex sueltos) se llevan a tokens.
- Las superposiciones (`bg-black/40`) se dejan: funcionan sobre oscuro.

## Entregas
1. **(esta)** Tokens por ámbito, tipografía, botones y el contenedor del organizador; colores sueltos del ámbito; `/design-system` actualizado. Verificado en celular y escritorio.
2. Club y delegado.
3. Jugador.
4. Mesa y admin.
5. Vistas públicas (torneo, partido, club, temporada) y el desenlace: cuando todos los ámbitos estén migrados, los valores nuevos pasan a ser los de omisión y `tema-cancha` desaparece.

## Criterios de aceptación (entrega 1)
- Ninguna pantalla del organizador queda con fondo claro, texto ilegible o un bloque blanco suelto.
- Contraste de texto de 4,5:1 o más sobre cada fondo del tema (se verifica con los pares de la tabla).
- Foco visible en lima, con el teclado.
- Club, jugador, mesa, admin, las vistas públicas y la landing **no cambian** de aspecto.
- Las pruebas existentes siguen pasando; el cambio es solo de estilo, sin API ni datos.

## Cómo se resolvió (entrega 1)
- **Tokens:** `@theme inline` lee `--c-*`; `:root` conserva Crono DS y `.tema-cancha` lo redefine. Tokens nuevos: `ink` (texto sobre verde/amarillo, no se invierte) y `tint-green|mint|yellow|blue|sky` (las tarjetas pastel, que en «Cancha» pasan a tonos oscuros).
- **Variante `cancha:`** (`@custom-variant cancha`) para un ajuste que solo vale dentro del tema. Se usa en los bloques grandes de énfasis (cabecera del torneo, indicadores del dashboard), que en oscuro quedan mejor como tarjeta con borde que como losa lima, y en la pestaña activa de la barra inferior (lima).
- **Colores sueltos del ámbito:** `text-brand-900` → `text-text-primary`, `bg-brand-900` (botones) → `bg-surface-secondary`, `bg-brand-100` → `bg-surface-alt`, `bg-white` (tarjetas, hojas, barra inferior, campos) → `bg-surface-alt`, texto sobre verde/amarillo opacos → `text-ink`. Se dejaron los blancos detrás de escudos y logos, los `text-white` sobre fotos y rellenos fijos, y las ilustraciones SVG.
- **Hojas** (`Sheet`) y avisos heredan el tema porque no hay portales.
- **`/design-system/color`** tiene una sección «Sistema Cancha» con los dos temas lado a lado y una vista en vivo.

## Pruebas
Unitaria que vigila que los valores del tema sean los de la tabla y que cada par texto/fondo cumpla el contraste (`tests/unit/tema-cancha.test.mjs`); revisión visual en el navegador, en celular (375 px) y escritorio, de las pantallas del organizador.

## Limitaciones
- Los componentes compartidos que cambiaron `bg-white` por `bg-surface-alt` se ven fuera del organizador con `#FDFDFD` en vez de `#FFFFFF` (menos de 1 %, imperceptible); es el costo de no duplicar los componentes por tema.
- La vista en vivo de `/design-system` usa las fuentes por omisión (Barlow y DM Sans solo se cargan en el layout del organizador).
- Mientras duren las entregas, un mismo usuario con más de un rol (por ejemplo organizador y delegado) ve estilos distintos según el ámbito en que esté.
- Los correos y Figma quedan con el estilo claro hasta decidir lo contrario.
