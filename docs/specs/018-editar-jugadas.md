# 018 · Editar una jugada ya registrada

**Estado:** ✅ **Implementada** (noviembre 2026). Las decisiones las tomó el usuario el 2026-10-31.
**Código:** `src/_lib/event-edit.ts` (lógica pura), `src/app/api/matches/[id]/events/[eventId]/route.ts` (`PATCH` y `DELETE`), hoja `src/app/(organizador)/torneos/[id]/en-vivo/[matchId]/_components/edit-event-sheet.tsx` y su uso en la pantalla en vivo (`…/en-vivo/[matchId]/page.tsx`, que la mesa reutiliza desde `/mesa`).
**Pruebas:** `tests/unit/event-edit.test.mjs` (10) y `tests/editar-jugadas.test.mjs` (13, integración, incluye a la mesa); pantalla verificada en un navegador de celular (390 px): cambiar el jugador conservando el minuto, eliminar con confirmación y el partido finalizado.
**Origen:** pedido del usuario para el perfil **mesa**: al editar un gol no debe perderse el minuto en que se registró; debe poder **eliminarlo** (se borra todo) o **asignar o cambiar el jugador**.
**Toca:** [004](004-partido-en-vivo.md) (jugadas, deshacer), [011](011-mesa.md) (qué puede hacer la mesa), [001](001-autenticacion-y-permisos.md) (rutas).

## Objetivo
Antes, para corregir un goleador mal elegido había que **deshacer el gol y registrarlo de nuevo**, y el gol nuevo salía con el minuto del reloj de ese momento: se perdía cuándo ocurrió de verdad. Ahora se corrige la jugada **en su lugar**.

## Decisiones (del usuario)
| # | Tema | Decisión |
|---|---|---|
| 1 | Qué se puede hacer | Con una jugada ya registrada: **cambiar o asignar el jugador**, **corregir el minuto** y **eliminarla** (se borra todo: la jugada, su efecto en el marcador y en las estadísticas). |
| 2 | Qué jugadas | **Goles y tarjetas** (amarilla y roja). Un **penal convertido** cuenta como gol y se incluye. Quedan fuera los cambios (tienen dos jugadores), los penales errados o atajados y los intentos de la tanda: de esos solo se corrige el minuto o se deshacen, como antes. |
| 3 | Cuándo | **En juego y también con el partido finalizado**, sin reabrirlo. La **mesa**, solo dentro de su horario (`fuera_de_horario` si no): la misma ventana de siempre ([011](011-mesa.md)); **no puede reabrir** un partido. |
| S1 | Jugador | Tiene que ser **del equipo de la jugada** (igual que al registrarla). Se puede dejar la jugada **sin jugador** (`null`): se le resta al anterior y no se le suma a nadie. |
| S2 | Eliminar tras finalizar | Solo si el partido **no es decisivo**: en un cuadro de eliminación el marcador define quién avanza, y eso se corrige reabriendo el partido (`409`). Cambiar el jugador o el minuto no afecta el marcador, así que sí se permite también ahí. |
| S3 | Auditoría | Sigue figurando **quién la registró**; no se guarda quién la editó después. |

## Reglas
- **El minuto original se conserva** salvo que se mande uno nuevo (entero de 0 a 200, igual que al registrar).
- Al cambiar el jugador, la estadística que cuenta la jugada (**goles**, **amarillas** o **rojas**) **pasa del anterior al nuevo**, de forma atómica con el cambio, sin bajar de 0. El **marcador no se toca**.
- Un cambio, un penal errado o la tanda **no** admiten cambiar el jugador (`400`).
- Todo se publica en tiempo real como cualquier otra jugada.

## API
`/api/matches/:id/events/:eventId`; pasa por `matchAccess`: organizador del torneo, admin y la mesa asignada **con su ventana abierta**.

| Ruta | Qué hace |
|---|---|
| `PATCH` | Cuerpo `{ minute?, playerId? }`, al menos uno. `playerId` es un id de jugador del equipo, o `null`. Devuelve la jugada. `400` si el cuerpo es inválido, si el jugador no es del equipo o si la jugada no admite cambiar el jugador; `404` si no existe; `409` si el partido todavía no empezó. |
| `DELETE` | Borra la jugada y revierte marcador y estadísticas. `409` si el partido no empezó, o si está finalizado y es decisivo (hay que reabrirlo). |

## Pantalla
En la crónica del partido en vivo (la del organizador y la de la mesa), cada **gol y tarjeta** tiene un botón **«Editar»** sobre «Deshacer»; con el partido finalizado queda solo «Editar». Abre una hoja inferior **«Editar gol»** (o «tarjeta amarilla», «tarjeta roja», «penal convertido»):
- **Minuto**, con el original ya escrito.
- **Jugador**, un desplegable con "Sin jugador" y el plantel del equipo (`#9 Nombre Apellido`), con una nota de que el minuto no cambia al elegir otro.
- **Guardar cambios** (deshabilitado hasta que algo cambia), **Cancelar** y **Eliminar gol**, que pide confirmación ("¿Eliminar este gol? Se borra la jugada y se quita del marcador y de las estadísticas del jugador").
- Un error del servidor (por ejemplo, fuera de horario) se muestra dentro de la hoja.

El toque sobre el minuto en la crónica y «Deshacer» siguen como antes, mientras el partido está en juego.

## Fuera de alcance
- Cambiar el **equipo** de una jugada (por ejemplo un autogol) o su **tipo** (de amarilla a roja).
- Editar **cambios** (quién sale y quién entra) y los **intentos de la tanda de penales**.
- Historial de ediciones o aviso a los equipos.
