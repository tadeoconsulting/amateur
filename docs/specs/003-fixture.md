# 003 · Fixture: iniciar un torneo

**Estado:** implementada (as-built), solo para los formatos `liga` y `grupos`.
**Código:** `src/_lib/fixture.ts` (lógica pura), `src/app/api/tournaments/[id]/fixture/route.ts`, `src/app/api/matches/[id]/route.ts` (programación), `src/app/(organizador)/torneos/[id]/{iniciar,fixture,manual,configurar,partidos}`.
**Pruebas:** `tests/unit/fixture.test.mjs` (lógica, sin servidor) y `tests/fixture.test.mjs` (19, API).

## Objetivo
Convertir los equipos inscritos en partidos con fecha, hora y sede, y pasar el torneo a `en_curso`.

## Formatos soportados
| Formato | Qué se genera |
|---|---|
| `liga` | Todos contra todos entre todos los equipos, una sola vuelta. **Opcional: llaves** al terminar (ver "Llaves en una liga"). |
| `grupos` | Todos contra todos **dentro de cada grupo** (todos los equipos deben tener `groupName`; cada grupo, al menos 2) |
| `eliminacion`, `copa`, `relampago` | **Sin generación todavía.** La API responde `409` "Este formato todavía no tiene generación de fixture" y la pantalla lo explica. |

## Cruces (`planFixture`, lógica pura)
1. **Método del círculo.** Cada par de equipos se enfrenta exactamente una vez y en una misma fecha nadie juega dos veces.
2. Con cantidad **par** de equipos hay `n − 1` fechas; con **impar**, `n` fechas y en cada una un equipo descansa.
3. **Local y visitante se reparten:** con cantidad par, la diferencia entre partidos de local y de visitante es a lo sumo 1 y nadie repite más de 2 seguidos; con impar, diferencia de 2 y rachas de 3 como máximo.
4. **Es determinista:** el orden sale del orden de inscripción. No hay sorteo.
5. En `grupos`, las fechas de todos los grupos coinciden; el total de fechas es el del grupo más grande.

## Calendario (`scheduleFixture`)
Cada fecha del fixture lleva su propia configuración:

| Campo | Regla |
|---|---|
| `days` | días de la semana, 0 = domingo … 6 = sábado; al menos uno |
| `startDate`, `endDate` | fechas reales, fin no anterior al inicio, rango de hasta un año |
| `startTime`, `endTime` | `HH:MM` de 24 h, fin posterior al inicio |
| `venue` | `torneo` (todos en la sede del torneo, uno por horario) o `local` (cada uno en `"Cancha de <club local>"`, pueden jugar a la vez) |

6. **Duración de un horario** = `2 × minutesPerHalf + 10` minutos (60 si el torneo no lo definió). Los horarios de cada día empiezan en `startTime` y caben mientras terminen antes de `endTime`.
7. **El calendario es global entre fechas:** nunca se repite un horario en la misma sede ni se pone a un equipo a jugar dos veces a la misma hora, aunque dos fechas compartan rango.
8. Si una fecha no tiene horarios suficientes, el error (`400`) dice cuál (`matchday`), cuántos hacían falta y cuántos se pudieron ubicar, y **no se crea nada**.
9. La cantidad de configuraciones debe ser exactamente la de fechas del fixture.

## API

### `POST /api/tournaments/:id/fixture`
Lo hace el organizador del torneo. Cuerpo: `{ mode: "auto" | "manual", matchdays?, replace? }`.

| Caso | Respuesta |
|---|---|
| Torneo inexistente / no es tu torneo | `404` / `403` |
| `mode` inválido, o `auto` sin configuraciones válidas | `400` |
| Ya hay fixture y no se pidió `replace` | `409` |
| Ya hay partidos jugados, en juego o con jugadas | `409` |
| El torneo no está en `draft` o `inscripcion` | `409` |
| Faltan equipos (menos de 2, o menos de `minTeams`) o formato sin soporte | `409` |
| Éxito | `201 { mode, matchdays, matches }` |

- **`auto`:** los partidos quedan con día, hora y sede.
- **`manual`:** los cruces se crean **sin programar**: `time = ""`, `location = ""` y `date` provisoriamente la fecha de inicio del torneo.
- Todo se crea **en una transacción** y el torneo pasa a `en_curso`. Un error no deja nada a medias.
- `replace: true` vuelve a generar, pero solo si **ningún** partido empezó ni tiene jugadas.

### Llaves en una liga (`playoffTeams`)
**Estado:** ✅ implementada (observación de octubre 2026, ver [008](008-observaciones-octubre-2026.md)).

Una liga puede cerrar con un cuadro de eliminación entre los mejores de la tabla. El organizador lo configura en el paso *Bases* (campo `playoffTeams`: **2, 4, 8 o 16**; vacío = sin llaves). Siempre es potencia de 2, así el cuadro sale parejo y nadie pasa solo.

- **Cuándo se arma:** cuando **todos** los partidos de la liga (los no `decisive`) están finalizados. Antes, la pestaña *Llaves* explica cuántos partidos faltan. Se arma desde esa pestaña con `POST /api/tournaments/:id/fixture` y `{ mode: "bracket" }`.
- **Dos formas de cruzar** (decisión del usuario):
  - **Automática:** el mejor contra el peor — con 8, `1-8, 4-5, 2-7, 3-6`, de modo que los mejores solo se encuentran al final (`standardSeedOrder`, `seedLeagueBracket`).
  - **Manual:** el cuerpo trae `pairs: [[idA, idB], …]`, con los cruces de la primera ronda. Deben ser exactamente los clasificados, sin repetir equipo (`bracketOrderFromPairs`); si no, `400`.
- Quién clasifica sale de `computeStandings` sobre los partidos de la liga. **La tabla no cuenta los partidos del cuadro** (`GET .../standings` excluye los `decisive` en una liga): un resultado de semifinal no puede cambiar quién clasificó.
- **Estado del torneo:** al jugarse el último partido de la liga, el torneo **no** pasa a `finalizado` si tiene llaves y el cuadro aún no existe (misma regla que Copa). Al armar el cuadro vuelve a `en_curso`.
- **Rehacer:** `replace: true` reemplaza el cuadro mientras ningún partido suyo haya empezado (`409` si no). Con el cuadro armado, `PATCH` no deja cambiar `playoffTeams` (`409`).
- Cada partido del cuadro se crea **sin día ni hora** (`time = ""`), como el modo manual, y se programa uno por uno.
- Los partidos del cuadro son `decisive`: si siguen empatados, tiempo extra y penales ([007](007-fixture-eliminacion-copa-relampago.md)). Por eso, una liga con llaves también pide `extraTimeMinutes` en el asistente.
- Solo aplica a `liga`. Para grupos + llaves existe `copa`.
- **Pantallas:** paso *Bases* (selector Sin / 2 / 4 / 8 / 16), pestaña *Llaves* (`liga-bracket-builder.tsx`: Automático | Elegir los cruces, con vista previa), *Tabla* del organizador y *Resultados → Tabla* del fan, con la misma regla: los `playoffTeams` primeros en **verde** (clasifican) y el resto en **rojo** (no clasifican), con leyenda; sin descenso. Sin llaves (`playoffTeams` null) se conserva la marca anterior (1.º–2.º verde, 7.º en adelante rojo en el fan).
- **Pruebas:** `tests/unit/llaves-liga.test.mjs` (cruce mejor-contra-peor, cruces a mano). El armado por API se verificó a mano en auth-dev (automático, manual, `replace`, errores `400`/`409`); no hay prueba de integración todavía.

### `DELETE /api/tournaments/:id/fixture`
Borra los partidos y el torneo vuelve a `inscripcion` (se pueden agregar equipos otra vez). Mismas condiciones que `replace`; un torneo `finalizado` da `409`.

### `PATCH /api/matches/:id` (programación)
Acepta `date` (`YYYY-MM-DD`), `time` (`HH:MM`) y `location` (hasta 200).
- Solo mientras el partido está `programado` (`409` si no).
- **Choques (`409`):** otro partido del torneo el mismo día y hora con un mismo equipo o en la misma sede (si tiene sede). Un partido no choca consigo mismo.

## Pantallas
- **`/torneos/:id/iniciar`:** dos opciones. Si no se puede armar el fixture, en vez de los botones explica el motivo (ya empezó, formato sin soporte, faltan equipos, grupos sin asignar). La confirmación avisa cuántos equipos faltan para completar el cupo y que ya no se podrán agregar ni quitar.
  - *Automática:* lleva al formulario (`/fixture`); **el fixture se crea al pulsar Guardar**, no antes.
  - *Manual:* crea los cruces sin programar y lleva a `/manual`.
- **`/torneos/:id/fixture` (formulario):** una pestaña por fecha real (una liga de 4 equipos tiene 3). Las fechas que no se toquen **heredan la anterior una semana después**. Un error de la API lleva a la pestaña de la fecha que falló.
- **`/torneos/:id/manual`:** cruces por fecha, "Configurar" en cada partido y "Por definir" mientras no tenga hora.
- **`/torneos/:id/configurar/:matchId`:** día (calendario), hora, minuto y sede. Las sedes ofrecidas son la del torneo, la cancha del local y la que ya tenga el partido. Muestra el error de choque.
- **`/torneos/:id/partidos`:** el fixture por fecha; los partidos sin programar dicen "Por definir" (también en las pantallas de club y jugador).
- **Detalle del torneo:** botón **"Iniciar torneo"** con 2 equipos o más. En "Ver todos", el botón se habilita con 2 equipos o más.

## Limitaciones conocidas
- **Eliminación directa, copa y relámpago no tienen fixture.** Necesitan resolver empates sin penales y rondas que dependen de resultados anteriores (los partidos exigen dos equipos definidos).
- **Sin sorteo:** el orden es el de inscripción. **Una sola vuelta:** no hay "ida y vuelta".
- **En sede del torneo se juega de a un partido por horario:** no hay varias canchas simultáneas.
- **El modo manual solo programa día, hora y sede:** los cruces (quién juega contra quién) no se editan.
- **Regenerar o deshacer el fixture no tiene botón:** existe en la API (`replace`, `DELETE`), pero no en la pantalla.
- **Asignar grupos** (formato `grupos`) no tiene pantalla.
- El selector de hora de la pantalla ofrece minutos de 5 en 5; si una hora generada no lo es, se agrega como opción.
- Los botones "Compartir" del fixture no hacen nada.
- Las horas son **hora de reloj de la cancha, sin zona horaria**. La cuenta regresiva del partido usa la zona del navegador.
