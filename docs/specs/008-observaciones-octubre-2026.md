# 008 · Observaciones de octubre 2026

**Estado:** ✅ implementada (as-built). Entregada en cuatro PRs: #83, #84, #85 y #86.
**Origen:** `Observaciones Amateur(Octubre).csv`: seis observaciones de dos perfiles (organizador y administrador) tras probar la plataforma.
**Toca:** [002](002-crear-torneo-y-equipos.md) (editar por pestañas, sedes), [003](003-fixture.md) (llaves en una liga), [007](007-fixture-eliminacion-copa-relampago.md) (los partidos del cuadro), [modelo-de-datos.md](modelo-de-datos.md) (`playoffTeams`, `deletedAt`).

## Resumen

| # | Quién | Dónde | Observación | Qué se hizo | PR |
|---|---|---|---|---|---|
| 1 y 3 | Organizador | Fixture / Resultados | "No tenemos cómo definir las llaves" | Llaves para `liga`: cuántos clasifican (2/4/8/16) y cruces automáticos o a mano | #86 |
| 2 | Organizador | Partidos | Un solo listado grande; debe categorizarse por torneos y fechas | `/partidos` por torneo y por fecha | #84 |
| 4 | Organizador | Editar torneo | Quitar el paso a paso y las insignias; navegar entre las 3 pestañas | Edición por pestañas | #83 |
| 5 | Organizador | Sedes | Renombrar una sede debe reflejarse en torneos y en las vistas de jugador, club y fan | La edición de una sede se propaga | #83 |
| 6 | Administrador | Torneos | Eliminar pierde información: hace falta una sección de eliminados para ver y habilitar | Borrado lógico con *Eliminados* y *Restaurar* | #85 |

## Decisiones (tomadas por el usuario antes de implementar)
1. **Cuántos clasifican a llaves:** solo **2, 4, 8 o 16** (potencias de 2: cuadro parejo, sin equipos que pasan solos). Sin llaves sigue siendo una opción.
2. **Cómo se cruzan:** **dos opciones** — automática (**el mejor contra el peor**) y definida manualmente por el organizador.
3. **Torneos eliminados:** **se ocultan y el admin los restaura**; no se borran.
4. Llaves solo en `liga`; para grupos con llaves ya existe `copa` (007). Pendiente de confirmar si `grupos` (formato legado) también debe tenerlas.

## 1 y 3 · Llaves para liga
Detalle de reglas y API en [003 · Llaves en una liga](003-fixture.md). Cambios:
- **Modelo:** `Tournament.playoffTeams Int?` (null = sin llaves). Validación en `parseTournamentFields` (2/4/8/16) y regla en `PATCH` (solo `liga`; `409` si ya hay cuadro y se intenta cambiar).
- **Lógica pura** (`_lib/fixture.ts`): `PLAYOFF_SIZES`, `isPlayoffSize`, `playoffLabel`, `standardSeedOrder`, `seedLeagueBracket`, `bracketOrderFromPairs`.
- **API:** `POST /fixture {mode:"bracket"[, pairs]}` en una liga terminada; helper compartido `createBracketMatches` (también lo usa Copa).
- **Tabla:** `GET .../standings` no cuenta los partidos `decisive` en una liga; la liga con llaves no pasa a `finalizado` hasta jugarse el cuadro (`PATCH /api/matches/:id`).
- **Pantallas:** paso *Bases* (selector de llaves y tiempo extra si hay llaves), pestaña *Llaves* (armado automático/manual) y leyenda de la *Tabla* ("Clasifica a las llaves", sin descenso).

## 2 · Partidos por torneo y por fecha (`/partidos`)
- Lista solo los partidos **del organizador** (`getTournaments({organizerId})`, `getMatches({organizerId})`).
- **Chips de torneo** (Todos + uno por torneo) y pestañas **Próximos · En vivo · Finalizados** (`role="tablist"`), con contadores.
- Dentro de cada torneo, los partidos se agrupan por **fecha** (`Fecha N`, según `matchday`) en secciones plegables (`FechaGrupo`, `<details>`), con el rango de días de cada una; la primera viene abierta.
- El filtro vive en la URL (`?torneo=&estado=`): se puede compartir y sobrevive a recargar.
- Sin programar se muestra "Por definir" (`time = ""`).

## 4 · Editar el torneo por pestañas
Ver [002 · Editar un torneo](002-crear-torneo-y-equipos.md). Tres pestañas navegables (Información, Modalidad, Bases), un solo "Guardar cambios", "Volver al torneo". Código: `crear-torneo/_components/{edit-tabs,use-edit-save,save-tournament}`.

## 5 · Renombrar una sede se propaga
- La sede es **texto** (`"Nombre, dirección"`, `_lib/sede-text.ts`), copiado en `Tournament.location` y `Match.location`.
- `PATCH /api/sedes/:id` calcula el texto anterior y el nuevo y actualiza (`updateMany`) los torneos del organizador y sus partidos que tenían exactamente el texto anterior. Como todas las vistas leen esos campos, jugador, club y fan lo ven de inmediato.
- Un partido con una sede escrita a mano (distinta del texto anterior) no se toca.
- **Prueba:** `tests/unit/sede-text.test.mjs`.

## 6 · Torneos eliminados recuperables (admin)
- **Modelo:** `Tournament.deletedAt DateTime?`. Eliminar un torneo ahora lo **marca**; no borra partidos, equipos ni estadísticas.
- **Visibilidad:** un torneo eliminado no aparece en listas, convocatoria pública, "mis solicitudes", estadísticas del admin ni en su URL pública; `canManageTournament` lo rechaza a no-admins. Solo el admin lo ve.
- **Panel de admin (`/admin/torneos`):** pestañas **Activos / Eliminados**. En *Eliminados*: ver datos y **Restaurar** (`POST /api/tournaments/:id/restore`) o **Eliminar definitivamente** (`DELETE ?permanent=1`, con confirmación escrita).
- Borrar definitivamente un club o un usuario con torneos eliminados los tiene en cuenta (`_lib/delete-user.ts`, `DELETE /api/clubs/:id`).

## Despliegue
**Regla:** una columna nueva se agrega a la base de producción **antes** de mergear el PR que la usa. Prisma pide todas las columnas del modelo en cada consulta: si el código llega primero, falla toda consulta de ese modelo. Pasó el 2026-10-08: #85 se desplegó a las 21:20 UTC sin `deletedAt` y `/api/tournaments` respondió 500 hasta ~21:33 UTC, cuando se agregó la columna (ver `P2022` en los logs de Vercel).

Dos columnas nuevas, ambas opcionales (no tocan datos existentes). Hay que aplicarlas en **producción antes** de desplegar #85 y #86; las pruebas se hicieron en la base de desarrollo (auth-dev).
```sql
ALTER TABLE "Tournament" ADD COLUMN "deletedAt" TIMESTAMP(3);    -- #85
ALTER TABLE "Tournament" ADD COLUMN "playoffTeams" INTEGER;      -- #86
```

## Limitaciones conocidas
- Las llaves de una liga **no tienen vista pública** para el fan (solo la pestaña del organizador).
- No hay prueba de integración del armado de llaves de liga (verificado a mano y con pruebas unitarias de la lógica).
- Reabrir un partido de la liga con el cuadro ya armado no recalcula quién clasificó: el cuadro queda como se armó.
- Cambiar `playoffTeams` desde el panel de admin no está en su formulario (se hace desde la edición del organizador).
