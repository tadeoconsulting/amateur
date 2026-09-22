# 007 · Fixture de eliminación directa, Copa y Relámpago

**Estado:** ⏳ **propuesta, sin implementar.** Se revisa por fases antes de escribir código (ver "Orden de implementación sugerido").
**Resuelve:** el pendiente nº 2 de [pendientes-y-decisiones.md](pendientes-y-decisiones.md) y las decisiones 4 y 6.
**Toca:** [002](002-crear-torneo-y-equipos.md) (asistente), [003](003-fixture.md) (fixture), [004](004-partido-en-vivo.md) (partido en vivo), [modelo-de-datos.md](modelo-de-datos.md).

## Decisiones ya tomadas (por el usuario, 2026-09-21)
1. **Regla de puntos en liga/grupos:** victoria 3, empate 1, derrota 0. **Ya es así hoy** (`src/app/api/tournaments/[id]/standings/route.ts`) — esta propuesta no la toca.
2. **Desempate en un partido de eliminación:** si el marcador sigue igual al final del tiempo reglamentario, se juega **tiempo extra** (2 tiempos); si persiste el empate, se define por **penales**.
3. **Nivel de detalle:** se registra **cada fase por separado** (reglamentario, tiempo extra, penales), no solo el resultado final.
4. **"Copa" (decisión 6):** **grupos + eliminación** — todos contra todos dentro de cada grupo y los mejores de cada grupo pasan a un cuadro de eliminación directa.
5. **Cuántos clasifican por grupo en Copa:** **configurable** (2, 3 o 4 equipos por grupo), lo elige el organizador al crear el torneo. Por omisión, 2.
6. **Duración del tiempo extra:** **un campo propio del torneo**, independiente de "minutos por tiempo" (`minutesPerHalf`); lo define el organizador junto a los demás datos del paso 3 del asistente.
7. **Sin ida y vuelta, nunca.** Esto es fútbol amateur, no profesional: los clubes no tienen estadio propio (alquilan cancha), así que un cruce siempre se juega **un solo partido**. Aplica a `eliminacion`, a la fase de cuadro de `copa` y a `relampago`. *(Esto reemplaza lo que se había preguntado sobre "ida y vuelta" en la vuelta anterior: quedó descartado del todo.)*
8. **Sin partido por el tercer puesto.**
9. **"Relámpago" (decisión 6):** **eliminación directa pensada para un solo día.** Mismo cuadro que "Eliminación directa"; lo único que cambia es cómo se arma el calendario (todas las rondas el mismo día).
10. **Sin reingreso de equipos eliminados en Relámpago.** Se consideró (un equipo que pierde podría volver a anotarse) y **se descartó**: complica el fixture (pasaría de armarse todo de una vez a crecer sobre la marcha) sin necesidad clara. Si más adelante hace falta, es una funcionalidad aparte sobre esta base, no algo que haya que prever ahora.
11. **El tamaño del cuadro depende de la cantidad de equipos** ("puede empezar en octavos, en cuartos..."): ya es como está diseñado más abajo — se calcula solo, no hay que elegirlo.
12. **Un equipo sin rival (bye) pasa directo a la siguiente ronda.**

> **Una frase a confirmar:** al describir el ejemplo de 7 equipos dijiste que el que queda libre se decide "por sorteo". El resto de la conversación (y la decisión 5 de [002](002-crear-torneo-y-equipos.md)/[003](003-fixture.md)) estableció que este proyecto **no sortea, usa el orden de inscripción** — así que esta propuesta le da el bye al equipo inscrito primero entre los que sobran, no a uno al azar. Si de verdad querías un sorteo real para el bye (distinto del resto del fixture), avisa y lo cambio.

## Objetivo
Que `eliminacion`, `copa` y `relampago` tengan generación de fixture real (hoy responden `409` "este formato todavía no tiene generación de fixture"), y que un partido que no puede terminar empatado se resuelva jugándolo: tiempo extra y, si hace falta, penales.

## Por qué necesita un cambio de modelo
Las anteriores (`003`–`006`) reutilizaban el modelo tal cual. Esta necesita algo que hoy no existe: **un partido cuyos equipos no se conocen hasta que termina el anterior.** En `liga`/`grupos` los dos equipos de un `Match` se saben al crear el fixture; en un cuadro de eliminación, el partido de semifinal no tiene rival hasta que se juega el de cuartos. Eso obliga a:
- Que `Match.homeTeamId`/`awayTeamId` puedan ser **`null`** ("por definir") — hoy son obligatorios.
- Una relación entre partidos: **quién gana este, pasa a aquel** (y de qué lado).
- Un campo explícito para saber **qué partidos no admiten empate** (ver más abajo).

## Modelo

```prisma
model Tournament {
  // ...los campos que ya existen...
  extraTimeMinutes      Int? // minutos de cada tiempo del tiempo extra; null = 15' por omisión
  groupsAdvancePerGroup Int? // solo "copa": cuántos pasan de cada grupo (2, 3 o 4); null = 2
}

model Match {
  // ...los campos que ya existen...
  homeTeamId String?   // "por definir" hasta que se conozca el ganador del cruce anterior
  awayTeamId String?

  // Bracket de eliminación: a qué partido y de qué lado pasa quien gane este.
  nextMatchId   String?
  nextMatchSlot String?  // "home" | "away"

  // ¿Este partido puede terminar empatado? No, si es parte de un cuadro de eliminación.
  decisive         Boolean @default(false)
  winnerTeamId     String?                  // quien avanza (los penales no lo dice el marcador)
  phase            String  @default("regulacion") // regulacion | tiempo_extra | penales
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
  y una etiqueta "Por definir" (mismo patrón que `UNSCHEDULED_LABEL` para partidos sin hora).
- **`decisive`** es explícito a propósito: una final no tiene `nextMatchId` (nadie más a quien pasarle el resultado) pero sigue sin poder terminar empatada, así que no alcanza con mirar si `nextMatchId` es `null`. Se marca `true` en toda `eliminacion`/`relampago` y en la fase de cuadro de `copa`; queda `false` (como siempre) en `liga`, `grupos` y la fase de grupos de `copa`.
- **`winnerTeamId`** hace falta porque, en penales, el marcador (`homeScore`/`awayScore`) queda empatado y por sí solo no dice quién avanza.
- Todo aditivo: columnas nuevas opcionales y una autorrelación. No borra ni migra datos existentes.

## Armar el cuadro (`planBracket`, lógica pura — nueva en `fixture.ts`)
1. **Sin sorteo, orden de inscripción** (igual que en `liga`): el primer equipo inscrito es la semilla 1, y así.
2. `bracketSize` = la potencia de 2 igual o mayor a la cantidad de equipos (con 7 equipos, 8; con 8, 8; con 9, 16). `byes = bracketSize − equipos`.
3. **Los `byes` primeros equipos (los inscritos antes) pasan directo a la ronda 2**; el resto juega la ronda 1 en orden de inscripción (semilla 1 vs. semilla 2, 3 vs. 4...). Con 7 equipos: 3 partidos en ronda 1 y 1 equipo libre que pasa directo — el ejemplo exacto que describiste.
4. Se generan **todas las rondas de una vez**, de atrás para adelante: la final primero (un partido sin rival todavía), y cada ronda anterior con sus partidos apuntando (`nextMatchId`, `nextMatchSlot`) a la que sigue. Un equipo con bye entra directo como `homeTeamId`/`awayTeamId` del partido de ronda 2 que le toque.
5. **El tamaño del cuadro (y por lo tanto si arranca en octavos, cuartos, etc.) sale solo de la cantidad de equipos inscritos** — no es algo que el organizador elija.
6. Con 2 equipos, el cuadro es una sola final. Con un número chico puede no haber ronda 1 (solo byes).
7. `matchday` sigue siendo el número de ronda (1 = primera). La etiqueta de pantalla la decide `roundLabel(round, totalRounds)`: "Final", "Semifinal", "Cuartos de final", "Octavos de final", "Dieciseisavos de final", "Ronda `n`" si el cuadro es más grande que eso.

### `copa`: grupos primero, cuadro después
8. Se corre primero `planFixture` de `grupos` tal cual existe hoy.
9. **Al terminar la fase de grupos** (todos sus partidos `finalizado`), el organizador arma el cuadro con los mejores `tournament.groupsAdvancePerGroup` de cada grupo (2 por omisión).
10. El cuadro se arma con `planBracket`, sembrando **1° de un grupo contra 2° de otro** (nunca dos equipos del mismo grupo en la primera ronda del cuadro, si el número de grupos lo permite). El orden entre grupos es el de creación (alfabético del nombre, como ya hace `grupos`).
11. Si la cantidad de clasificados no es potencia de 2, mismo mecanismo de `byes` del punto 3, con los primeros de grupo por delante de los segundos.

### `relampago`: mismo cuadro, calendario distinto
12. Usa `planBracket` igual que `eliminacion`. Lo único distinto es `scheduleFixture`: **todas las rondas se programan el mismo día**, una detrás de otra con el mismo intervalo entre partidos (`slotMinutesFor`). Como una ronda depende de la anterior, esto es una guía de horarios, no una promesa firme: si un partido se atrasa, corre la hora "prevista" de los siguientes de esa jornada.
13. **Sin reingreso** (decisión 10): un equipo eliminado queda eliminado, igual que en `eliminacion`.

## Ciclo de un partido que no admite empate (`decisive: true`)

```
programado ──iniciar──▶ en_curso (fase: regulación)
                            │ empieza empatado tras 2 tiempos
                            ▼
                       en_curso (fase: tiempo extra, 2×extraTimeMinutes)
                            │ sigue empatado
                            ▼
                       en_curso (fase: penales)
                            │
                            ▼
                       finalizado + winnerTeamId
                            │
                            ▼
        se completa automáticamente el slot correspondiente
        de nextMatch (nextMatchSlot: home | away)
```

14. **Pasar de fase** es una acción del organizador (`PATCH /api/matches/:id { phase }`), no automática: al terminar el tiempo reglamentario, la pantalla ofrece **"Ir a tiempo extra"** si el marcador está igual, o **"Finalizar partido"** si no. Nunca se salta una fase sola: `regulacion → tiempo_extra → penales`, en ese orden, y solo si sigue empatado.
15. **Los goles de tiempo extra suman al marcador real** (`homeScore`/`awayScore`): un gol es un gol. Cada jugada (`MatchEvent`) guarda en qué `phase` ocurrió, para que la crónica diga "Gol (tiempo extra)".
16. **Los penales no suman al marcador.** Cada intento es un `MatchEvent` de tipo nuevo `penal_definicion`, con `teamId` obligatorio, `playerId` opcional y `scored: true|false`. `penaltyHomeScore`/`penaltyAwayScore` se actualizan igual que el marcador de goles, con la misma transacción atómica.
17. **Terminar en la fase de penales** exige que un equipo ya no pueda ser alcanzado con los intentos que quedan (alterna, 5 por lado como mínimo, muerte súbita después): una función pura `penaltyWinner(homeScored, homeMissed, awayScored, awayMissed)` decide si ya hay ganador matemático.
18. Al terminar con un ganador, se completa `winnerTeamId` y, si el partido tiene `nextMatchId`, **se rellena automáticamente** `homeTeamId` o `awayTeamId` del partido siguiente, en la misma transacción. El torneo pasa a `finalizado` cuando la final tiene resultado, igual que hoy.
19. **Reabrir un partido de eliminación después que su ganador ya avanzó** es un caso especial: si el siguiente partido **ya tiene resultado o está en curso**, reabrir da `409` ("primero deshaz el resultado del partido siguiente"). Si el siguiente todavía no arrancó, reabrir además **vacía el slot** que había llenado.

## API (nuevo o modificado)

| Endpoint | Cambio |
|---|---|
| `POST /api/tournaments/:id/fixture` | Deja de rechazar `eliminacion`, `copa`, `relampago` con `409`. Para `copa`, un segundo `mode: "bracket"` posterior a la fase de grupos (regla 9) en vez de todo junto. |
| `GET /api/tournaments/:id/fixture` *(nuevo)* | El cuadro completo con sus dependencias (`nextMatchId` resuelto), para dibujar el bracket en pantalla. |
| `POST /api/tournaments` y `PATCH /api/tournaments/:id` | Suman `extraTimeMinutes` y `groupsAdvancePerGroup` a `parseTournamentFields` (misma validación que `minutesPerHalf`: entero positivo u opcional). |
| `PATCH /api/matches/:id` | Acepta `phase` (solo avanza, nunca la baja salvo al reabrir); rechaza `finalizado` con marcador empatado si el partido es `decisive` y sigue en fase `regulacion` o `tiempo_extra` (`409`, "hay que definirlo"). |
| `POST /api/matches/:id/events` | Acepta el tipo `penal_definicion` con `scored`; solo válido en fase `penales`. Guarda `phase` en cada jugada. |
| `DELETE /api/matches/:id/events/:eventId` | Igual que hoy, revierte también `penaltyHomeScore`/`penaltyAwayScore` si corresponde. |

## Pantallas
- **Asistente "Crear torneo", paso 3:** dos campos nuevos junto a "Minutos por tiempo": "Minutos del tiempo extra" y, solo si el formato es Copa, "Equipos que clasifican por grupo" (2/3/4).
- **`/torneos/:id/iniciar`:** ya no dice "formato sin soporte" para estos tres; explica cuántas rondas tendrá el cuadro y cuántos equipos entran con bye.
- **`/torneos/:id/partidos` (nueva vista "Llaves"):** el cuadro completo, ronda por ronda, con "Por definir" en los partidos sin rival todavía (mismo tratamiento visual que ya existe para "sin hora").
- **`/torneos/:id/en-vivo/:matchId`:** en un partido `decisive`, agrega el paso **"Ir a tiempo extra"** / **"Ir a penales"** en vez de "Finalizar partido" cuando corresponde; en fase de penales, una tira de intentos (✓/✗) por equipo en vez de la lista de jugadas.
- **Resultado y ficha del partido:** la crónica separa "Tiempo reglamentario", "Tiempo extra" y "Penales" cuando corresponde.

## Pruebas a escribir
- **Unitarias (`tests/unit/fixture.test.mjs`, sin servidor):** `planBracket` con 2, 3, 5, 7, 8 y 9 equipos (byes correctos — el caso de 7 con 1 bye en particular —, nadie juega dos veces la misma ronda, la final es siempre un solo partido); `roundLabel` (incluidos cuadros más grandes que octavos); `penaltyWinner` (2-0 tras 2 intentos ya cierra; 4-4 sigue abierto; muerte súbita 5-5 luego 6-5 cierra).
- **Integración (`tests/fixture-eliminacion.test.mjs`, nuevo):** generar cuadro de `eliminacion` con equipos impares (bye correcto); `copa` no deja generar el cuadro hasta que la fase de grupos termina, respeta `groupsAdvancePerGroup` (2, 3 y 4), siembra sin cruzar mismo grupo; `relampago` programa todas las rondas en un día; avanzar de fase en orden, no saltar; terminar en penales completa el slot del siguiente partido en una transacción; reabrir un partido cuyo ganador ya avanzó da `409`; validar `extraTimeMinutes`/`groupsAdvancePerGroup` en crear/editar torneo.

## Limitaciones conocidas (previstas, antes de implementar)
- **El cronómetro sigue sin pausa entre tiempos** (limitación ya documentada en [004](004-partido-en-vivo.md)): pasar de fase es una acción manual del organizador.
- **`relampago` con atrasos:** si un partido de una ronda se demora, los horarios "previstos" de los siguientes quedan desactualizados; no hay reprogramación automática.
- **Sin sorteo real:** todo se arma por orden de inscripción, incluido el bye (ver la nota al principio de este documento). Un cuadro "picante" depende de que el organizador haya inscrito a los equipos en el orden que quiere.
- **Sin repesca, sin reingreso, sin doble eliminación, sin partido por el tercer puesto.**
- **La final de un cuadro de 2 equipos no tiene ronda anterior**: el fixture se reduce a un solo partido, sin bye que mostrar.

## Orden de implementación sugerido
Por el tamaño, en fases — cada una es un PR con sus pruebas, no todo junto:
1. **Modelo** (`homeTeamId`/`awayTeamId` nullable, columnas nuevas) + `planBracket`/`roundLabel`/`penaltyWinner` puros con sus pruebas unitarias. Sin tocar la API todavía.
2. **`eliminacion`:** `POST /fixture` genera el cuadro; `PATCH /api/matches/:id` con fases y penales; completar automático del siguiente partido. Con esto ya se puede jugar un torneo de eliminación de punta a punta (por API).
3. **`relampago`:** reutiliza casi todo lo de (2); solo cambia `scheduleFixture` para un solo día.
4. **`copa`:** el híbrido grupos + cuadro, con `groupsAdvancePerGroup`.
5. **Pantallas:** vista de llaves, los pasos nuevos en partido en vivo, la crónica por fases.

¿Confirmas la nota sobre el bye (orden de inscripción, no sorteo real), y arranco con la fase 1?
