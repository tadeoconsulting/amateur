# 004 · Partido en vivo y resultados

**Estado:** implementada (as-built).
**Código:** `src/_lib/match-live.ts` (lógica pura), `src/_lib/realtime.ts`, `src/_lib/use-match-realtime.ts`, `src/app/api/matches/[id]/route.ts`, `.../events/route.ts`, `.../events/[eventId]/route.ts`, `.../realtime-token/route.ts`, `src/app/(organizador)/torneos/[id]/{en-vivo,resultado,partidos/[matchId],partido/[matchId]}`.
**Pruebas:** `tests/unit/match-live.test.mjs` (11, sin servidor), `tests/unit/realtime.test.mjs` (4, sin servidor ni Ably real) y `tests/live.test.mjs` (25, API). El caso de goles simultáneos está en `tests/auth.test.mjs`.

## Objetivo
Registrar un partido mientras se juega (marcador, goles, tarjetas), terminarlo, y que las tablas del torneo se actualicen solas.

## Ciclo de un partido

```
programado ──iniciar──▶ en_curso ──finalizar──▶ finalizado
    │  ▲                   │  ▲                     │
    │  └── (sin jugadas) ──┘  └──── reabrir ────────┘
    └────────── cargar resultado directo ──────────▶ finalizado
```

1. **Un solo nombre para "en juego": `en_curso`.** (`en_vivo` no existe como estado; solo es una etiqueta de un componente visual.)
2. Transiciones permitidas: `programado → en_curso | finalizado`; `en_curso → finalizado | programado` (solo si no tiene jugadas); `finalizado → en_curso` (reabrir para corregir). `finalizado → programado` da `409`. Repetir el estado actual es inofensivo.
3. **Al empezar** se guarda `startedAt` y el marcador arranca **0–0**. Reabrir un partido conserva el `startedAt` original.
4. **Al terminar el marcador nunca queda vacío** (si era `null` pasa a 0–0), porque las tablas ignoran los partidos sin marcador. No se puede terminar dejando el marcador en `null` (`400`).
5. Volver a `programado` borra `startedAt` y el marcador.
6. **El torneo termina solo:** cuando todos sus partidos están `finalizado`, el torneo pasa a `finalizado`; si se reabre uno, vuelve a `en_curso`.
7. Un partido `en_curso` o `finalizado` **no se reprograma** (`409`).

`PATCH /api/matches/:id` acepta `homeScore`/`awayScore` (enteros ≥ 0 o `null`, para corregir a mano), `status` (`programado`, `en_curso`, `finalizado`) y la programación (ver [003](003-fixture.md)). Lo hace el organizador del torneo.

## Jugadas (`MatchEvent`)

| Tipo guardado | Botón en pantalla | Cambia el marcador | Estadística del jugador |
|---|---|---|---|
| `gol` | Gol | **sí**, +1 al equipo | `goals` |
| `tarjeta_amarilla` | Amarilla | no | `yellowCards` |
| `tarjeta_roja` | Roja | no | `redCards` |
| `sustitucion` | Cambio (`playerId` sale, `playerInId` entra) | no | — |
| `penal` | Penal | **no** | — |

### Registrar (`POST /api/matches/:id/events`)
8. **Solo con el partido `en_curso`** (`409` "inícialo antes de registrar jugadas").
9. Validaciones (`400`): `type` de la lista (el nombre de la pantalla `amarilla` no es válido); `minute` entero 0–200; `detail` de hasta 200 caracteres; `teamId`, si viene, debe ser uno de los **dos equipos de ese partido**; un `gol` **exige** `teamId`; `playerId` exige `teamId` y el jugador debe **pertenecer a ese equipo**.
10. La jugada, el marcador y las estadísticas se guardan **en una transacción**, con incrementos atómicos: seis goles simultáneos dan seis.
11. Si el marcador estaba en `null`, se pone en 0 antes de sumar.

### Deshacer (`DELETE /api/matches/:id/events/:eventId`)
12. Borra la jugada y **revierte** su efecto en el marcador y en las estadísticas, **sin bajar de 0**.
13. Solo con el partido `en_curso`: para corregir uno terminado hay que reabrirlo primero (`409`). Borrar dos veces da `404`; una jugada de otro partido, `404`.

### Lectura
`GET /api/matches/:id/events` (público) devuelve las jugadas ordenadas por minuto y luego por orden de registro, con `playerId`, `playerName`, `teamId` y `detail`. `GET /api/matches/:id` incluye las jugadas, `startedAt` y el torneo con `minutesPerHalf`.

## Tablas (se calculan al pedirlas, no se guardan)
- **Posiciones** (`GET /api/tournaments/:id/standings?group=`): cuenta solo partidos `finalizado`. Victoria 3, empate 1, derrota 0. Orden: puntos, diferencia de gol, goles a favor. Un partido en juego **no** cuenta en la tabla oficial (la que usan las llaves y la clasificación).
- **Tabla en vivo** (`…/standings?live=1`, la que piden las pantallas del fan, el jugador, el club y el organizador): suma además los partidos `en_curso` **con el marcador de ese momento, como si terminaran así**. Es una proyección: no se guarda nada, y al finalizar el partido la oficial queda igual a lo que se veía. Cada fila trae su lugar de ahora (`position`), el oficial (`officialPosition`), si juega ahora (`live`) y cuántos puntos le da el marcador de ahora (`pointsDelta`: 3, 1 o 0). En pantalla: aviso "Tabla en vivo", ▲/▼ con los lugares que sube o baja, un punto rojo en los equipos que juegan, "+3" junto a sus puntos y, en la página del club, la etiqueta "En vivo" en su posición. Un partido que quedó en curso sin que nadie lo finalizara (ver `matchClock`) **no** mueve la tabla. Las llaves de una liga con playoffs no entran (como en la oficial). Lógica pura: `computeLiveStandings` y `placeChanges` en `_lib/standings.ts`, con pruebas. Se actualiza solo con el tiempo real (cada gol o cambio de estado).
- **Goleadores** (`GET /api/tournaments/:id/scorers`): jugadores con al menos un gol, de mayor a menor, según `PlayerStats`.

## Pantallas
- **`/torneos/:id/en-vivo/:matchId`:** todo sale de la API (marcador, jugadas, hora de inicio), por lo que **una recarga conserva el estado**. Según el estado:
  - *programado:* botón **Iniciar partido**.
  - *en curso:* cronómetro desde `startedAt`, selector Local/Visitante, las cinco acciones, lista de jugadores del equipo (opcional), **Guardar jugada**, **Deshacer última jugada** y **Finalizar partido** (confirmación en el mismo lugar, sin ventanas emergentes).
  - *finalizado:* solo lectura y **Reabrir para corregir**.
  - La duración mostrada sale de `2 × minutesPerHalf` (70 si el torneo no la definió). El minuto de cada jugada es el minuto transcurrido al guardarla.
- **`/torneos/:id/resultado/:matchId`:** marcador y crónica real (inicio, jugadas, final).
- **`/torneos/:id/partidos/:matchId`:** ficha del partido con marcador, minuto en vivo y la línea de tiempo.
- **`/torneos/:id/partido/:matchId`:** previa con cuenta regresiva hasta la hora programada.
- **Ficha de lectura para fan, jugador y club** (`MatchDetail`): `/{organizador}/{torneo}/partido/:matchId` (pública), `/jugador/torneos/:id/partido/:matchId` y `/club/torneos/:id/partido/:matchId`. Marcador, minuto en vivo, cronología con nombres y, en escritorio, forma de los equipos y tabla; se actualiza por tiempo real. Ver [008](008-observaciones-octubre-2026.md), Fase 4.

## Tiempo real (ficha del partido)

Implementa el ADR de `docs/arquitectura.md` §7-9 (SSE conceptualmente; en la práctica, Ably, que ya da esto sobre HTTP con reconexión incorporada — ver `docs/arquitectura.md` §8 para por qué Ably y no self-managed).

- **Qué se publica:** un aviso vacío (`{ name: "update" }`) al canal `match:<id>` de Ably, **después** de que el cambio ya quedó guardado en la base. Nunca el detalle del evento: quien lo recibe vuelve a pedir `GET /api/matches/:id` y `GET /api/matches/:id/events`, que son la única fuente de verdad. Se publica al registrar una jugada, al deshacerla y en cualquier `PATCH` de partido que tenga éxito (empezar, terminar, reabrir, corregir marcador, cambiar de fase).
- **El seam:** `publicarEventoPartido(matchId)` en `src/_lib/realtime.ts` es la única función que sabe que existe Ably. El resto del código (las tres rutas de arriba) solo la llama; cambiar de proveedor no toca esas rutas.
- **Token (`GET /api/matches/:id/realtime-token`):** público, como el resto de las lecturas de un partido. Da un token de Ably que solo sirve para **suscribirse** (no publicar) al canal de **ese** partido, así que no sirve para espiar otro. `503` si `ABLY_API_KEY` no está configurada; `404` si el partido no existe.
- **El cliente** (`use-match-realtime.ts`) carga el paquete de Ably de forma diferida (solo en esta pantalla) y se conecta con `authUrl` apuntando a ese endpoint, así que Ably renueva el token solo. Cualquier falla — sin `ABLY_API_KEY`, sin red, sin el paquete — se traga en silencio: la pantalla se queda con lo que trajo la carga inicial, igual que antes de esta funcionalidad.
- **Sin `ABLY_API_KEY` (por ejemplo en local o en Preview si no se configuró) la app funciona exactamente igual que antes:** la publicación no hace nada y el token da `503`. No es un requisito para desarrollar ni para desplegar.

## Limitaciones conocidas
- **Un penal convertido hay que registrarlo como gol.** El botón "Penal" solo deja constancia en la crónica y no cambia el marcador. *Decisión pendiente.*
- **Sin alineaciones:** `matchesPlayed` de los goleadores queda en 0 y `assists` no se registra.
- **Quién gestiona el partido:** el organizador del torneo, el admin y, desde la especificación [011](011-mesa.md), la **mesa** asignada (solo el día de juego, sin reabrir partidos ni tocar el marcador a mano).
- **Color del estado:** en vivo **rojo**, en el descanso **negro** y finalizado **gris**, en todas las pantallas (barra y reloj de la pantalla en vivo, etiqueta de la ficha, filas de partidos, llaves, cronología). Una sola definición: `_lib/match-tone.ts` (`matchTone`, con pruebas). Un partido por jugarse conserva su color de siempre.
- **Descanso y dos tiempos:** desde la especificación [010](010-tiempos-del-partido.md) un partido nuevo se juega en dos tiempos, con descanso que detiene el cronómetro. Un partido que ya estaba en vivo antes de ese cambio sigue con su cronómetro continuo desde `startedAt`.
- **El minuto de una jugada no se edita** (sale del reloj). Desde la pantalla solo se deshace la **última** jugada.
- **Cambios:** desde la corrección de octubre de 2026 un cambio registra **quién sale** (`playerId`) **y quién entra** (`playerInId`, columna nueva de `MatchEvent`). En la pantalla en vivo son dos pasos (*¿Quién sale?* → *¿Quién entra?*); quien entra tiene que ser del mismo equipo y distinto de quien sale (`substitutionError`, `_lib/match-live.ts`). Sin elegir a nadie, el cambio se guarda sin jugadores, como antes. Se ve como "Sale X · Entra Y" en la crónica en vivo, en la pantalla de resultado, en la cronología del organizador y en la del público (los menores, abreviados como siempre). Los cambios anteriores quedan sin jugador que entra. No cuenta minutos jugados ni estadísticas (`statFor` no suma nada para un cambio).
- **Un equipo temporal no tiene jugadores** salvo que un admin cargue **jugadores provisionales** (especificación [009](009-jugadores-provisionales.md)); sin ellos, sus jugadas se registran sin jugador.
- **El tiempo real solo llega a las fichas del partido** (`/torneos/:id/partidos/:matchId` del organizador y la ficha de lectura de fan, jugador y club). Las demás pantallas (previa, en vivo del organizador, tabla de posiciones, goleadores, lista de partidos) siguen viendo el estado solo al abrir o recargar. Ver "Tiempo real" más abajo.
- El cronómetro usa el reloj del navegador contra un `startedAt` del servidor: un reloj desajustado se nota.
- **El tiempo real no avisa cuando un ganador avanza al siguiente partido del cuadro,** ni a quien mira la tabla de posiciones o los goleadores: hay que recargar esas pantallas.
- **Sin backoff propio ante reconexión:** se apoya en el del cliente de Ably. Un `ABLY_API_KEY` sobregirado en su plan simplemente deja de repartir en vivo (la ficha sigue funcionando con lo último que cargó).
- Las pantallas del dueño de club usan un club fijo (`club-1`) en algunos lugares.
