# 007 · Fixture de eliminación directa, Copa y Relámpago

**Estado:** ✅ **implementada (as-built) por API.** Las pantallas todavía no existen — se usa llamando a la API directamente (ver "Limitaciones conocidas"). Se construyó en 4 fases, cada una con su propia regresión completa en verde; la 5ª fase (pantallas) queda pendiente, sin fecha.
**Resuelve:** el pendiente nº 2 de [pendientes-y-decisiones.md](pendientes-y-decisiones.md) y las decisiones 4 y 6.
**Código:** `src/_lib/fixture.ts` (`planBracket`, `roundLabel`, `penaltyWinner`, `scheduleBracketOneDay`, `seedCopaBracket`, `isTbd`), `src/_lib/standings.ts` (`computeStandings`, nuevo — antes vivía solo dentro de la ruta), `src/_lib/match-live.ts` (`MATCH_PHASES`, `canTransitionPhase`, tipo de evento `penal_definicion`), `src/app/api/tournaments/[id]/fixture/route.ts`, `src/app/api/matches/[id]/route.ts`, `src/app/api/matches/[id]/events/route.ts` y `.../[eventId]/route.ts`, `src/app/api/tournaments/[id]/standings/route.ts`.
**Pruebas:** `tests/unit/fixture.test.mjs` (ampliado), `tests/unit/match-live.test.mjs` (ampliado), `tests/unit/standings.test.mjs` (nuevo), `tests/fixture-eliminacion.test.mjs` (16, integración), `tests/fixture-copa.test.mjs` (10, integración).
**Toca:** [002](002-crear-torneo-y-equipos.md) (asistente), [003](003-fixture.md) (fixture), [004](004-partido-en-vivo.md) (partido en vivo), [modelo-de-datos.md](modelo-de-datos.md).

## Decisiones (tomadas por el usuario, 2026-09-21, confirmadas antes de implementar)
1. **Regla de puntos en liga/grupos:** victoria 3, empate 1, derrota 0. Ya era así antes de esta especificación; se confirmó por escrito sin cambiar código.
2. **Desempate en un partido de eliminación:** si el marcador sigue igual al final del tiempo reglamentario, se juega **tiempo extra** (2 tiempos); si persiste el empate, se define por **penales**.
3. **Nivel de detalle:** se registra **cada fase por separado** (reglamentario, tiempo extra, penales), no solo el resultado final.
4. **"Copa" (decisión 6 de [pendientes](pendientes-y-decisiones.md)):** **grupos + eliminación** — todos contra todos dentro de cada grupo y los mejores de cada grupo pasan a un cuadro de eliminación directa.
5. **Cuántos clasifican por grupo en Copa:** **configurable** (2, 3 o 4 equipos por grupo), lo elige el organizador al crear el torneo. Por omisión, 2.
6. **Duración del tiempo extra:** **un campo propio del torneo** (`extraTimeMinutes`), independiente de "minutos por tiempo" (`minutesPerHalf`).
7. **Sin ida y vuelta, nunca.** Esto es fútbol amateur: los clubes alquilan cancha, no tienen estadio propio. Un cruce siempre se juega **un solo partido**, en `eliminacion`, en la fase de cuadro de `copa` y en `relampago`.
8. **Sin partido por el tercer puesto.**
9. **"Relámpago" (decisión 6):** **eliminación directa pensada para un solo día.** Mismo cuadro que "Eliminación directa"; lo único que cambia es cómo se arma el calendario.
10. **Sin reingreso de equipos eliminados en Relámpago.** Se consideró y se descartó por complejidad sin necesidad clara; si hace falta, es una funcionalidad aparte sobre esta base.
11. **El tamaño del cuadro sale solo de la cantidad de equipos** (puede arrancar en octavos, en cuartos...): no es algo que el organizador elija.
12. **Un equipo sin rival (bye) pasa directo a la siguiente ronda**, priorizando a los inscritos primero (o, en Copa, a los primeros de grupo antes que los segundos).
13. **El bye se reparte por orden de inscripción, sin sorteo real** — se preguntó explícitamente porque el usuario había dicho "por sorteo" al describir un ejemplo, y se confirmó que no: es el mismo criterio que usa `liga`.

## Objetivo
Que `eliminacion`, `copa` y `relampago` tengan generación de fixture real, y que un partido que no puede terminar empatado se resuelva jugándolo: tiempo extra y, si hace falta, penales.

## Por qué necesitó un cambio de modelo
Las anteriores (`003`–`006`) reutilizaban el modelo tal cual. Esta necesitaba algo que no existía: **un partido cuyos equipos no se conocen hasta que termina el anterior.** En `liga`/`grupos` los dos equipos de un `Match` se saben al crear el fixture; en un cuadro de eliminación, el partido de semifinal no tiene rival hasta que se juega el de cuartos. Eso obligó a:
- Que `Match.homeTeamId`/`awayTeamId` puedan ser **`null`** ("por definir") — antes eran obligatorios.
- Una relación entre partidos: **quién gana este, pasa a aquel** (y de qué lado).
- Un campo explícito para saber **qué partidos no admiten empate**.

## Modelo

```prisma
model Tournament {
  // ...los campos que ya existían...
  extraTimeMinutes      Int? // minutos de cada tiempo del tiempo extra; null = 15' por omisión
  groupsAdvancePerGroup Int? // solo "copa": cuántos pasan de cada grupo (2, 3 o 4); null = 2
}

model Match {
  // ...los campos que ya existían...
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
  // ...los campos que ya existían...
  phase  String   @default("regulacion") // regulacion | tiempo_extra | penales
  scored Boolean? // solo para el tipo "penal_definicion": ¿convirtió o falló?
}
```

- **`homeTeamId`/`awayTeamId` nullable fue el cambio de mayor impacto.** Tocó todo lo que asumía que siempre hay dos equipos: la programación de partidos (choques de horario), las tablas de posiciones. Se resolvió con un helper compartido:
  ```ts
  export function isTbd(match: { homeTeamId: string | null; awayTeamId: string | null }) {
    return !match.homeTeamId || !match.awayTeamId;
  }
  ```
- **`decisive`** es explícito a propósito: una final no tiene `nextMatchId` (nadie más a quien pasarle el resultado) pero sigue sin poder terminar empatada, así que no alcanza con mirar si `nextMatchId` es `null`. Se marca `true` en toda `eliminacion`/`relampago` y en la fase de cuadro de `copa`; queda `false` en `liga`, `grupos` y la fase de grupos de `copa`.
- **`winnerTeamId`** hace falta porque, en penales, el marcador (`homeScore`/`awayScore`) queda empatado y por sí solo no dice quién avanza.
- Cambio aditivo: columnas nuevas opcionales, una autorrelación en `Match`, y se relajó (no se agregó) una restricción `NOT NULL`. No borró ni migró datos existentes al aplicarse en producción.

## Armar el cuadro (`planBracket`, lógica pura en `fixture.ts`)
1. **Sin sorteo, orden de inscripción** (igual que en `liga`): el primer equipo inscrito es la semilla 1, y así.
2. `bracketSize` = la potencia de 2 igual o mayor a la cantidad de equipos (con 7 equipos, 8; con 8, 8; con 9, 16). `byes = bracketSize − equipos`.
3. **Los `byes` primeros equipos (los inscritos antes) pasan directo a la ronda 2**; el resto juega la ronda 1 en orden de inscripción (semilla 1 vs. semilla 2, 3 vs. 4...).
4. Se generan **todas las rondas de una vez**, de atrás para adelante: la final primero (un partido sin rival todavía), y cada ronda anterior con sus partidos apuntando (`nextMatchId`, `nextMatchSlot`) a la que sigue. Un equipo con bye entra directo como `homeTeamId`/`awayTeamId` del partido de ronda 2 que le toque.
5. **El tamaño del cuadro sale solo de la cantidad de equipos inscritos.**
6. Con 2 equipos, el cuadro es una sola final. Con un número chico puede no haber ronda 1 (solo byes).
7. `matchday` es el número de ronda (1 = primera). `roundLabel(round, totalRounds)` da el nombre: "Final", "Semifinal", "Cuartos de final", "Octavos de final", "Dieciseisavos de final", o "Ronda `n`" si el cuadro es más grande.
8. Un cuadro de `n` equipos siempre tiene exactamente `n − 1` partidos (cada partido elimina a uno), sin importar los byes.

### `copa`: grupos primero, cuadro después
9. **`POST /api/tournaments/:id/fixture` es dos pasos.** Con `mode: "auto"` o `"manual"` arma la fase de grupos (idéntica a `grupos`: reutiliza `planFixture(teams, "grupos")`, con `decisive: false`, partidos que sí admiten empate). Con `mode: "bracket"` —solo cuando **todos** los partidos de grupos están `finalizado`— arma el cuadro de eliminación.
10. Los clasificados de cada grupo salen de `computeStandings` (ver más abajo), tomando los primeros `tournament.groupsAdvancePerGroup` (2 por omisión) de cada grupo. Si algún grupo no llega a esa cantidad, `409`.
11. **`seedCopaBracket`** (lógica pura) ordena a los clasificados antes de pasarlos a `planBracket`: intercala 1° de un grupo con 2° de otro grupo (rotado), para que la ronda 1 nunca cruce a dos equipos del mismo grupo; si clasifican 3° y 4°, se agregan con el mismo criterio. El orden entre grupos es alfabético, como ya hace `grupos`.
12. El cuadro de Copa queda **aparte** de los partidos de grupos (`decisive: true` solo en el cuadro); ambos conviven en la misma consulta de partidos del torneo, distinguibles por `groupName` (grupos) vs. `decisive` (cuadro).
13. Una vez armado el cuadro, **ya no se puede rehacer la fase de grupos** (protección simple; deshacer todo y volver a empezar no está implementado).

### `relampago`: mismo cuadro, calendario distinto
14. Usa `planBracket` igual que `eliminacion`. Con `mode: "manual"`, igual que `eliminacion` (sin programar). Con `mode: "auto"` y un cuerpo `{ day: { date, startTime, endTime } }`, **`scheduleBracketOneDay`** (lógica pura, nueva) le pone hora a **todos** los partidos del cuadro, uno detrás de otro, en la sede del torneo (no hay "cancha del local": la mayoría de los partidos todavía no tienen equipos definidos). Si el horario no alcanza, `400` con cuántos partidos entran, y no crea nada.
15. Es una guía, no una promesa: si un partido se atrasa, la hora "prevista" de los siguientes no se actualiza sola (sin reprogramación automática).
16. **Sin reingreso** (decisión 10): un equipo eliminado queda eliminado, igual que en `eliminacion`.

## Tabla de posiciones (`computeStandings`, extraída a `_lib/standings.ts`)
17. La lógica que ya existía (puntos, diferencia de gol, goles a favor) se sacó de la ruta `GET /standings` a una función pura, para poder reusarla al armar el cuadro de Copa. La ruta quedó como envoltorio: junta el resultado con nombre/escudo del club y le pone `position`. El comportamiento externo de `GET /api/tournaments/:id/standings` no cambió.

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

18. **Pasar de fase** es `PATCH /api/matches/:id { phase }`, una acción explícita (no automática: no hay pantalla todavía que la dispare sola). Nunca se salta una fase: `regulacion → tiempo_extra → penales`, en ese orden, y solo si el marcador sigue empatado en ese momento.
19. **Los goles de tiempo extra suman al marcador real** (`homeScore`/`awayScore`): un gol es un gol. Cada jugada (`MatchEvent`) guarda en qué `phase` ocurrió.
20. **Los penales no suman al marcador.** Cada intento es un `MatchEvent` de tipo `penal_definicion`, con `teamId` obligatorio y `scored: true|false`; solo se acepta con el partido en fase `penales` (cualquier otro tipo de jugada, `409`, en esa fase). `penaltyHomeScore`/`penaltyAwayScore` se actualizan igual que el marcador de goles, con la misma transacción atómica; deshacer un intento revierte el conteo.
21. **Terminar en la fase de penales** exige que un equipo ya no pueda ser alcanzado con los intentos que quedan (alterna, 5 por lado como mínimo, muerte súbita después): `penaltyWinner(homeScored, homeMissed, awayScored, awayMissed)` decide si ya hay ganador matemático; si no, `409`.
22. Al terminar con un ganador (por marcador o por penales), se completa `winnerTeamId` y, si el partido tiene `nextMatchId`, **se rellena automáticamente** `homeTeamId` o `awayTeamId` del partido siguiente, en la misma transacción. El torneo pasa a `finalizado` cuando la final tiene resultado, igual que en los demás formatos.
23. **Reabrir un partido decisivo que ya tenía ganador** (de `finalizado` a `en_curso` o a `programado`): si el partido tiene `nextMatchId` y ese siguiente **ya tiene resultado, está en curso o tiene jugadas**, `409` ("primero deshaz el resultado del partido siguiente"). Si el siguiente sigue intacto (o si es la final, sin siguiente), reabrir limpia `winnerTeamId` y, de corresponder, vacía el slot que había llenado. Volver a `programado` además resetea la fase a `regulacion`.
24. Un partido "por definir" (`isTbd`) no se puede iniciar ni finalizar (`409`).

## API

| Endpoint | Qué hace |
|---|---|
| `POST /api/tournaments/:id/fixture` | `eliminacion`: `mode: "manual"` genera el cuadro sin programar (no tiene `"auto"` todavía). `relampago`: `"manual"` o `"auto"` con `day`. `copa`: `"auto"`/`"manual"` arma grupos; `"bracket"`, cuando terminaron, arma el cuadro. |
| `PATCH /api/matches/:id` | Acepta `phase` (solo avanza, y solo si sigue empatado); rechaza `finalizado` con el partido `decisive` todavía empatado y sin haber llegado a un ganador de penales. |
| `POST /api/matches/:id/events` | Acepta el tipo `penal_definicion` con `scored`; solo en fase `penales`. |
| `DELETE /api/matches/:id/events/:eventId` | Revierte también `penaltyHomeScore`/`penaltyAwayScore` si corresponde. |
| `POST /api/tournaments`, `PATCH /api/tournaments/:id` | Suman `extraTimeMinutes` (entero 1–45) y `groupsAdvancePerGroup` (exactamente 2, 3 o 4) a la validación existente. |
| `GET /api/tournaments/:id/standings` | Sin cambios externos; por dentro usa `computeStandings`. |

**No implementado:** un `GET /api/tournaments/:id/fixture` dedicado que devuelva el cuadro ya armado como árbol (se había previsto para dibujar las llaves). Por ahora `GET /api/matches?tournamentId=` alcanza para todo lo que hay (incluye `nextMatchId`, `decisive`, `phase`, etc.); se evalúa si hace falta un endpoint aparte recién al construir la pantalla de llaves.

## Pantallas
**Nada de esto existe todavía** (fase 5, pendiente, sin fecha). Lo previsto:
- Asistente "Crear torneo", paso 3: campos para `extraTimeMinutes` y, si el formato es Copa, `groupsAdvancePerGroup`.
- `/torneos/:id/iniciar`: dejar de decir "formato sin soporte" para estos tres formatos.
- Una vista de llaves para el cuadro, con "Por definir" en los partidos sin rival todavía.
- En partido en vivo, los pasos "Ir a tiempo extra" / "Ir a penales", y una pantalla para la tanda de penales.
- La crónica separando tiempo reglamentario, tiempo extra y penales.
- Para Copa, un botón "Armar el cuadro" que aparezca recién cuando la fase de grupos terminó.

Hasta que exista, se usa por API (hay un script de ejemplo para `eliminacion` de punta a punta).

## Pruebas
- **Unitarias**, sin servidor: `planBracket` (2, 3, 5, 7, 8, 9 equipos: byes, nadie repite ronda, la final es un solo partido), `roundLabel`, `penaltyWinner` (decisión anticipada, 5 parejo, muerte súbita), `isTbd`, `scheduleBracketOneDay` (secuencial, error claro si no alcanza el horario), `seedCopaBracket` (2, 3 y 4 grupos, rango impar, un grupo más chico, determinismo), fases de partido (`MATCH_PHASES`/`canTransitionPhase`), `computeStandings` (puntos, desempate, partidos "por definir" no cuentan, groupName se conserva).
- **`tests/fixture-eliminacion.test.mjs`** (16): generar el cuadro (par, con bye, formato no soportado); ciclo completo de un partido decisivo (marcador directo, fases, penales, penales sin decidir); reabrir (con el siguiente intacto, con el siguiente ya tocado, volviendo a "programado"); validación de `extraTimeMinutes`/`groupsAdvancePerGroup`; `relampago` manual y automático, con y sin horario suficiente, jugado de punta a punta.
- **`tests/fixture-copa.test.mjs`** (10): fase de grupos; `mode: "bracket"` antes de tener grupos o antes de que terminen (`409`); cuadro de 2 grupos sin cruzar el mismo grupo en ronda 1 (verificado contra las posiciones reales); `groupsAdvancePerGroup` configurable; un grupo sin equipos suficientes (`409`); permisos; no se puede rehacer la fase de grupos una vez armado el cuadro; el cuadro se juega igual que `eliminacion`.
- Antes de darlas por buenas se probó, a mano, que varias de estas pruebas **detectan de verdad** el problema que dicen cubrir: se quitó momentáneamente el chequeo de "el siguiente partido sigue intacto" y la prueba de reapertura falló como se esperaba; se rompió la rotación de `seedCopaBracket` y la prueba de "no cruza el mismo grupo" falló como se esperaba.
- Regresión completa (unitarias + las 6 suites de integración existentes) verificada en verde después de cada fase.

## Limitaciones conocidas
- **Sin pantallas.** Se usa por API. Es la limitación principal hoy.
- **`eliminacion` no tiene `mode: "auto"`:** cada partido se programa a mano, uno por uno, con `PATCH /api/matches/:id`, igual que el modo manual de `liga`.
- **`relampago` con atrasos:** si un partido se demora, los horarios "previstos" de los siguientes no se actualizan solos.
- **Sin sorteo real:** todo se arma por orden de inscripción, incluido el bye.
- **Sin repesca, sin reingreso, sin doble eliminación, sin partido por el tercer puesto.**
- **La final de un cuadro de 2 equipos no tiene ronda anterior:** el fixture se reduce a un solo partido, sin bye que mostrar.
- **`copa` no tiene forma de deshacer solo el cuadro** (para corregir la fase de grupos después de armado): hay que deshacer el fixture entero (`DELETE /fixture`) y volver a empezar.
- **Sin `GET /fixture` dedicado** (ver "API"): se arma el árbol en el cliente a partir de `GET /matches`.

## Fases de implementación
1. ✅ **Modelo** (`homeTeamId`/`awayTeamId` nullable, columnas nuevas) + `planBracket`/`roundLabel`/`penaltyWinner`/`isTbd` puros, con pruebas unitarias.
2. ✅ **`eliminacion`:** generación del cuadro, fases y penales, avance automático al siguiente partido, reapertura con guardas.
3. ✅ **`relampago`:** `scheduleBracketOneDay` para el calendario de un solo día.
4. ✅ **`copa`:** grupos + cuadro, `computeStandings` extraída, `seedCopaBracket`, `groupsAdvancePerGroup`.
5. ⏳ **Pantallas:** pendiente.
