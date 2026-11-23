# 024 · Tabs: un solo componente con variantes

**Estado:** 🟡 **en construcción, solo en local (2026-11-22).** Sin PR hasta que el usuario lo pida.
**Origen:** el usuario preguntó cuántos tipos de tabs hay y si el design system está al día. Había **seis tipos visuales**, tres componentes (`PillTabs`, `SubTabs`, `CategoryTabs`) y unas doce copias hechas a mano, y el design system no mostraba ninguno. Se unifican en **un solo componente, `Tabs`, con variantes con nombre**, igual que `Picklist` (especificación [022](022-campos-design-system.md)).
**Toca:** `src/_components/` y las pantallas que usan tabs; el design system. No cambia la API ni la base de datos.

## Decisiones (tomadas por el usuario, 2026-11-22)
| # | Pregunta | Decisión |
|---|---|---|
| 1 | Tabs de sección | **Todos son del tipo 1 (píldora)**, en todos los ámbitos y también en el celular. |
| 2 | El tipo 4 (segmentado) | **Está bien en ese tipo de contenedores**: se queda como variante propia. |
| 3 | Dos niveles seguidos | El nivel **principal** son píldoras; el **secundario** pasa a **segmentado, dentro del contenedor**. |
| 4 | Chips redondeados | **Pasan a píldoras** (con el nombre `filters`, porque son botones de activar y desactivar, no secciones). |
| 5 | `CategoryTabs` y la landing | `CategoryTabs` **pasa a píldoras**; la landing **conserva su estilo** como variante `landing`. |
| 6 | Nombres | `sections` · `segmented` · `filters` · `landing`; en el design system, con etiqueta en español. |

## Las variantes de `Tabs`
| Variante | Etiqueta en el design system | Qué es | Dónde |
|---|---|---|---|
| `sections` | **Secciones** | Píldoras lima, desplazables con flechas, con `role="tab"` y el teclado de los tabs (← → Inicio Fin). Admite `trailing` (acciones que no son tabs, como «Acciones»). Es el antiguo `PillTabs`. | Las secciones de una pantalla: Equipo, Seguimiento, Gestión, «Torneos / Temporadas», las pestañas del torneo, las fechas del fixture, los grupos y días de «Editar cruces», administración, la página de Ayuda. |
| `segmented` | **Segmentado** | Una pista con el tab activo como tarjeta; admite un contador por opción («Próximos 3»). `role="tablist"`. | Las opciones de **segundo nivel dentro de un contenedor**, pocas y cortas: género, «Calendario / Horarios / Lugares», «Competencia / Convocatoria / Finalizados», estado de los partidos, vincular cuenta. |
| `filters` | **Filtros** | La misma píldora, como grupo de botones de activar y desactivar (`aria-pressed`), sin teclado de tabs. Admite un indicador por opción (por ejemplo, «en vivo»). | «Todos / Clausura 2026…», filtros de Pagos, Dashboard y Asistencia. |
| `landing` | **Landing** | Tarjetas con flecha ↗ y los colores de la landing (`--lc-*`). Mismo patrón accesible; la rotación automática la maneja la landing. | Organizador / Club / Jugador / Fan en la landing. |

**Regla de uso:** una lista que se desplaza o tiene muchas opciones (las fechas de un fixture) va en `sections`, aunque sea de segundo nivel; el `segmented` es para pocas opciones cortas.

## Medidas
- **Letra:** DM Sans en negrita; **14 px** (`size="sm"`, por omisión) o **16 px** (`size="base"`, para el nivel principal de «Mis torneos»). Antes, el club usaba 12 px y el organizador 14 px: ahora son iguales.
- **Píldora:** alto mínimo de 44 px, 16 px a los lados, 8 px de radio.

## Se eliminan
`PillTabs`, `SubTabs` y `CategoryTabs`, y todas las copias a mano. Una prueba falla si aparece un conjunto de tabs hecho a mano (un `role="tab"` fuera de `Tabs`) o un componente de tabs nuevo.

## Sincronización con el design system
`Tabs` queda **documentado** en `/design-system/tabs` (página nueva, con las cuatro variantes en vivo) y en el registro; los tres componentes eliminados salen de los pendientes (el tope de pendientes baja de 16 a 13).

## Pruebas
- Unitarias: la navegación con teclado (ya existente en `PillTabs`), que no queden `PillTabs`, `SubTabs`, `CategoryTabs` ni tabs hechos a mano, y el registro.
- Revisión visual en el navegador, en celular y escritorio, de las pantallas migradas.
