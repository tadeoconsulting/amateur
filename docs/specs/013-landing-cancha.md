# 013 · Landing "Tu torneo, tu cancha" (nuevo lineamiento gráfico)

**Estado:** ✅ **implementada (entrega 1: estilo y estructura con los datos de hoy).** La entrega 2 (la sección "En vivo ahora" y el Match Center del hero con el partido real) **se descartó** por decisión del usuario (2026-10-18): no se va a hacer.
**Origen:** propuesta de landing generada con GPT (referencia visual: `amateur-cancha-mobile.onboardingbbox.chatgpt.site`), que el usuario quiere llevar a la plataforma real, vinculada a los datos de hoy y destacando los torneos.
**Toca:** la landing pública (`/`), hoy en `src/app/(landing)/_components/*` y `src/app/page.tsx`. No cambia la API ni la base de datos.

## Objetivo
Reemplazar la landing actual (clara, verde #00CA81, Lexend/Lato) por el lineamiento de la propuesta —fondo oscuro, verde lima, tipografía condensada enorme— y poner los **torneos reales** en el centro: los que están en vivo ahora y los próximos y recientes.

## Decisiones (tomadas por el usuario)
| # | Pregunta | Decisión |
|---|---|---|
| 1 | ¿Qué parte adopta el nuevo estilo? | **Solo la landing.** El resto de la app (organizador, club, jugador, vistas públicas) no cambia. |
| 2 | ¿Cómo se destacan los torneos? | **Torneos en vivo ahora** (marcador y minuto reales) y **próximos y recientes** (tarjetas de torneo). Sin buscador y sin bloque de tabla/goleadores por ahora. |
| 3 | ¿Qué torneos se muestran? | **Automático**, sin campo nuevo ni migración: lo que está en vivo y los torneos públicos más recientes. |
| 4 | ¿Y los textos de la propuesta? | **Se usa su tono** (directo, de barrio, frases cortas en mayúsculas), pero **actualizado a lo que existe hoy**. Lo que la landing actual dice y la propuesta no, se conserva **reescrito con el nuevo tono**. |

## Lineamiento gráfico (extraído de la referencia)
| Token | Valor | Uso |
|---|---|---|
| Fondo | `#101512` | Página |
| Superficie | `#1b221d` | Tarjetas |
| Línea | `#344037` | Bordes |
| Lima | `#c3fa73` | Acento, botón principal, "en vivo" |
| Blanco hueso | `#f3f4ed` | Texto |
| Apagado | `#adb5ad` | Texto secundario |
| Tinta | `#132016` | Texto sobre lima |
| Radio | `16px` | Tarjetas y botones |
| Títulos | **Barlow Condensed** 700, mayúsculas, interlineado ~0.93, espaciado negativo | `h1`/`h2` |
| Cuerpo | **DM Sans** 400–700 | Resto |

- Los tokens viven **solo en la landing** (variables CSS en su contenedor), así no se tocan los colores del resto de la app. Las fuentes se cargan con `next/font/google`, solo para la landing.
- Hay una sección clara (`#eaece3`) intercalada para "Cómo funciona", como en la referencia.
- Respeta `prefers-reduced-motion` (el marquee y los contadores ya lo hacen).

## Estructura
1. **Barra superior:** logo, enlaces (Torneos, Cómo funciona), *Ingresar* y *Crear mi torneo*. Abre el mismo modal de acceso de hoy (`AuthModal`), que no cambia de lógica.
2. **Hero:** "TU TORNEO. TU CANCHA." con subtítulo, botón *Crear mi torneo gratis* y *Así funciona*. A la derecha, la composición de la propuesta: el **Match Center** y la **tabla de posiciones** apilados e inclinados sobre un panel de cancha. **Es siempre un ejemplo** (datos inventados), marcado como *"vista ilustrativa · datos de ejemplo"*; no se conecta a partidos reales (ver *Entregas*). El título del hero quedó como "TU TORNEO. TU COMUNIDAD.".
3. **Cinta (marquee):** Fixture automático ✳ Estadísticas en vivo ✳ Perfil de jugador ✳ Tabla de posiciones ✳ Control de sanciones.
4. ~~**En vivo ahora**~~ *(descartada, 2026-10-18)*: iba a mostrar una tarjeta por partido `en_curso` con tiempo real. No se hace; los partidos en vivo se ven en la sección Torneos (estado *En vivo*) y en la ficha de cada torneo.
5. **Torneos** *(destacada)*: tarjetas de los torneos públicos, los más recientes primero (la misma regla de hoy: no `draft`, orden por inicio, máximo 6), con estado (*En vivo*, *Inscripción abierta*, *Finalizado*), formato, equipos, sede y fechas. Cada una enlaza a la URL pública del torneo.
6. **La plataforma / Roles:** Organizador, Club, Jugador. **Fan** se conserva con el texto de hoy ("Sigue cada jugada"), reescrito con el nuevo tono, porque la landing actual ya lo promete.
7. **Cómo funciona:** los tres pasos (Crea tu torneo · Gestiona en vivo · Todo queda registrado), en la sección clara.
8. **Tu esfuerzo cuenta:** el bloque emocional de la propuesta ("No es solo un partido").
9. **CTA final:** "DEJA DE ADMINISTRAR EN WHATSAPP" con *Empezar ahora*.
10. **Pie:** el actual.

## Qué se quita o se cambia respecto a la propuesta y a la landing actual
- **"Validación de alineaciones":** la propuesta la promete y hoy **no existe**; se cambia por lo que sí hay (fixture automático, tabla en tiempo real, sanciones, temporadas).
- **La mini-tabla del hero** es un dato inventado: se reemplaza por el partido real.
- **"Estadísticas del mercado"** (2000+ torneos, 3.5M deportistas, etc.) de la landing actual: son cifras de plan de negocio, no de la plataforma, y no encajan en el nuevo diseño. **Se retiran** de la landing pública (siguen en `docs/canvases.md`). *Decisión que el usuario puede revertir.*
- Se mencionan las **temporadas** (Apertura, Clausura y fase final), que son nuevas y ninguna de las dos versiones nombra.
- Sin tarjeta de crédito, sin planillas: se conservan, porque son ciertas.

## Datos y rendimiento
- **Torneos:** `GET /api/tournaments` (ya lo usa la landing).
- **El hero no usa datos:** es una composición ilustrativa. La landing solo lee los torneos (y, desde la caché de borde, con `?pub=1`, especificación [004](004-partido-en-vivo.md)).
- Sin endpoints nuevos ni migración. La landing carga igual que hoy: sin spinner, y una sección sin datos **se omite**.

## Accesibilidad y celular
- Diseño **móvil primero** (la referencia es "cancha-mobile"): una columna, títulos que bajan de 136 px a ~56 px, tarjetas apiladas.
- Contraste: texto hueso sobre `#101512` y tinta sobre lima cumplen AA.

## Entregas
1. **Estilo y estructura** con los datos de hoy: tokens, fuentes, hero, torneos, roles, cómo funciona y CTA. *(un PR)*
2. ~~**En vivo ahora** con tiempo real y el Match Center del hero con partido real.~~ **Descartada** (2026-10-18). Si algún día se retoma, hay que reescribirla: la landing ya no pide tiempo real y el hero es siempre ilustrativo.

## Pruebas
- La entrega 1 se verificó a mano en el navegador, en celular y escritorio. Las pruebas unitarias de "elegir el partido del hero" que planeaba esta sección **ya no aplican** (se descartó la entrega 2).

## Decisiones de detalle (confirmadas por el usuario, 2026-10-17)
1. **Se retiran las cifras de mercado** (2000+ torneos, 3.5M deportistas…) de la landing pública.
2. **El hero sin partidos reales muestra la tarjeta de ejemplo**, marcada como "vista ilustrativa · datos de ejemplo".
