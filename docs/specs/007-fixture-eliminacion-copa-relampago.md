# 007 · Fixture de eliminación directa, Copa y Relámpago

**Estado:** ⏳ **propuesta, sin implementar.** Es la más grande de las propuestas hasta ahora — se revisa por fases antes de escribir código (ver "Orden de implementación sugerido").
**Resuelve:** el pendiente nº 2 de [pendientes-y-decisiones.md](pendientes-y-decisiones.md) y las decisiones 1, 4 y 6.
**Toca:** [003](003-fixture.md) (fixture), [004](004-partido-en-vivo.md) (partido en vivo), [modelo-de-datos.md](modelo-de-datos.md).

## Decisiones ya tomadas (por el usuario, 2026-09-21)
1. **Regla de puntos en liga/grupos:** victoria 3, empate 1, derrota 0. **Ya es así hoy** (`src/app/api/tournaments/[id]/standings/route.ts`) — esta propuesta no la toca; se confirma por escrito porque el usuario la pidió explícitamente.
2. **Desempate en eliminación directa (decisión 4):** si el marcador sigue igual al final del tiempo reglamentario, se juega **tiempo extra** (2 tiempos de 15'); si persiste el empate, se define por **penales**. Como en un Mundial.
3. **Nivel de detalle:** se registra **cada fase por separado** (reglamentario, tiempo extra, penales), no solo el resultado final. Es la opción más grande de las dos que se ofrecieron.
4. **"Copa" (decisión 6):** **grupos + eliminación** — todos contra todos dentro de cada grupo y los mejores de cada grupo pasan a un cuadro de eliminación directa. Como un Mundial.
5. **"Relámpago" (decisión 6):** **eliminación directa pensada para un solo día.** Mismo cuadro que "Eliminación directa"; lo que cambia es cómo se arma el calendario (todo en una fecha), no los cruces.

## Objetivo
Que `eliminacion`, `copa` y `relampago` tengan generación de fixture real (hoy responden `409` "este formato todavía no tiene generación de fixture"), y que un partido que no puede terminar empatado se resuelva jugándolo: tiempo extra y, si hace falta, penales.

## Por qué es la propuesta más grande hasta ahora
Las anteriores (`003`–`006`) reutilizaban el modelo tal cual. Esta necesita algo que hoy no existe: **un partido cuyos equipos no se conocen hasta que termina el anterior.** En `liga`/`grupos` los dos equipos de un `Match` se saben al crear el fixture; en un cuadro de eliminación, el partido de semifinal no tiene rival hasta que se juega el de cuartos. Eso obliga a:
- Que `Match.homeTeamId`/`awayTeamId` puedan ser **`null`** ("por definir") — hoy son obligatorios.
- Una relación entre partidos: **quién gana este, pasa a aquel** (y de qué lado).
- Un partido que "no admite empate": si sigue igual, se sigue jugando (tiempo extra, penales) en vez de guardarse así.

## Modelo

```prisma
model Match {
  // ...los campos que ya existen...
  homeTeamId String?   // "por definir" hasta que se conozca el ganador del partido anterior
  awayTeamId String?

  // Bracket de eliminación: a qué partido y de qué lado pasa quien gane este.
  nextMatchId   String?
  nextMatchSlot String?  // "home" | "away"

  // Partidos que "no admiten empate" (ver más abajo) necesitan un ganador aparte del
  // marcador, porque los penales no suman al marcador.
  winnerTeamId     String?
  phase            String @default("regulacion") // regulacion | tiempo_extra | penales
  penaltyHomeScore Int?
  penaltyAwayScore Int?

  nextMatch  Match?  @relation("MatchBracket", fields: [nextMatchId], references: [id])
  feedsInto  Match[] @relation("MatchBracket")
}

model MatchEvent {
  // ...los campos que ya existen...
  phase  String   @default("regulacion") // regulacion | tiempo_extra | penales
  scored Boolean? // solo para el tipo "penal_definicion": ¿convirtió o falló?
}
```

- **`homeTeamId`/`awayTeamId` nullable es el cambio de mayor impacto.** Toca todo lo que hoy asume que siempre hay dos equipos: la ficha del partido, "en vivo", resultado, tablas de posiciones (que igual excluyen estos formatos), y el tipo `MatchListItem` de `_lib/api.ts`. Se resuelve con un solo helper compartido:
  ```ts
  export function isTbd(match: { homeTeamId: string | null; awayTeamId: string | null }) {
    return !match.homeTeamId || !match.awayTeamId;
  }
  ```
  y una etiqueta "Por definir" (ya existe el patrón: `UNSCHEDULED_LABEL` para partidos sin hora cumple el mismo papel).
- **`winnerTeamId`** es necesario porque, a diferencia de `liga`/`grupos`, acá alguien tiene que ganar siempre: si termina en penales, el marcador (`homeScore`/`awayScore`) sigue empatado y por sí solo no dice quién avanza.
- **`phase`** solo importa mientras el partido está `en_curso` **y no admite empate** (ver más abajo); en `liga`/`grupos` queda siempre en `"regulacion"` y no se usa.
- Todo aditivo: columnas nuevas opcionales, una tabla de relación propia (`_prisma` la maneja como autorrelación). No borra ni migra datos existentes.

## ¿Qué partidos "no admiten empate"?
Los de una llave de eliminación (`eliminacion`, `relampago`, y la fase de eliminación de `copa`). Se decide por estructura, no por un campo nuevo: **un partido no admite empate si tiene `nextMatchId` o si es la final** (el último de su cuadro). Los de la fase de grupos de `copa`, como los de `liga`/`grupos`, sí admiten empate.

```
canEndInDraw(match) = match.nextMatchId === null && match.groupName === null  // fuera de un cuadro
```
(la final tiene `nextMatchId = null` pero también está en un cuadro: se identifica porque viene de `planFixture` con `bracket: true`, ver más abajo).

## Armar el cuadro (`planBracket`, lógica pura — nueva en `fixture.ts`)
1. **Sin sorteo, orden de inscripción** (igual que en `liga`, decisión ya tomada): el primer equipo inscrito es la semilla 1, y así.
2. `bracketSize` = la potencia de 2 igual o mayor a la cantidad de equipos. `byes = bracketSize − equipos`.
3. **Los `byes` primeros equipos (los inscritos antes) pasan directo a la ronda 2**; el resto juega la ronda 1 en orden de inscripción (semilla 1 vs. semilla 2, 3 vs. 4...). Es la forma más simple de dar de baja el sorteo sin dejar de premiar a quien se inscribió primero.
4. Se generan **todas las rondas de una vez**, de atrás para adelante: la final primero (un partido sin rival todavía), y cada ronda anterior con sus partidos apuntando (`nextMatchId`, `nextMatchSlot`) a la que sigue. Un equipo con bye entra directo como `homeTeamId`/`awayTeamId` del partido de ronda 2 que le toque; el resto de las plazas de ronda 2 quedan `null` hasta que se resuelva la ronda 1.
5. Con 2 equipos, el cuadro es una sola final. Con un número muy chico (`< 4`) puede no haber ronda 1 (solo byes): igual es válido.
6. `matchday` sigue siendo el número de ronda (1 = primera ronda...), como hoy es "la fecha" en `liga`. La etiqueta de pantalla la decide `roundLabel(round, totalRounds)`: "Final", "Semifinal", "Cuartos de final", "Octavos de final", "Ronda `n`" si no hay nombre.

### `copa`: grupos primero, cuadro después
7. Se corre primero `planFixture` de `grupos` tal cual existe hoy.
8. **Al terminar la fase de grupos** (todos sus partidos `finalizado`), el organizador arma el cuadro con los **mejores 2 de cada grupo** (posiciones 1 y 2 de la tabla del grupo). *Valor por omisión, no confirmado — ver decisión pendiente A.*
9. El cuadro se arma con `planBracket`, sembrando **1° de un grupo contra 2° de otro** (nunca dos equipos del mismo grupo en la primera ronda del cuadro, si el número de grupos lo permite). El orden entre grupos, para no sortear, es el de creación de los grupos (orden alfabético del nombre, como ya hace `planFixture` de `grupos`).
10. Si la cantidad de clasificados no es potencia de 2, mismo mecanismo de `byes` que en el punto 3, con los primeros de grupo por delante de los segundos.

### `relampago`: mismo cuadro, calendario distinto
11. Usa `planBracket` igual que `eliminacion`. Lo único distinto es `scheduleFixture`: en vez de un rango de fechas, **todas las rondas se programan el mismo día**, una detrás de otra con el mismo intervalo entre partidos (`slotMinutesFor`). Como una ronda depende de la anterior, esto es más una guía de horarios que una promesa firme: si un partido se atrasa, corre la hora "prevista" de los siguientes de esa jornada (ver limitaciones).

## Ciclo de un partido que no admite empate

```
programado ──iniciar──▶ en_curso (fase: regulación)
                            │ empieza empatado tras 2 tiempos
                            ▼
                       en_curso (fase: tiempo extra)
                            │ sigue empatado tras 2 tiempos de 15'
                            ▼
                       en_curso (fase: penales)
                            │
                            ▼
                       finalizado + winnerTeamId
                            │ (si winnerTeamId existe)
                            ▼
        se completa automáticamente el slot correspondiente
        de nextMatch (nextMatchSlot: home | away)
```

12. **Pasar de fase** es una acción del organizador (`PATCH /api/matches/:id { phase }`), no automática: al terminar el tiempo reglamentario, la pantalla ofrece **"Ir a tiempo extra"** si el marcador está igual, o **"Finalizar partido"** si no. Nunca se salta una fase sola: `regulacion → tiempo_extra → penales`, en ese orden, y solo si sigue empatado.
13. **Los goles de tiempo extra suman al marcador real** (`homeScore`/`awayScore`): un gol es un gol, se haya hecho en el minuto 10 o en el 115. Cada jugada (`MatchEvent`) guarda en qué `phase` ocurrió, para que la crónica diga "Gol (tiempo extra)".
14. **Los penales no suman al marcador.** Cada intento es un `MatchEvent` de tipo nuevo `penal_definicion`, con `teamId` obligatorio, `playerId` opcional y `scored: true|false`. `penaltyHomeScore`/`penaltyAwayScore` son el conteo derivado (o se guardan como columnas que se actualizan igual que el marcador de goles, con la misma transacción atómica que ya usan los goles).
15. **Terminar el partido en la fase de penales** exige que un equipo le lleve ventaja al otro *y que ya no pueda alcanzarlo* con los intentos que quedan (regla estándar: alterna, 5 intentos por lado como mínimo, muerte súbita después) — se puede calcular con una función pura `penaltyWinner(homeScored, homeMissed, awayScored, awayMissed)` que decide si ya hay ganador matemático.
16. Al terminar con un ganador (por marcador, sin llegar a penales, o por penales), se completa `winnerTeamId` y, si el partido tiene `nextMatchId`, **se rellena automáticamente** `homeTeamId` o `awayTeamId` (según `nextMatchSlot`) del partido siguiente, en la misma transacción. El torneo pasa a `finalizado` cuando la final tiene resultado, igual que hoy (`Tournament` termina solo).
17. **Reabrir un partido de eliminación después que su ganador ya avanzó** es un caso especial: si el siguiente partido **ya tiene resultado o está en curso**, reabrir da `409` ("primero deshaz el resultado del partido siguiente"). Si el siguiente todavía no arrancó, reabrir además **vacía el slot** que había llenado.

## API (nuevo o modificado)

| Endpoint | Cambio |
|---|---|
| `POST /api/tournaments/:id/fixture` | Deja de rechazar `eliminacion`, `copa`, `relampago` con `409`. Para `copa`, un segundo `mode: "bracket"` posterior a la fase de grupos (ver regla 8) en vez de todo junto. |
| `GET /api/tournaments/:id/fixture` *(nuevo)* | El cuadro completo con sus dependencias (`nextMatchId` resuelto), para dibujar el bracket en pantalla. |
| `PATCH /api/matches/:id` | Acepta `phase` (solo avanza, nunca la baja salvo al reabrir); rechaza `finalizado` con marcador empatado si el partido no admite empate y sigue en fase `regulacion` o `tiempo_extra` (`409`, "hay que definirlo"). |
| `POST /api/matches/:id/events` | Acepta el tipo `penal_definicion` con `scored`; solo válido en fase `penales`. Guarda `phase` en cada jugada. |
| `DELETE /api/matches/:id/events/:eventId` | Igual que hoy, revierte también `penaltyHomeScore`/`penaltyAwayScore` si corresponde. |

## Pantallas
- **`/torneos/:id/iniciar`:** ya no dice "formato sin soporte" para estos tres; explica en su lugar cuántas rondas tendrá el cuadro y cuántos equipos entran con bye.
- **`/torneos/:id/partidos` (nueva vista "Llaves"):** el cuadro completo, ronda por ronda, con "Por definir" en los partidos sin rival todavía (mismo tratamiento visual que ya existe para "sin hora").
- **`/torneos/:id/en-vivo/:matchId`:** agrega, cuando el partido no admite empate y termina igualado, el paso **"Ir a tiempo extra"** / **"Ir a penales"** en vez de "Finalizar partido"; en fase de penales, una tira de intentos (✓/✗) por equipo en vez de la lista de jugadas.
- **Resultado y ficha del partido:** la crónica separa "Tiempo reglamentario", "Tiempo extra" y "Penales" cuando corresponde.

## Pruebas a escribir
- **Unitarias (`tests/unit/fixture.test.mjs`, sin servidor):** `planBracket` con 2, 3, 5, 8 y 9 equipos (byes correctos, nadie juega dos veces la misma ronda, la final es siempre un solo partido); `roundLabel`; `penaltyWinner` (casos: 2-0 tras 2 intentos cada uno ya es ganador matemático; 4-4 sigue abierto; muerte súbita 5-5 luego 6-5 cierra).
- **Integración (`tests/fixture-eliminacion.test.mjs`, nuevo):** generar cuadro de `eliminacion` con equipos impares (bye correcto); `copa` arma grupos, no deja generar el cuadro hasta que la fase de grupos termina, siembra sin cruzar mismo grupo; `relampago` programa todas las rondas en un día; avanzar de fase en orden, no saltar; terminar en penales completa el slot del siguiente partido en una transacción; reabrir un partido cuyo ganador ya avanzó da `409`; un equipo con bye no genera partido de ronda 1.

## Decisiones que hay que confirmar
| # | Decisión | Recomendación | Alternativa |
|---|---|---|---|
| A | ¿Cuántos clasifican por grupo en `copa`? | **Los 2 primeros de cada grupo** (como un Mundial). | Configurable por torneo (un campo más en el asistente). |
| B | ¿Cuánto dura cada tiempo extra? | **15 minutos fijos**, sin importar `minutesPerHalf` (como las reglas oficiales). | Proporcional a `minutesPerHalf` (por ejemplo, la mitad). |
| C | ¿Hay partido por el tercer puesto? | **No**, no se pidió y no está en las pantallas actuales. | Sí: un partido más entre los perdedores de semifinal. |
| D | ¿Un partido de eliminación puede jugarse a dos partidos (ida y vuelta)? | **No, uno solo** (ya es la decisión 5 de `002`/`003`: "una sola vuelta"). | Ida y vuelta con la regla del gol de visitante (que además ya está descartada en el fútbol profesional actual). |

## Limitaciones conocidas (previstas, antes de implementar)
- **El cronómetro sigue sin pausa entre tiempos** (limitación ya documentada en [004](004-partido-en-vivo.md)): pasar de fase es una acción manual del organizador, no algo que el reloj dispare solo.
- **`relampago` con atrasos:** si un partido de una ronda se demora, los horarios "previstos" de los siguientes de esa jornada quedan desactualizados; no hay reprogramación automática.
- **Sin sorteo real:** todo se arma por orden de inscripción, igual que `liga`. Un cuadro "picante" (evitar que los dos favoritos se crucen antes de la final) depende de que el organizador haya inscrito a los equipos en el orden que quiere.
- **Sin repesca ni doble eliminación.**
- **La final de un cuadro pequeño (2 equipos) no tiene ronda anterior**: el fixture se reduce a un solo partido, sin bye que mostrar.

## Orden de implementación sugerido
Por el tamaño, en fases — cada una es un PR con sus pruebas, no todo junto:
1. **Modelo** (`homeTeamId`/`awayTeamId` nullable, columnas nuevas) + `planBracket`/`roundLabel`/`penaltyWinner` puros con sus pruebas unitarias. Sin tocar la API todavía.
2. **`eliminacion`:** `POST /fixture` genera el cuadro; `PATCH /api/matches/:id` con fases y penales; completar automático del siguiente partido. Con esto ya se puede jugar un torneo de eliminación de punta a punta (por API).
3. **`relampago`:** reutiliza casi todo lo de (2); solo cambia `scheduleFixture` para un solo día.
4. **`copa`:** el híbrido grupos + cuadro.
5. **Pantallas:** vista de llaves, los pasos nuevos en partido en vivo, la crónica por fases.

¿Empezamos por la fase 1, o prefieres ver primero cómo se ve una pantalla de ejemplo (llaves o penales) antes de tocar el modelo?
