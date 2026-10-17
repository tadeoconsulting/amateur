# 012 · Temporadas (formato "Liga 1": Apertura, Clausura y fase final)

**Estado:** ✅ **implementada (as-built), en tres entregas:** modelo y API (#134), pantallas del organizador (#135) y vistas públicas.
**Resuelve:** OBS-54 del board "[Amateur] Observaciones" (nuevo formato de torneo tipo Liga 1).
**Código (entrega 1):** `prisma/schema.prisma` (`Season`, `Tournament.seasonId`/`seasonStage`) y la migración `20261016034928_temporadas`; `src/_lib/season.ts` (lógica pura), `src/_lib/season-server.ts`, `src/_lib/scorers-server.ts` (goleadores compartidos con el torneo); `src/app/api/seasons/**`; y los bloqueos en `src/_lib/enrollment.ts`, `src/_lib/tournament-slug.ts`, `api/tournaments/[id]/route.ts` y `api/tournaments/[id]/teams/[clubId]/route.ts`.
**Código (entrega 2):** `(organizador)/torneos/page.tsx` (pestañas Torneos · Temporadas), `(organizador)/torneos/temporadas/` (`nueva/page.tsx`, `[id]/page.tsx`, `_components/seasons-list.tsx` y `season-ui.tsx`), el enlace a la temporada en `(organizador)/torneos/[id]/page.tsx`, `_lib/api.ts` (tipos y llamadas de temporadas) y `qualifyLabel` en `StandingsTable`.
**Código (entrega 3):** `_components/season-results.tsx` (pestañas de temporada en Tabla y Goleadores), `_components/season-public-view.tsx` y `_components/season-stages.tsx`, `app/[organizador]/[torneo]/page.tsx` (torneo o temporada), `_components/convocatoria-view.tsx` y `(organizador)/torneos/[id]/page.tsx` (las pestañas y el enlace a la temporada), `_lib/share-view.ts` (`&tabla=` y `&goleadores=`). Después: las mismas pestañas en las pantallas del club y del jugador.
**Pruebas:** `tests/unit/season.test.mjs` (22, unitarias), `tests/unit/share-view.test.mjs` (pestañas de temporada en la URL) y `tests/temporadas.test.mjs` (18, integración, incluida la edición). Las pantallas se verificaron a mano en el navegador (celular y escritorio) contra una base local.
**Toca:** [002](002-crear-torneo-y-equipos.md) (torneos del organizador), [003](003-fixture.md) (llaves en una liga), [004](004-partido-en-vivo.md) (tabla de posiciones), [007](007-fixture-eliminacion-copa-relampago.md) (cuadro de eliminación), [008](008-observaciones-octubre-2026.md) (`playoffTeams`, vistas compartibles), [009](009-jugadores-provisionales.md) (fichas de jugador), [modelo-de-datos.md](modelo-de-datos.md).

## Objetivo
Que un organizador arme una temporada al estilo de la Liga 1 peruana: dos torneos seguidos (Apertura y Clausura) jugados por los mismos equipos, cada uno con su campeón; una **tabla General** que suma los dos; y una **fase final** con los mejores de esa tabla para definir al campeón de la temporada.

## Decisiones (tomadas por el usuario, 2026-10-15)
1. **Torneos independientes agrupados en una Temporada**, no un solo torneo con fases. Cada fase es un torneo de verdad (con su fixture, su tabla, su URL y su estado) y la Temporada los reúne. Se descartó meter las fases dentro de un torneo porque el fixture, la tabla, los partidos y el estado `finalizado` se calculan por torneo: habría que tocar casi todo lo construido.
2. **La Temporada se arma sobre el primer torneo.** Se puede crear desde un torneo `liga` que ya existe ("Crear temporada con este torneo") o desde cero. Ese torneo es la **Apertura** y sus equipos son los de toda la temporada.
3. **Equipos fijos:** el Clausura tiene exactamente los mismos equipos que la Apertura. **Sin descensos ni ingresos.**
4. **Campeón de cada fase: por tabla o por llaves**, una de las dos. Por tabla, campeón es el primero; por llaves, se usan las llaves de liga que ya existen (`playoffTeams`, 008). No hay liguilla dentro de una fase.
5. **El Clausura repite el formato de la Apertura** (incluido "por tabla" o "por llaves").
6. **Fase final, una de tres** (se elige al crear la Temporada): **llaves** (eliminación directa), **liguilla** (todos contra todos entre los clasificados, gana el de más puntos) o **ninguna** (campeón de temporada = primero de la tabla General). Los clasificados salen **solo de la tabla General**.
7. **Tabla General:** suma de Apertura y Clausura, con la regla de siempre (victoria 3, empate 1, derrota 0; desempate por diferencia de gol y goles a favor).
8. **Las tablas se ven desde el inicio.** En Resultados → Tabla hay tres pestañas: **Apertura · Clausura · General temporada**. Hasta que exista el Clausura, la General muestra solo la Apertura.
9. **La Temporada tiene URL pública**, con la misma forma que un torneo.
10. **En la app del organizador, la Temporada vive dentro de Torneos**, con dos pestañas: **Torneos · Temporadas**. No va como un quinto botón de la barra porque se va a usar poco.

## Decisiones de detalle (confirmadas por el usuario, 2026-10-15)
| # | Pregunta | Decisión | Por qué |
|---|---|---|---|
| A | ¿Cuántos pueden clasificar a una fase final **por llaves**? | Solo **2, 4, 8 o 16**, como las llaves de liga, y nunca más que los equipos de la temporada | El cruce "mejor contra peor" (`seedLeagueBracket`) necesita un cuadro parejo. Con 6, `planBracket` da bye a los dos primeros pero cruza 3.º contra 4.º y 5.º contra 6.º, no 3.º contra 6.º. Permitir 6 exigiría una siembra nueva. |
| B | ¿Cuántos pueden clasificar a una **liguilla**? | **Cualquier número que elija el organizador** al configurar la temporada, desde **3** y nunca más que los equipos de la temporada | El usuario pidió que sea personalizado. El mínimo de 3 es porque con 2 sería un solo partido (para eso están las llaves). |
| C | ¿Cuándo se puede crear el Clausura? | **Solo con la Apertura `finalizado`** | Así se cumple solo la regla de "nunca partidos de las dos fases a la vez", y los equipos ya no cambian. |
| D | ¿Los goles de la fase final cuentan para el **goleador general**? | **Sí** | Es el goleador de la temporada, y la fase final es parte de ella. La **tabla** General, en cambio, no cuenta la fase final (decisión 6). |
| E | ¿Qué pasa si se elimina un torneo de una temporada? | **No se puede (409)** mientras esté en la temporada. Eliminar la Temporada la oculta y **desvincula** sus torneos; no los borra | Evita una General que pierda la mitad de los partidos sin aviso. |
| F | ¿Se puede crear una temporada con una Apertura ya en curso o terminada? | **Sí**, en cualquier estado, si es `liga`, no está eliminada y no pertenece a otra temporada | El caso real: el organizador ya tiene su "Apertura 2026" creada o jugándose. |
| G | Si se corrige un partido de Apertura o Clausura después de generar la fase final, ¿se recalcula? | **No, por ahora.** La fase final queda como se generó; la página de la Temporada avisa si la General ya no coincide con los clasificados | Es la misma regla que las llaves de liga (008) y evita reordenar un cuadro ya jugado. Se puede revisar en una versión posterior. |

## Cómo funciona
### Ciclo de una temporada
1. **Crear la Temporada:** nombre, Apertura (un torneo `liga`), tipo de fase final y cuántos clasifican (si no es "ninguna"). Se le asigna su slug público.
2. **Apertura:** se juega como cualquier liga, con o sin llaves. Su campeón es el primero de su tabla o el ganador de sus llaves.
3. **Crear el Clausura** (botón en la Temporada, con la Apertura `finalizado`): se crea un torneo `liga` que copia de la Apertura la configuración (modalidad, minutos por tiempo, `playoffTeams`, tiempo extra, bases, sede, categoría) y **los equipos**, en el mismo orden de inscripción. El organizador pone nombre y fecha de inicio (por omisión: "Clausura" + el año de la Apertura) y después genera el fixture como siempre. Nace en `inscripcion`, como un torneo nuevo del asistente, para que en su pantalla aparezca "Iniciar torneo" (lo mismo la fase final). Los equipos quedan **bloqueados**: inscribir o quitar uno devuelve `409`, y la pantalla del torneo no muestra "Quitar" ni "Agregar equipo".
4. **Generar la fase final** (botón en la Temporada, con el Clausura `finalizado`):
   - **Llaves:** se crea un torneo `eliminacion` con los N primeros de la General, cruzados mejor contra peor (`seedLeagueBracket`).
   - **Liguilla:** se crea un torneo `liga` sin llaves con los N primeros, inscritos en el orden de la General.
   - **Ninguna:** no se crea torneo; el campeón de temporada es el primero de la General.
5. **Campeón de temporada:** el ganador de la final (llaves), el primero de la liguilla, o el primero de la General (ninguna).

### Tabla General
- Equipos: los de la Apertura.
- Partidos: los `finalizado` de Apertura y Clausura que **no** son `decisive` (no cuentan las llaves de cada fase) y nunca los de la fase final.
- Cálculo: `computeStandings` (`_lib/standings.ts`), que ya es una función pura: se le pasan los partidos de los dos torneos juntos. No hace falta otra regla de puntos.

### Goleadores
- **Del torneo:** como hoy (`PlayerStats` por jugador y torneo).
- **General temporada:** suma de `PlayerStats` por jugador en los torneos de la temporada (incluida la fase final, decisión abierta D).
- Limitación: hay una ficha de jugador por club (`PlayerProfile @@unique([userId, clubId])`). Con los equipos fijos un jugador sigue en la misma ficha, pero si se pasa a otro club entre fases sus goles quedan en dos fichas. Con cuenta se pueden juntar por `userId`; un provisional (009) no.

## Modelo
```prisma
model Season {
  id          String    @id @default(cuid())
  name        String
  organizerId String
  // Segundo tramo de la URL pública, compartido con los torneos del organizador (ver "URL pública").
  slug        String
  finalFormat String    // "llaves" | "liguilla" | "ninguna"
  finalTeams  Int?      // cuántos clasifican de la General; null si finalFormat = "ninguna"
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  organizer   User         @relation(fields: [organizerId], references: [id])
  tournaments Tournament[]

  @@unique([organizerId, slug])
  @@index([organizerId])
}

model Tournament {
  // ...los campos que ya existen...
  seasonId    String?
  seasonStage String?   // "apertura" | "clausura" | "final"; null fuera de una temporada

  season Season? @relation(fields: [seasonId], references: [id], onDelete: SetNull)

  @@unique([seasonId, seasonStage]) // una sola Apertura, un solo Clausura y una sola fase final por temporada
}
```
- Como el resto, `finalFormat` y `seasonStage` son `String` validados en la API, no enums de base.
- El campeón de cada fase y el de la temporada **no se guardan**: se calculan de las tablas y del cuadro, igual que hoy el campeón de un torneo.
- Migración solo aditiva (una tabla y dos columnas opcionales): no toca datos existentes.

## URL pública
- La Temporada usa la misma forma que un torneo: `cupamateur.com/{organizador}/{temporada}`.
- Torneos y temporadas **comparten el espacio de nombres** del organizador: el generador de slugs (`newTournamentSlug` y uno nuevo para temporadas) revisa las dos tablas y agrega `-2`, `-3`... si ya existe. Los slugs que ya existen no cambian.
- La ruta `[organizador]/[torneo]` busca primero un torneo y, si no hay, una temporada.

## Pantallas
### Organizador
- **Torneos** (`/torneos`): dos pestañas, **Torneos · Temporadas** (`?tab=temporadas`, compartible). Temporadas lista las del organizador con su estado (En Apertura, En Clausura, Falta la fase final, En fase final, Terminada), sus etapas con el campeón de cada una y el botón **Crear temporada** (que reemplaza a "Crear torneo" en esa pestaña).
- **Crear temporada** (`/torneos/temporadas/nueva`, con `?apertura=<id>` preseleccionada): nombre, Apertura (sus `liga` sin temporada, en cualquier estado), tipo de fase final y cuántos clasifican. Las opciones de clasificados son las que acepta la API (`finalTeamsOptions`): llaves, 2/4/8/16 hasta el cupo; liguilla, de 3 al cupo.
- **Página del torneo:** si es una `liga` sin temporada, el enlace **Crear temporada con este torneo**. Si pertenece a una, "Apertura de Temporada 2026 · Ver temporada".
- **Página de la Temporada** (`/torneos/temporadas/[id]`): campeón de temporada, las etapas (cada una enlaza a su torneo) con su estado y campeón, el formulario de lo que toca (**Crear el Clausura** o **Generar la fase final**, con fecha de inicio y nombre opcional; al crearlo lleva al torneo nuevo) o qué falta para poder hacerlo, la tabla General (en vivo, con "Clasifica a la fase final"), el goleador general, el aviso de la decisión G y **Eliminar temporada** con confirmación.
- **Editar temporada** (`/torneos/temporadas/[id]/editar`, enlace bajo la cabecera de la Temporada): el nombre siempre (el slug no cambia); el tipo de fase final y cuántos clasifican, con las mismas opciones que al crearla, solo mientras no esté generada. Con la fase final generada, esa parte se muestra fija con su motivo. El tope de clasificados es el que valida la API: con el Clausura creado, los equipos de la temporada; antes, el cupo de la Apertura. El formulario de fase final es un componente compartido con "Crear temporada" (`_components/final-phase-fields.tsx`).

### Fan, organizador, club y jugador, dentro de cada torneo de la temporada
Un solo componente (`_components/season-results.tsx`: `SeasonTables` y `SeasonScorersTabs`) lo agrega a la página pública del torneo (`ConvocatoriaView`), a la del organizador, a la del club (`(club)/club/torneos/[id]`) y a la del jugador (`(jugador)/jugador/torneos/[id]`). Fuera de una temporada no cambia nada. La del jugador no tiene tiempo real (tampoco lo tenía antes), así que sus tablas de temporada se actualizan al volver a abrir la pestaña.
- **Tabla:** pestañas **Apertura · Clausura · General temporada**, abierta en la del propio torneo (que muestra la tabla de siempre). Antes de que exista el Clausura, su pestaña dice "El Clausura empieza cuando termine la Apertura". En la fase final: **Fase final · General temporada**; si la fase final es por llaves, en vez de tabla dice que los cruces están en el fixture.
- **Goleadores:** pestañas **Del torneo · General temporada**.
- Las tablas de las otras etapas y la General se actualizan en vivo junto con las del torneo.
- La pestaña elegida va en la URL, como el resto de la vista compartible (008): `&tabla=apertura|clausura|final|general` y `&goleadores=torneo|general` (`parseSeasonView`, `withSeasonView`), y el enlace de "Compartir" la conserva. Lo inválido se ignora.
- **Enlace a la Temporada:** en la pública, "Clausura de Temporada 2026 →" en la cabecera; en la del organizador, "Ver temporada".
- El Clausura y la fase final se muestran con **inscripciones cerradas** (sus equipos son fijos), aunque estén en `inscripcion`.
- En la pantalla del organizador, la tabla de un torneo de temporada sin llaves no marca clasificados ni descenso (en una temporada nadie desciende).

### Público, página de la Temporada (`/{organizador}/{temporada}`)
La ruta `[organizador]/[torneo]` busca primero un torneo y, si no hay, una temporada con ese tramo (`SeasonPublicView`). Muestra el estado, el campeón de la temporada, la tabla General (con "Clasifica a la fase final"), las etapas con su campeón y enlace a la página pública de cada torneo, y el goleador general. Los equipos enlazan a su página dentro de la Apertura.

## API
| Método y ruta | Qué hace | Quién |
|---|---|---|
| `POST /api/seasons` | Crea la Temporada con su Apertura (`{name, aperturaId, finalFormat, finalTeams}`) | Organizador dueño de la Apertura, admin |
| `GET /api/seasons?organizerId=` | Lista temporadas no eliminadas (como `GET /api/tournaments`, la lista es pública) | Público |
| `GET /api/seasons/:id` | Temporada con sus torneos, estado y campeones | Público |
| `PATCH /api/seasons/:id` | Nombre; tipo de fase final y clasificados solo antes de generarla (`409` después) | Organizador, admin |
| `DELETE /api/seasons/:id` | Borrado lógico; desvincula los torneos (decisión E) | Organizador, admin |
| `POST /api/seasons/:id/clausura` | Crea el Clausura (decisión C) | Organizador, admin |
| `POST /api/seasons/:id/final` | Genera la fase final | Organizador, admin |
| `GET /api/seasons/:id/standings` | Tabla General | Público |
| `GET /api/seasons/:id/scorers` | Goleador general | Público |

Reglas que se agregan a rutas existentes: inscribir o quitar equipos de un torneo de temporada (salvo la Apertura antes de crear el Clausura) devuelve `409`; eliminar un torneo de temporada devuelve `409` (decisión E).

## Pruebas (plan)
- **Unitarias:** tabla General (suma de dos torneos, excluye `decisive`, excluye la fase final, un torneo sin partidos), siembra de la fase final (llaves mejor contra peor con 2/4/8/16; liguilla en orden de la General), goleador general (suma por jugador), slug compartido entre torneos y temporadas, campeón de temporada en las tres variantes.
- **Integración:** crear temporada (Apertura válida, ya en otra temporada, no `liga`); crear el Clausura (Apertura sin terminar → `409`, copia de equipos y configuración); equipos bloqueados; generar la fase final (Clausura sin terminar → `409`, N clasificados correctos); eliminar un torneo de temporada → `409`; borrar la temporada desvincula.

## Entregas
1. **Modelo y API**, con sus pruebas.
2. **Pantallas del organizador:** pestañas en Torneos, crear temporada, página de la Temporada, Clausura y fase final.
3. **Vistas públicas:** pestañas de Tabla y Goleadores en cada torneo y la página pública de la Temporada.

## Limitaciones conocidas
- Sin descensos, ascensos ni cambios de equipos entre fases.
- Sin liguilla dentro de una fase: el campeón de una fase es por tabla o por llaves.
- La fase final no se recalcula si se corrige un partido después de generarla (decisión G).
- El goleador general se parte si un jugador cambia de club entre fases.
- Una temporada tiene exactamente dos fases antes de la final (Apertura y Clausura).
