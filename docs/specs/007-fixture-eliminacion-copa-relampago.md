# 007 · Fixture de eliminación directa, Copa y Relámpago

**Estado:** ⏳ **propuesta, sin implementar.** Es la más grande de las propuestas hasta ahora — se revisa por fases antes de escribir código (ver "Orden de implementación sugerido").
**Resuelve:** el pendiente nº 2 de [pendientes-y-decisiones.md](pendientes-y-decisiones.md) y las decisiones 4 y 6.
**Toca:** [002](002-crear-torneo-y-equipos.md) (asistente), [003](003-fixture.md) (fixture), [004](004-partido-en-vivo.md) (partido en vivo), [modelo-de-datos.md](modelo-de-datos.md).

## Decisiones ya tomadas (por el usuario, 2026-09-21)
1. **Regla de puntos en liga/grupos:** victoria 3, empate 1, derrota 0. **Ya es así hoy** (`src/app/api/tournaments/[id]/standings/route.ts`) — esta propuesta no la toca; se confirma por escrito porque el usuario la pidió explícitamente.
2. **Desempate en eliminación directa (decisión 4):** si el marcador sigue igual al final del tiempo reglamentario, se juega **tiempo extra** (2 tiempos); si persiste el empate, se define por **penales**. Como en un Mundial.
3. **Nivel de detalle:** se registra **cada fase por separado** (reglamentario, tiempo extra, penales), no solo el resultado final.
4. **"Copa" (decisión 6):** **grupos + eliminación** — todos contra todos dentro de cada grupo y los mejores de cada grupo pasan a un cuadro de eliminación directa. Como un Mundial.
5. **"Relámpago" (decisión 6):** **eliminación directa pensada para un solo día.** Mismo cuadro que "Eliminación directa"; lo que cambia es cómo se arma el calendario.
6. **Cuántos clasifican por grupo en Copa:** **configurable** (2, 3 o 4 equipos por grupo), lo elige el organizador al crear el torneo.
7. **Duración del tiempo extra:** **un campo propio**, independiente de "minutos por tiempo" (`minutesPerHalf`). El organizador lo define al crear el torneo, junto a los demás datos del paso 3 del asistente.
8. **Partido por el tercer puesto:** no, por ahora.
9. **Ida y vuelta en el cuadro de eliminación:** **configurable ronda por ronda.** Al armar el cuadro, el organizador elige para cada ronda si se juega a partido único o a dos partidos. `relampago` es la excepción: al ser de un solo día, sus rondas son siempre a partido único (ver más abajo).
10. **Desempate del agregado en una ronda a dos partidos:** si sigue empatado tras los dos partidos, se juega **tiempo extra y, si hace falta, penales en el partido de vuelta**. No se usa la regla del gol de visitante (la IFAB la eliminó del fútbol profesional en 2021).

> Interpretación de la respuesta a "ida y vuelta": la pregunta ofrecía "partido único" o "configurable" como alternativas separadas y el usuario marcó ambas (una como base, la otra como mecanismo). Esta especificación asume que **la base es partido único y la ronda que el organizador marque como "ida y vuelta" pasa a dos partidos** — si no era esto, es la primera cosa a corregir antes de implementar.

## Objetivo
Que `eliminacion`, `copa` y `relampago` tengan generación de fixture real (hoy responden `409` "este formato todavía no tiene generación de fixture"), que un partido decisivo que no puede terminar empatado se resuelva jugándolo (tiempo extra y penales), y que una ronda pueda jugarse a ida y vuelta.

## Por qué es la propuesta más grande hasta ahora
Las anteriores (`003`–`006`) reutilizaban el modelo tal cual. Esta necesita tres cosas que hoy no existen:
1. **Un partido cuyos equipos no se conocen hasta que termina el anterior** ("por definir"): `Match.homeTeamId`/`awayTeamId` pasan a ser opcionales — hoy son obligatorios.
2. **Una relación entre partidos:** quién gana este cruce, a qué partido y de qué lado pasa.
3. **Un cruce que puede ser uno o dos partidos** (ida y vuelta), con un ganador que sale del agregado y no solo del marcador de un partido.

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

  // Bracket de eliminación: a qué partido y de qué lado pasa quien gane este cruce.
  nextMatchId   String?
  nextMatchSlot String?  // "home" | "away"

  // Ida y vuelta: la vuelta apunta a su ida. Sin este campo, el cruce es a partido único.
  firstLegId String?
  leg        Int?      // 1 (ida) o 2 (vuelta); null si el cruce es a partido único

  // Todo lo que sigue solo aplica al partido que decide el cruce (el único, o la vuelta):
  decisive         Boolean @default(false) // ¿este cruce no puede quedar en empate?
  winnerTeamId     String?                  // quien avanza (los penales no lo dice el marcador)
  phase            String  @default("regulacion") // regulacion | tiempo_extra | penales
  penaltyHomeScore Int?
  penaltyAwayScore Int?

  nextMatch  Match?  @relation("MatchBracket", fields: [nextMatchId], references: [id])
  feedsInto  Match[] @relation("MatchBracket")
  firstLeg   Match?  @relation("MatchLegs", fields: [firstLegId], references: [id])
  secondLeg  Match?  @relation("MatchLegs")
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
- **`decisive` reemplaza cualquier intento de adivinar** si un partido admite empate a partir de otros campos (una final no tiene `nextMatchId`, pero sigue siendo decisiva). Se marca explícito al crear el partido: `true` en toda `eliminacion`/`relampago` y en la fase de cuadro de `copa`; `false` en `liga`, `grupos` y la fase de grupos de `copa`.
- **`leg`/`firstLegId` solo existen en un cruce a dos partidos.** La ida es un partido normal (`decisive: false`, admite empate: nadie avanza todavía). La vuelta es la que tiene `decisive: true`, `firstLegId` apuntando a la ida, y es la que carga `nextMatchId`/`winnerTeamId`/`phase`/penales.
- Todo aditivo: columnas nuevas opcionales y dos autorrelaciones. No borra ni migra datos existentes.

## Armar el cuadro (`planBracket`, lógica pura — nueva en `fixture.ts`)
1. **Sin sorteo, orden de inscripción** (igual que en `liga`): el primer equipo inscrito es la semilla 1, y así.
2. `bracketSize` = la potencia de 2 igual o mayor a la cantidad de equipos. `byes = bracketSize − equipos`.
3. **Los `byes` primeros equipos (los inscritos antes) pasan directo a la ronda 2**; el resto juega la ronda 1 en orden de inscripción (semilla 1 vs. semilla 2, 3 vs. 4...).
4. Se generan **todas las rondas de una vez**, de atrás para adelante: la final primero (un cruce sin rival todavía), y cada ronda anterior apuntando (`nextMatchId`/`nextMatchSlot`) a la que sigue. Un equipo con bye entra directo como `homeTeamId`/`awayTeamId` del cruce de ronda 2 que le toque.
5. **`roundConfig: { round: number; twoLegged: boolean }[]`** dice, ronda por ronda, si se juega a partido único o ida y vuelta. Se pasa al generar el fixture (no se guarda como ajuste del torneo: cada `Match` ya sabe si tuvo o no una vuelta). Una ronda a dos partidos genera **dos `Match`**: la ida (locales y visitantes tal como salió del cruce) y la vuelta (los mismos equipos, de local el que fue visitante), con `firstLegId` de la vuelta apuntando a la ida.
6. `relampago` **ignora `roundConfig` y siempre arma partido único** en cada ronda: es la definición misma del formato ("un solo día"); dos partidos por cruce no entran en una sola jornada.
7. Con 2 equipos, el cuadro es una sola final (o dos partidos, si esa ronda es a ida y vuelta). Con un número chico puede no haber ronda 1 (solo byes).
8. `matchday` sigue siendo el número de ronda. La etiqueta de pantalla la decide `roundLabel(round, totalRounds)`: "Final", "Semifinal", "Cuartos de final", "Octavos de final", "Ronda `n`".

### `copa`: grupos primero, cuadro después
9. Se corre primero `planFixture` de `grupos` tal cual existe hoy.
10. **Al terminar la fase de grupos** (todos sus partidos `finalizado`), el organizador arma el cuadro con los mejores `tournament.groupsAdvancePerGroup` de cada grupo (2 por omisión).
11. El cuadro se arma con `planBracket`, sembrando **1° de un grupo contra 2° de otro** (nunca dos equipos del mismo grupo en la primera ronda del cuadro, si el número de grupos lo permite). El orden entre grupos es el de creación (alfabético del nombre, como ya hace `grupos`).
12. Si la cantidad de clasificados no es potencia de 2, mismo mecanismo de `byes` del punto 3, con los primeros de grupo por delante de los segundos.

## ¿Cuándo un cruce está "empatado" y hay que seguir jugando?
Para un cruce a **partido único**: cuando el partido (`decisive: true`) termina su fase actual con `homeScore === awayScore`.
Para un cruce a **ida y vuelta**: cuando, al terminar la fase actual de la vuelta, el **agregado** sigue igual —
```
agregado(equipo) = goles de ese equipo en la ida + goles de ese equipo en la vuelta
```
(sin gol de visitante: el agregado es una suma simple). Este cálculo se hace con `firstLeg` cargado junto a la vuelta; una sola función pura (`isDrawnOnAggregate(leg2, leg1?)`) cubre ambos casos (si no hay `firstLeg`, compara solo el partido).

## Ciclo de un partido decisivo (`decisive: true`)

```
programado ──iniciar──▶ en_curso (fase: regulación)
                            │ termina igualado (o el agregado sigue igual)
                            ▼
                       en_curso (fase: tiempo extra, 2×extraTimeMinutes)
                            │ sigue igualado
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

13. **Pasar de fase** es una acción del organizador (`PATCH /api/matches/:id { phase }`), no automática: al terminar el tiempo reglamentario, la pantalla ofrece **"Ir a tiempo extra"** si sigue igualado (o el agregado sigue igual), o **"Finalizar partido"** si no. Nunca se salta una fase sola: `regulacion → tiempo_extra → penales`, en ese orden, y solo si sigue empatado.
14. **Los goles de tiempo extra suman al marcador real** (`homeScore`/`awayScore`) de ese partido (y por lo tanto al agregado, si hay ida). Cada jugada (`MatchEvent`) guarda en qué `phase` ocurrió, para que la crónica diga "Gol (tiempo extra)".
15. **Los penales no suman al marcador ni al agregado.** Cada intento es un `MatchEvent` de tipo nuevo `penal_definicion`, con `teamId` obligatorio, `playerId` opcional y `scored: true|false`. `penaltyHomeScore`/`penaltyAwayScore` se actualizan igual que el marcador de goles, con la misma transacción atómica.
16. **Terminar en la fase de penales** exige que un equipo ya no pueda ser alcanzado con los intentos que quedan (alterna, 5 por lado como mínimo, muerte súbita después): una función pura `penaltyWinner(homeScored, homeMissed, awayScored, awayMissed)` decide si ya hay ganador matemático.
17. Al terminar con un ganador, se completa `winnerTeamId` y, si el partido tiene `nextMatchId`, **se rellena automáticamente** `homeTeamId` o `awayTeamId` del partido siguiente, en la misma transacción. El torneo pasa a `finalizado` cuando la final tiene resultado, igual que hoy.
18. **Un partido de ida** (`decisive: false`, tiene `secondLeg`) se juega y se cierra como un partido normal (admite empate); no dispara nada de esto — la ida solo aporta goles al agregado que se evalúa al cerrar la vuelta.
19. **Reabrir un partido decisivo después que su ganador ya avanzó** es un caso especial: si el siguiente cruce **ya tiene resultado o está en curso**, reabrir da `409` ("primero deshaz el resultado del partido siguiente"). Si el siguiente todavía no arrancó, reabrir además **vacía el slot** que había llenado.

## API (nuevo o modificado)

| Endpoint | Cambio |
|---|---|
| `POST /api/tournaments/:id/fixture` | Deja de rechazar `eliminacion`, `copa`, `relampago` con `409`. Acepta `roundConfig` (ver regla 5). Para `copa`, un segundo `mode: "bracket"` posterior a la fase de grupos (regla 10) en vez de todo junto. |
| `GET /api/tournaments/:id/fixture` *(nuevo)* | El cuadro completo con sus dependencias (`nextMatchId`/`firstLegId` resueltos), para dibujar el bracket en pantalla. |
| `POST /api/tournaments` y `PATCH /api/tournaments/:id` | Suman `extraTimeMinutes` y `groupsAdvancePerGroup` a `parseTournamentFields` (mismas reglas de validación que `minutesPerHalf`: entero positivo u opcional). |
| `PATCH /api/matches/:id` | Acepta `phase` (solo avanza, nunca la baja salvo al reabrir); rechaza `finalizado` con el cruce empatado en un partido `decisive` (`409`, "hay que definirlo"). |
| `POST /api/matches/:id/events` | Acepta el tipo `penal_definicion` con `scored`; solo válido en fase `penales`. Guarda `phase` en cada jugada. |
| `DELETE /api/matches/:id/events/:eventId` | Igual que hoy, revierte también `penaltyHomeScore`/`penaltyAwayScore` si corresponde. |

## Pantallas
- **Asistente "Crear torneo", paso 3:** dos campos nuevos junto a "Minutos por tiempo": "Minutos del tiempo extra" y, solo si el formato es Copa, "Equipos que clasifican por grupo" (2/3/4).
- **`/torneos/:id/iniciar`:** ya no dice "formato sin soporte" para estos tres; explica cuántas rondas tendrá el cuadro y cuántos equipos entran con bye, y deja marcar qué rondas son ida y vuelta.
- **`/torneos/:id/partidos` (nueva vista "Llaves"):** el cuadro completo, ronda por ronda, con "Por definir" en los cruces sin rival todavía y, en una ronda a dos partidos, el marcador de ida junto al de vuelta y el agregado.
- **`/torneos/:id/en-vivo/:matchId`:** en un partido `decisive`, agrega el paso **"Ir a tiempo extra"** / **"Ir a penales"** en vez de "Finalizar partido" cuando corresponde; en fase de penales, una tira de intentos (✓/✗) por equipo en vez de la lista de jugadas. En la vuelta de un cruce a dos partidos, muestra el agregado en todo momento (no solo el marcador de ese partido).
- **Resultado y ficha del partido:** la crónica separa "Tiempo reglamentario", "Tiempo extra" y "Penales" cuando corresponde, y muestra el resultado de la ida si el cruce fue a dos partidos.

## Pruebas a escribir
- **Unitarias (`tests/unit/fixture.test.mjs`, sin servidor):** `planBracket` con 2, 3, 5, 8 y 9 equipos (byes correctos, nadie juega dos veces la misma ronda); una ronda marcada `twoLegged` genera ida y vuelta con locales invertidos y `firstLegId` correcto; `relampago` ignora `roundConfig`; `roundLabel`; `isDrawnOnAggregate` (con y sin ida); `penaltyWinner` (2-0 tras 2 intentos ya cierra; 4-4 sigue abierto; muerte súbita 5-5 luego 6-5 cierra).
- **Integración (`tests/fixture-eliminacion.test.mjs`, nuevo):** generar cuadro de `eliminacion` con equipos impares (bye correcto) y con una ronda a ida y vuelta; `copa` no deja generar el cuadro hasta que la fase de grupos termina, respeta `groupsAdvancePerGroup` (2, 3 y 4), siembra sin cruzar mismo grupo; avanzar de fase en orden, no saltar, y solo cuando el agregado sigue igual; terminar en penales completa el slot del siguiente partido en una transacción; reabrir un partido cuyo ganador ya avanzó da `409`; validar `extraTimeMinutes`/`groupsAdvancePerGroup` en crear/editar torneo.

## Limitaciones conocidas (previstas, antes de implementar)
- **El cronómetro sigue sin pausa entre tiempos** (limitación ya documentada en [004](004-partido-en-vivo.md)): pasar de fase es una acción manual del organizador.
- **La pantalla para marcar qué rondas son ida y vuelta** depende del tamaño del cuadro, que a su vez depende de cuántos equipos terminan inscritos: se define recién en "Iniciar torneo", no antes.
- **`relampago` con atrasos:** si un partido de una ronda se demora, los horarios "previstos" de los siguientes quedan desactualizados; no hay reprogramación automática.
- **Sin sorteo real:** todo se arma por orden de inscripción. Un cuadro "picante" depende de que el organizador haya inscrito a los equipos en el orden que quiere.
- **Sin repesca ni doble eliminación, sin partido por el tercer puesto.**
- **La final de un cuadro de 2 equipos no tiene ronda anterior**: el fixture se reduce al cruce final (uno o dos partidos), sin bye que mostrar.

## Orden de implementación sugerido
Por el tamaño, en fases — cada una es un PR con sus pruebas, no todo junto:
1. **Modelo** (`homeTeamId`/`awayTeamId` nullable, columnas nuevas, autorrelaciones) + `planBracket`/`roundLabel`/`isDrawnOnAggregate`/`penaltyWinner` puros con sus pruebas unitarias. Sin tocar la API todavía.
2. **`eliminacion` a partido único:** `POST /fixture` genera el cuadro; `PATCH /api/matches/:id` con fases y penales; completar automático del siguiente partido. Con esto ya se puede jugar un torneo de punta a punta (por API).
3. **Ida y vuelta:** `roundConfig`, generación de las dos piernas, agregado, fase disparada por el agregado.
4. **`relampago`:** reutiliza (2); solo cambia `scheduleFixture` para un solo día.
5. **`copa`:** el híbrido grupos + cuadro, con `groupsAdvancePerGroup`.
6. **Pantallas:** vista de llaves, los pasos nuevos en partido en vivo, la crónica por fases.

¿Empezamos por la fase 1, o primero corrijo la interpretación de "ida y vuelta" si no era la que asumí arriba?
