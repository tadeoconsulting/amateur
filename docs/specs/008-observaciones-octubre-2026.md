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

## 7 · Tabla del fan con clasificados (seguimiento)
Pedido posterior (2026-10-08): en una liga con llaves, la tabla que ve el fan (`/{organizador}/{torneo}` → Resultados → Tabla) marca del 1.º al N.º con círculo verde (clasifica) y del N+1 en adelante con rojo (no clasifica), con leyenda "Clasifica a las llaves (los N primeros)" / "No clasifica". La tabla del organizador sigue la misma regla. El N es `playoffTeams`: **si el organizador no lo configuró (Editar torneo → Bases → Equipos que clasifican a las llaves → Guardar cambios), la tabla no puede marcarlo**. Código: `_components/convocatoria-view.tsx`, `(organizador)/torneos/[id]/page.tsx`.

## 8 · Dashboard del organizador sin "Próximos partidos"
Pedido posterior (2026-10-08): el dashboard (`/dashboard`) ya no muestra la sección *Próximos partidos*, porque esa información vive en **Partidos** ([punto 2](#2--partidos-por-torneo-y-por-fecha-partidos)). Quedan *Indicadores*, *Solicitudes pendientes* y *Goleadores*. Código: `(organizador)/dashboard/page.tsx`.

## 9 · Vista del jugador igual a la del fan y el club
Pedido posterior (2026-10-08, `/jugador/torneos/{id}`): la vista del jugador tenía su propia lista de partidos (por día, sin fechas ni rondas), tabla y goleadores con otro formato. Ahora las tres vistas (fan, jugador y club) usan los mismos componentes:
- **Partidos:** `FixtureTabs` — tabs `Fecha N` (con sub-grupos por grupo) y, después, una tab por **ronda del cuadro** (Octavos, Cuartos, Semifinales, Final). Antes los partidos del cuadro compartían la tab "Fecha 1" con los de la liga o los grupos porque en ellos `matchday` es la ronda; esto afectaba también al organizador y al club en Copa y en liga con llaves.
- **Tabla y Goleadores:** `_components/tournament-results.tsx` (`StandingsTable`, `ScorersList`), con la regla de clasificados en verde y no clasificados en rojo (ver [003](003-fixture.md)). El club tenía una copia con la marca fija anterior y ahora también respeta las llaves.
- Se mantiene la pestaña **Llaves** del jugador.

## 10 · Foto del torneo (organizador y admin)
Pedido posterior (2026-10-08): el organizador debe poder subir la foto del torneo que creó, como se hace desde el panel de admin con las imágenes de equipos y jugadores.
- **Modelo:** `Tournament.logoUrl String?`. Validación: `null` o URL `https` de hasta 500 caracteres (`parseTournamentFields`).
- **Subida:** `TournamentPhotoField` (recorte circular + `/api/upload`) en el paso *Información* del asistente (crear y editar) y en el formulario del torneo del admin.
- **Dónde se ve:** cabecera del fan (`/{organizador}/{torneo}`), cabecera y lista de torneos del organizador, selector del jugador, listas del club (*Mis torneos*, solicitudes, buscar torneos y detalle) y lista de torneos del jugador. Sin foto, el trofeo de siempre. Para esto `GET /api/matches` y `GET /api/tournament-requests/mine` devuelven `logoUrl` del torneo.
- **Verificado:** la subida real del archivo se probó en producción (2026-10-08).
- **Despliegue:** columna nueva; agregarla a producción **antes** de mergear:
```sql
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
```

## 11 · Referencia Premier League: fixture (Fase 1)
Pedido posterior (2026-10-09): usar la página de partidos de la Premier League como **referencia** (no copiar su estética ni crear componentes paralelos) para adaptar nuestro fixture, siguiendo las reglas de UI Pro Max. Análisis: una fecha a la vez con navegador y rango de días, secciones por día, una sola fila de partido con tres estados, filtros en una barra, URL por fecha, ficha del partido con forma de los equipos. Se entrega por fases, cada una con su aprobación.

**Fase 1 (`FixtureTabs`, usado por fan, jugador, club y organizador):**
- **Secciones por día** ("Sáb 10 Oct") dentro de cada fecha, con los partidos del día por hora; los que no tienen día y hora van al final en "Por definir". Antes: una caja por grupo y el día repetido en cada fila.
- **Pestañas de fecha como siempre** (ahora `role="tablist"`, de al menos 44 px de alto). Con muchas fechas la barra se desplaza y la elegida —al abrir, la actual— queda centrada. Se probó un navegador con flechas desde 5 fechas y se descartó por decisión del usuario: se prefieren las pestañas.
- **Se abre en la fecha actual:** la primera con partidos sin terminar (o la última si ya terminó todo). Con el cuadro armado y la liga terminada, cae en el cuadro.
- **`MatchRow`** (`_components/match-row.tsx`): la fila única del partido — hora, "En vivo", "Final" (antes "Finalizado") o "Por definir" — con el nombre del grupo cuando lo hay. Mantiene el enlace, el resaltado del club y el botón de editar del organizador.
- **Pestañas secundarias con un solo estilo** (`_components/pill-tabs.tsx`, `PillTabs`): las fechas del fixture, *Tabla / Goleadores* de Resultados (fan y club) y *Partidos / Amonestados / Inscritos* y *Tabla / Goleadores / Compartir* del torneo del club usan la misma píldora. Antes eran pestañas subrayadas distintas. Pendiente de unificar en otras pantallas del club (`/club/torneos`, `/club/equipo`, `/club/jugadores`).
- Lógica pura y probada en `_lib/fixture.ts` (`buildFixtureTabs`, `currentTabKey`, `groupByDay`); `tests/unit/fixture-view.test.mjs`.
- **Accesibilidad:** objetivos táctiles de al menos 44 px, foco visible, anuncio del cambio de fecha (`aria-live`) y la animación de "En vivo" respeta `prefers-reduced-motion`.

**Pendiente:** Fase 2 (ficha del partido con cabecera por colores del club y "forma del equipo", últimos 5) y Fase 3 (agregar al calendario y URL por fecha). La barra de filtros de `/partidos` del organizador se alinea con este patrón en la Fase 1b.

## Verificación en producción (2026-10-08)
Tras mergear #83–#86 y agregar las columnas (`deletedAt`, `playoffTeams`):
- Inicio, `/admin/login` y `/api/tournaments`: 200. Sin errores nuevos en los logs de Vercel.
- Los tres torneos reales (Segunda División FPF Chiclayo, Clausura 2026, Copa Comunidad): página pública, detalle y tabla de posiciones en 200, con `deletedAt` y `playoffTeams` vacíos (no cambió su comportamiento).
- Incidente: entre el despliegue de #85 (21:20 UTC) y la creación de `deletedAt` (~21:33 UTC) la API de torneos respondió 500 (ver "Despliegue").
- **No se probó en producción** el armado de llaves ni la restauración de torneos eliminados: harían falta datos de prueba en la base real. Se probaron en la base de desarrollo.

## Limitaciones conocidas
- Las llaves de una liga **no tienen vista pública** para el fan (solo la pestaña del organizador).
- No hay prueba de integración del armado de llaves de liga (verificado a mano y con pruebas unitarias de la lógica).
- Reabrir un partido de la liga con el cuadro ya armado no recalcula quién clasificó: el cuadro queda como se armó.
- Cambiar `playoffTeams` desde el panel de admin no está en su formulario (se hace desde la edición del organizador).
