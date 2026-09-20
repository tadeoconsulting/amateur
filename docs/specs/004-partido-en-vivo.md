# 004 · Partido en vivo y resultados

**Estado:** implementada (as-built).
**Código:** `src/_lib/match-live.ts` (lógica pura), `src/app/api/matches/[id]/route.ts`, `.../events/route.ts`, `.../events/[eventId]/route.ts`, `src/app/(organizador)/torneos/[id]/{en-vivo,resultado,partidos/[matchId],partido/[matchId]}`.
**Pruebas:** `tests/unit/match-live.test.mjs` (11, sin servidor) y `tests/live.test.mjs` (23, API). El caso de goles simultáneos está en `tests/auth.test.mjs`.

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
| `sustitucion` | Cambio | no | — |
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
- **Posiciones** (`GET /api/tournaments/:id/standings?group=`): cuenta solo partidos `finalizado`. Victoria 3, empate 1, derrota 0. Orden: puntos, diferencia de gol, goles a favor. Un partido en juego **no** cuenta.
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

## Limitaciones conocidas
- **Un penal convertido hay que registrarlo como gol.** El botón "Penal" solo deja constancia en la crónica y no cambia el marcador. *Decisión pendiente.*
- **Sin alineaciones:** `matchesPlayed` de los goleadores queda en 0 y `assists` no se registra.
- **Sin descanso ni pausa:** el cronómetro corre continuo desde `startedAt`. La duración prevista es solo una guía visual.
- **El minuto de una jugada no se edita** (sale del reloj). Desde la pantalla solo se deshace la **última** jugada.
- **El cambio no registra jugadores** (la pantalla no envía `detail` ni quién entra o sale).
- **Un equipo temporal no tiene jugadores**, así que sus jugadas se registran sin jugador.
- **Los espectadores no reciben nada en tiempo real:** ven el estado al abrir o recargar. La arquitectura prevista está en los documentos de arquitectura del proyecto (SSE + Ably).
- El cronómetro usa el reloj del navegador contra un `startedAt` del servidor: un reloj desajustado se nota.
- Las pantallas del dueño de club usan un club fijo (`club-1`) en algunos lugares.
