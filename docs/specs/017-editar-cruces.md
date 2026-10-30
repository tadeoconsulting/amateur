# 017 · Editar los cruces de un fixture armado

**Estado:** ✅ **Implementada** (octubre 2026). Las decisiones las tomó el usuario el 2026-10-30, respondiendo a las preguntas de diseño.
**Código:** `src/_lib/fixture-edit.ts` (lógica pura), `src/app/api/tournaments/[id]/fixture/cruces/route.ts`, pantalla `src/app/(organizador)/torneos/[id]/editar-cruces/**`; accesos desde `torneos/[id]/{manual,partidos}`.
**Pruebas:** `tests/unit/fixture-edit.test.mjs` (19) y `tests/editar-cruces.test.mjs` (13, integración); pantalla verificada en un navegador contra una base local (5 equipos, para ver también el descanso).
**Origen:** pedido del usuario: tras armar el fixture, poder **mover un partido a otra fecha** y **cambiar un equipo** sin cambiar la cantidad de partidos.
**Toca:** [003](003-fixture.md) (el fixture y su limitación "los cruces no se editan"), [001](001-autenticacion-y-permisos.md) (ruta nueva).

## Objetivo
Corregir un cruce sin rehacer el fixture. Con el modo manual (o el automático) los partidos quedan armados; ahora el organizador puede, por ejemplo, pasar Chilón FC–Sude de la Fecha 1 a la 2, o cambiar EJK por Chilón en Vista Alegre–EJK, y que el resto se reacomode sin perder ni sumar partidos.

## Decisiones (del usuario)
| # | Tema | Decisión |
|---|---|---|
| 1 | Regla de fondo | **Cada equipo juega una sola vez por fecha.** Con equipos impares, **descansa exactamente el que no juega** y la pantalla dice quién. Con equipos pares nadie descansa. |
| 2 | Cambiar un equipo | **Es un intercambio dentro de la misma fecha:** si el equipo que entra juega en otro partido de esa fecha, ese partido recibe al que salió; si descansa, pasa a descansar el que salió; si es el rival del mismo partido, se invierten local y visitante. |
| 3 | Mover de fecha | **Es un intercambio de dos partidos de fechas distintas.** Se elige el partido, la fecha destino y con cuál partido de esa fecha se intercambia. **El reacomodo es manual y guiado:** después del intercambio puede quedar un equipo dos veces en una fecha; la pantalla lo marca y **quien organiza define por qué equipo se cambia en los partidos afectados** hasta que todo cuadre. |
| 4 | Día, hora y sede | **Al mover de fecha, los dos partidos intercambian también su día, hora y sede** (el calendario real no se mueve). **Al cambiar un equipo, cada partido conserva el suyo.** |
| 5 | Alcance | **Cualquier liga o grupos**, hecha en modo manual o automático, mientras los partidos involucrados **no hayan empezado**. |
| S1 | Cruces repetidos | Si los mismos dos equipos acaban enfrentándose más de una vez, **se avisa pero no se bloquea** (supuesto: quien arma el fixture manda). |

## Reglas
- Un partido **bloqueado** (`locked`: ya empezó o tiene jugadas) cuenta para validar pero **no se mueve ni se le cambian los equipos**, ni se puede intercambiar con otro.
- Los partidos del cuadro de eliminación (`decisive`) no se editan a mano (igual que `PATCH /api/matches/:id`).
- En **grupos**, el cambio de equipo solo admite equipos del mismo grupo, y el intercambio de fechas es entre partidos del mismo grupo.
- **La cantidad de partidos por fecha (y grupo) nunca cambia.** Ambas operaciones son intercambios, así que se conserva.
- **Se guarda todo junto o nada.** Solo se puede guardar cuando **ningún equipo juega dos veces en una fecha**.
- Choques de horario: dos partidos el mismo día y hora (con hora definida) con un equipo en común o en la misma sede se rechazan. Un partido "Por definir" no choca.

## API
`/api/tournaments/:id/fixture/cruces`, solo el **organizador del torneo o un admin** (`401` sin sesión, `403` otro organizador, `404` torneo inexistente o eliminado).

| Ruta | Qué hace |
|---|---|
| `GET` | `{ matches, teams }`: los partidos editables de liga o grupos (id, fecha, grupo, local, visitante, día `YYYY-MM-DD`, hora, sede y `locked`) y los equipos para mostrar los nombres. |
| `PUT` | Cuerpo `{ matches: [{ id, matchday, homeTeamId, awayTeamId, date, time, location }] }` con **solo los que cambiaron**. Valida todo junto y guarda en una transacción. Devuelve `{ updated }`. |

Errores del `PUT`: `400` si el cuerpo está mal formado (fecha o hora inválidas, partidos repetidos, ids que no son de este fixture); `409` si no hay fixture que editar o si la edición rompe una regla (un equipo dos veces en una fecha, cambia la cantidad de partidos de una fecha, toca un partido que ya empezó, equipo de otro grupo, choque de horario). Sin cambios no escribe nada (`updated: 0`).

### El lápiz del partido (`PATCH /api/matches/:id`)
Esa ruta ya permitía cambiar los dos equipos de un partido que no empezó (el lápiz de cada partido en la pantalla del torneo, `match-editor.tsx`). **No comprobaba la regla de una vez por fecha**, y con ella se llegó a dejar a un equipo en dos partidos de la misma fecha (octubre 2026: Chilón FC y Las Lomas FC, cada uno dos veces en la Fecha 1 de *Liga 1 – Apertura 2026*, y el partido editado con día y hora mientras el otro seguía "Por definir"). Ahora:
- Si el cambio **mete a un equipo que ya juega en otro partido de esa misma fecha y grupo**, responde `409` con el nombre del equipo y la indicación de usar **«Editar cruces»**, que sí reacomoda el resto de la fecha.
- Solo cuentan los equipos que **entran** al partido. La pantalla manda siempre los dos equipos aunque solo cambie la hora, así que **reprogramar un partido no se bloquea** por un cruce repetido que ya venía de antes.
- Quedan fuera de esta regla `POST /api/matches` (agregar un partido suelto) y los fixtures ya guardados: un cruce repetido existente se **arregla con «Editar cruces»**, que lo marca en rojo y no deja guardar hasta resolverlo.

## Pantalla (`/torneos/:id/editar-cruces`)
Un borrador en pantalla que se guarda de una vez.
- Pestañas por **grupo** (si hay) y por **fecha**; una fecha con problemas lleva un punto rojo.
- Cada partido muestra **dos desplegables** (local y visitante) con los equipos del grupo; al elegir uno se aplica el intercambio de la regla 2. Los partidos tocados dicen "Modificado"; los bloqueados, "Ya empezó".
- **"Mover a otra fecha"** abre un panel: fecha destino, y la lista de partidos de esa fecha con su día y hora, **primero los que comparten un equipo** con el que se mueve (suelen dejar la fecha bien armada).
- Si un equipo queda dos veces en una fecha, una alerta roja arriba lo dice con un enlace a esa fecha, y **"Guardar cambios" queda deshabilitado**. Los cruces repetidos salen como aviso amarillo.
- Debajo de los partidos: **"Descansa: …"** con quién no juega esa fecha.
- Barra inferior fija: "Guardar cambios (N partidos)" y "Descartar".
- Accesos: botón **"Editar cruces"** en `/torneos/:id/manual` y en `/torneos/:id/partidos`, visible si hay partidos de liga o grupos.

## Fuera de alcance
- **Reacomodo automático** al mover de fecha (se evaluó una cadena mínima con vista previa; el usuario prefirió el modo manual guiado).
- **Agregar o quitar partidos**, o cambiar a un equipo de grupo.
- **Cuadros de eliminación** (se programan uno por uno como siempre).
- Deshacer después de guardar (se puede volver a editar).
- Avisar a los delegados y jugadores de los cambios.
