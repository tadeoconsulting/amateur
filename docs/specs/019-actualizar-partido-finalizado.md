# 019 · Actualizar un partido que ya se jugó (jugadas a mano, solo marcador y W.O.)

**Estado:** ✅ **Implementada** (noviembre 2026). Las decisiones las tomó el usuario el 2026-11-08.
**Código:** `src/_lib/walkover.ts` (lógica pura), `src/_lib/standings.ts` (W.O. doble), `src/app/api/matches/[id]/route.ts` (`PATCH`), hoja `src/app/(organizador)/torneos/[id]/en-vivo/[matchId]/_components/update-finished-match-sheet.tsx` y su uso en la pantalla en vivo (`…/en-vivo/[matchId]/page.tsx`).
**Origen:** pedido del usuario: en la pantalla del partido antes de iniciarlo (`/torneos/:id/en-vivo/:matchId`) hace falta un botón **«Actualizar partido finalizado»** con tres opciones: **registrar jugadas manualmente**, **ingresar solo el marcador** y **W.O.** (walkover).
**Toca:** [004](004-partido-en-vivo.md) (ciclo del partido y jugadas), [007](007-fixture-eliminacion-copa-relampago.md) (cuadro de eliminación), [011](011-mesa.md) (qué puede hacer la mesa), [modelo-de-datos.md](modelo-de-datos.md).

## Objetivo
Los partidos no siempre se registran en vivo. Hoy, para cargar uno que **ya se jugó** hay que iniciarlo y fingir el cronómetro, o escribir el marcador a mano por una ruta que la pantalla no ofrece, y un partido que **no se jugó porque un equipo no se presentó** no tiene dónde quedar registrado. Esta entrega ofrece los tres caminos desde la misma pantalla, antes de iniciar el partido.

## Decisiones (del usuario)
| # | Tema | Decisión |
|---|---|---|
| 1 | Marcador de un W.O. | **3-0 para quien se presentó.** Se elige quién se presentó: gana 3-0 (3 puntos; 0 al otro) y el partido queda marcado como W.O. Los goles del 3-0 cuentan en GF/GC y en la diferencia. |
| 2 | W.O. doble | **Sí existe**: «Ninguno se presentó». 0 puntos para los dos y marcador 0-0; ambos cuentan el partido como jugado y perdido; marcado como W.O. doble. |
| 3 | Registrar jugadas manualmente | La pantalla de jugadas de siempre, **sin cronómetro**: cada gol o tarjeta se registra con el **minuto que escribe** quien carga. El marcador sale de los goles y al final se pulsa «Finalizar partido». |
| 4 | Cuadro de eliminación | Si el marcador queda **empatado**, se pide **quién avanza** y, si se quiere, los **penales**. En un W.O. el que se presentó avanza solo; un W.O. doble **no se permite** (nadie avanzaría). |
| 5 | Quién lo ve | **Solo el organizador del torneo y el admin.** La mesa no (hoy no puede cargar el resultado directo ni reabrir partidos). |

## Reglas
- **Dónde.** En el bloque «El partido todavía no empezó», junto a «Iniciar partido»: el botón **Actualizar partido finalizado** abre las tres opciones. Solo con el partido `programado` y con los dos equipos definidos.
- **W.O.** (`walkover`: `"home"` = se presentó el local · `"away"` = se presentó el visitante · `"both"` = no se presentó ninguno).
  - Pasa el partido a `finalizado` de una vez, con `finishedAt` y sin `startedAt` (nunca empezó); el marcador lo pone el servidor (3-0, 0-3 o 0-0), no se manda ni se edita aparte.
  - En un partido de eliminación avanza quien se presentó (como cualquier ganador, completa el slot del partido siguiente). `"both"` ⇒ `409`.
  - **Deshacer el W.O.** (`walkover: null`) lo devuelve a `programado`, sin marcador. En un cuadro, solo si el partido siguiente está intacto (como al reabrir un partido decidido). Un W.O. **no se «reabre» como partido en juego**.
  - Un partido en juego o ya jugado, o con jugadas, no admite W.O. (`409`).
- **Solo marcador.** Pasa de `programado` a `finalizado` con `homeScore` y `awayScore` (enteros ≥ 0), sin jugadas y sin cronómetro: es el «cargar resultado directo» que ya admitía la API ([004](004-partido-en-vivo.md)), ahora con pantalla.
  - En un partido de eliminación empatado hace falta `winnerTeamId` (uno de los dos equipos) y admite `penaltyHomeScore` y `penaltyAwayScore` (opcionales, enteros ≥ 0; si vienen los dos, el que avanza tiene que ganar la tanda). El partido queda en fase `penales`. Sin empate, esos campos no se aceptan (`400`).
- **Jugadas a mano.** Es un partido `en_curso` con `manualEntry: true`: **sin `startedAt` ni tiempos** (`period` nulo), así que la crónica se separa en dos tiempos por el minuto (regla de [010](010-tiempos-del-partido.md) para partidos sin tiempos) y no hay cronómetro que correr ni partido «colgado». Cada jugada pide su **minuto** (0 a 200). Todo lo demás (deshacer, editar jugadas, finalizar, reabrir, fases de un partido decisivo) funciona como siempre. Mientras se carga figura como en curso; al finalizar queda igual que cualquier otro.
- **Tabla de posiciones.** Un W.O. con ganador cuenta como un 3-0 normal (3 puntos, goles incluidos). Un **W.O. doble** cuenta como jugado y **perdido por los dos, 0 puntos y 0 goles**, no como un empate (que daría 1 punto a cada uno): `computeStandings` lo trata aparte.
- **La mesa** no puede mandar `walkover` ni `manualEntry` (`403`, como cualquier otro campo fuera de estado, tiempo y fase).
- Todo se publica en tiempo real como cualquier `PATCH` de partido.

## API
`PATCH /api/matches/:id` (organizador del torneo o admin; la mesa, `403`):
| Cuerpo | Efecto |
|---|---|
| `{ walkover: "home" \| "away" \| "both" }` | W.O. con el marcador del servidor. |
| `{ walkover: null }` | Deshace el W.O. (vuelve a `programado`). |
| `{ status: "en_curso", manualEntry: true }` | Empieza la carga de jugadas a mano. |
| `{ status: "finalizado", homeScore, awayScore }` | Solo marcador (más `winnerTeamId`, `penaltyHomeScore`, `penaltyAwayScore` si es un empate de eliminación). |

## Datos
`Match.walkover` (texto, nulo salvo W.O.) y `Match.manualEntry` (boolean, falso por omisión): migración aditiva. `GET /api/matches/:id` los devuelve (son columnas del partido).

## Pantallas
- **Antes de iniciar:** botón «Actualizar partido finalizado» → hoja con las tres opciones: **Registrar jugadas manualmente**, **Ingresar solo el marcador** y **W.O.**
- **Solo marcador:** dos marcadores (local y visitante) y, si es de eliminación y queda empatado, «¿Quién avanza?» con los penales opcionales. Confirma antes de guardar.
- **W.O.:** «Se presentó {local}», «Se presentó {visitante}» o «Ninguno se presentó» (no en eliminación), con el resultado que quedará, y confirma.
- **Partido finalizado por W.O.:** el bloque dice «Partido finalizado · W.O.» (y quién no se presentó) y ofrece «Deshacer W.O.» en vez de «Reabrir para corregir».
- **Jugadas a mano:** el cronómetro se reemplaza por «Carga manual» y al elegir una jugada aparece el campo **Minuto**, obligatorio.
- **En la ficha del partido** (detalle público y hoja del resultado) un partido por W.O. lleva la etiqueta **W.O.** en vez de «Final» y dice quién no se presentó. Las tarjetas de las listas del fixture siguen mostrando el marcador como cualquier partido finalizado.

## Pruebas
`tests/unit/walkover.test.mjs`, `tests/unit/standings.test.mjs` (W.O. doble) y `tests/actualizar-partido.test.mjs` (integración: W.O. con ganador y doble, deshacer, eliminación, solo marcador con y sin empate, jugadas a mano y permisos de la mesa).

## Limitaciones
- Un W.O. no deja jugadas ni goleadores: el 3-0 no acredita goles a ningún jugador.
- Mientras se cargan jugadas a mano el partido figura **en curso** en las pantallas públicas (sin cronómetro).
- No hay sanción automática por un W.O. (descuento de puntos, multa, expulsión por varios W.O.); si el reglamento lo pide se hace aparte.
