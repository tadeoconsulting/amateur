# 015 · Gestión del club (cuotas, asistencia, sesiones y dashboard)

**Estado:** ✅ **Las cuatro entregas están implementadas** (ver las secciones *as-built*): Pagos, sesiones y asistencia, vista del jugador y dashboard. Quedan fuera los recordatorios (segunda entrega, decisión 10). Las decisiones y los supuestos S1 a S9 los confirmó el usuario el 2026-10-18.
**Código (entrega 1):** `prisma/schema.prisma` (`ClubFeeSettings`, `PlayerFeeSetting`, `MemberFee`, `FeePayment`) y la migración `20261018205051_gestion-pagos`; `src/_lib/club-fees.ts` (reglas puras), `src/_lib/club-fees-server.ts` (generar meses, ingreso al club), `src/_lib/club-gestion-guard.ts`, `src/_lib/club-fees-client.ts`; `src/app/api/clubs/[id]/gestion/**`; pantallas en `src/app/(club)/club/gestion/**` y la pestaña Gestión en `(club)/_components/club-bottom-nav.tsx`.
**Código (entrega 2):** migración `20261018212409_gestion-entrenamientos` (`TrainingPlace`, `TrainingSchedule`, `TrainingSession`, `Attendance`); `src/_lib/club-training.ts` (reglas puras), `src/_lib/club-training-server.ts` (generar sesiones, lista de jugadores), `src/_lib/club-training-client.ts`; `src/app/api/clubs/[id]/gestion/{lugares,horarios,sesiones,asistencia}/**`; pantallas en `src/app/(club)/club/gestion/{sesiones,asistencia}/**`.
**Código (entrega 3):** `src/_lib/player-club-progress-server.ts`, `src/app/api/me/club-progreso/route.ts`, `src/_lib/club-progress-client.ts`, `src/app/(jugador)/_components/my-club-card.tsx` y `src/app/(jugador)/jugador/mi-club/page.tsx`; `paymentProgress` en `club-fees.ts` y `playerAttendance` en `club-training.ts` (reglas puras).
**Código (entrega 4):** `src/_lib/club-dashboard-server.ts`, `src/app/api/clubs/[id]/gestion/dashboard/route.ts` y `src/app/(club)/club/gestion/dashboard/**` (página y `_components/charts.tsx`); `lastMonths`, `rankDelinquents`, `monthShort` y `niceMax` en `club-fees.ts`, y `weekStart`, `weeklyAttendanceTrend`, `sessionCounts` y `sessionPercent` en `club-training.ts` (reglas puras).
**Pruebas (entrega 4):** nuevas en los dos archivos unitarios y `tests/gestion-dashboard.test.mjs` (14, integración); pantallas y gráficos verificados en un navegador de celular (390 px) y de escritorio.
**Pruebas (entrega 3):** nuevas en `tests/unit/club-fees.test.mjs` y `club-training.test.mjs`, y `tests/gestion-jugador.test.mjs` (17, integración); pantallas verificadas en un navegador de celular (390 px) con la sesión de un jugador.
**Pruebas (entrega 2):** `tests/unit/club-training.test.mjs` (25) y `tests/gestion-entrenamientos.test.mjs` (26, integración); pantallas verificadas en un navegador de celular (390 px).
**Pruebas (entrega 1):** `tests/unit/club-fees.test.mjs` (31) y `tests/gestion-pagos.test.mjs` (23, integración). Las pantallas se verificaron en un navegador de celular (390 px) y de escritorio contra una base local.
**Origen:** pedido del usuario (2026-10-18): que el delegado controle a mano qué jugadores pagaron su mensualidad y quiénes asisten a los entrenamientos, y vea métricas de ambas cosas.
**Toca:** [001](001-autenticacion-y-permisos.md) (permisos del club), [014](014-co-delegados.md) (los co-delegados también gestionan), [005](005-invitaciones.md) (jugadores vinculados a un club), [009](009-jugadores-provisionales.md) (provisionales), [modelo-de-datos.md](modelo-de-datos.md).

## Objetivo
Que el delegado deje el cuaderno y el WhatsApp para llevar su club: cobrar la mensualidad con trazabilidad, pasar lista en el celular en segundos y ver cómo va su equipo. Que el jugador vinculado al club vea cuándo entrena y cómo va **él**: su asistencia y sus pagos.

Es **control manual**: la plataforma no cobra ni procesa dinero. El delegado registra lo que recibió fuera de ella (efectivo, Yape, transferencia).

## Decisiones (tomadas por el usuario, 2026-10-18)
| # | Tema | Decisión |
|---|---|---|
| 1 | Cuota | **Cuota estándar del club** (por ejemplo S/ 80). Cada jugador la hereda o tiene un **monto propio** (S/ 60, o S/ 0 = gratis). |
| 2 | Registro del pago | **Checklist por mes.** Se guarda el **monto** y la **fecha automática**. Sin campo de nota. |
| 3 | Pago parcial | **Sí.** Se puede cobrar menos que la cuota; el mes queda "parcial" con su saldo. |
| 4 | Meses | **Mes calendario, desde el mes en que el jugador entra al club.** Hay un día de vencimiento fijo por club. |
| 5 | Sesiones | **Horario semanal** (días, hora, duración, lugar) que **genera las sesiones**. Se pueden cancelar, mover o agregar una suelta. |
| 6 | Asistencia | **Presente / Ausente / Justificado.** Al abrir una sesión **todos aparecen sin marcar**; el delegado marca a cada uno. |
| 7 | Lugares | **Del club**, compartidos por el delegado principal y los co-delegados (Colegio Perú Suizo, Parque de las Américas…). |
| 8 | Visibilidad | **Los delegados ven todo.** **Cada jugador ve solo lo suyo**: su asistencia, su progreso de pagos y **el monto que debe**. La deuda de un jugador **nunca** es pública ni la ve otro jugador. |
| 9 | Sesiones para jugadores | Las sesiones de entrenamiento **se muestran a los jugadores vinculados al club**. |
| 10 | Avisos | **Segunda entrega.** Esta primera versión no manda recordatorios de cobro ni de entrenamiento. |
| 11 | Ubicación | **Pestaña propia "Gestión"** en la barra del club. |

### Supuestos (por confirmar; se tomaron por recomendación)
- **S1.** Si cambia la cuota estándar, **los meses ya generados conservan su monto**; el nuevo aplica desde el mes siguiente.
- **S2.** Todo cuelga de la **ficha del jugador en el club** (`PlayerProfile`), no de la persona. Si un jugador está en dos clubes, cada delegado ve solo lo suyo.
- **S3.** Los **provisionales** (sin cuenta) entran a cuotas y asistencia como cualquiera; no pueden "ver lo suyo" hasta tener cuenta.
- **S4.** **Pagos y asistencia los marcan solo los delegados** (principal y co-delegados). El DT y el asistente de la planilla siguen siendo informativos.
- **S5.** Cada **categoría** tiene su propio horario y su propia lista de asistencia.
- **S6.** La **justificada no baja el promedio** y la sesión **sin marcar no cuenta**.
- **S7.** El dashboard lleva las métricas de la sección *Dashboard*.
- **S8.** "Ajustes" pasa a un **ícono en el encabezado** para dejar lugar a "Gestión" en la barra inferior (hoy: Torneos, Jugadores, Equipo, Ajustes).
- **S9.** Zona horaria **Perú (UTC-5)**, igual que la mesa ([011](011-mesa.md)).

## Entrega 1 · Pagos, as-built
Lo que se construyó y en qué se aparta de la propuesta de abajo (que se conserva para las entregas siguientes):

- **Cuotas en tablas propias, no como columnas.** La cuota estándar vive en `ClubFeeSettings` (`monthlyFee`, `dueDay`) y el monto propio y el primer mes en `PlayerFeeSetting` (`monthlyFeeOverride`, `startMonth`, `clubId`). Varias rutas devuelven el club o la ficha enteros (una es pública: la tabla de posiciones usa `include: { club: true }`) y habrían filtrado las cuotas. Con tablas aparte no hay forma de que salgan por descuido, y una prueba (`ninguna lectura del club ni del jugador filtra cuotas`) lo vigila. Sin fila en `ClubFeeSettings` = todavía no hay cuota.
- **`MemberFee` es única por jugador, club y mes** (`playerId, clubId, month`), no solo por jugador y mes: una ficha libre que pasa a otro club no choca con los meses del club anterior.
- **Primer mes de cobro.** Al entrar a un club (enlace del club, invitación o `POST /api/clubs/:id/players`) se anota el mes de ingreso (`markFeeStart`). A quien ya estaba antes de existir esta función se le anota el mes en que aparece por primera vez en Pagos. El delegado puede cambiarlo desde el detalle del jugador. Una ficha que se reutiliza para otro club arranca de cero (`PlayerFeeSetting.clubId`).
- **No se generan meses sin cuota definida.** Con la cuota del club en 0 y sin montos propios no se crean cargos: si se crearan en 0 quedarían congelados cuando el delegado defina la cuota después.
- **Refinamiento de S1.** Cambiar la cuota **estándar** no toca ningún mes ya generado (como en S1). Cambiar el **monto propio de un jugador** sí ajusta su **mes en curso mientras no tenga abonos** (los anulados no cuentan); con un abono, ese mes se corrige a mano. Sin esto, configurar el club el primer día dejaba a cada jugador con S/ 80 aunque se le pusiera S/ 60 o gratis. La respuesta trae `adjustedCurrentMonth`.
- **Vencido** se devuelve como `overdue` aparte del estado (`pagado`, `parcial`, `pendiente`, `sin_cuota`); la pantalla muestra "Vencido" y, si es parcial, el saldo.
- **Un solo cobro por toque.** Marcar pagado lee el saldo con el mes bloqueado (`SELECT … FOR UPDATE`), así dos toques seguidos o dos delegados a la vez cobran una sola vez. Una prueba lo comprueba con cinco pedidos simultáneos.
- **Todos los importes se calculan en céntimos enteros** (`club-fees.ts`); la API y la base hablan en soles con dos decimales (tope de S/ 10 000).
- **Rutas** (todas bajo `/api/clubs/:id/gestion`, permiso de delegado principal, co-delegado o admin): `GET/PATCH ajustes`, `GET pagos?mes=AAAA-MM`, `PATCH jugadores/:playerId/cuota`, `GET jugadores/:playerId/historial`, `PATCH cargos/:feeId`, `POST cargos/:feeId/abonos`, `DELETE abonos/:paymentId`. Un jugador sin permiso recibe `403`; un cargo o abono de otro club, `404`.
- **Pantallas.** Pestaña **Gestión** en la barra inferior del club; **Ajustes** pasó a un ícono de engranaje en el encabezado de Torneos, Jugadores, Equipo y Gestión (en escritorio sigue en la barra superior). `/club/gestion` lista los módulos construidos (por ahora, Pagos). `/club/gestion/pagos`: mes con flechas, recaudado contra esperado, filtros *Todos / Por cobrar / Pagados*, checklist de un toque por jugador, y una hoja de detalle con la cuota propia, los meses, los abonos (también los anulados, con quién y cuándo) y las acciones de cobrar parcial, anular y corregir el monto del mes.
- **Fuera de esta entrega:** que el jugador vea lo suyo (entrega 3: `GET /api/me/club-progreso`), el dashboard (entrega 4) y los recordatorios (segunda entrega).

## Entrega 2 · Sesiones y asistencia, as-built
Lo que se construyó y en qué se aparta de la propuesta de abajo:

- **Lugares del club** (`TrainingPlace`): compartidos por el delegado principal y los co-delegados. Un lugar con horarios o sesiones **se archiva** (y sus horarios se desactivan, porque no pueden generar sesiones sin un lugar usable); uno sin uso se borra de verdad. No se repite un nombre (sin distinguir mayúsculas).
- **Horario semanal** (`TrainingSchedule`): día, hora de inicio (HH:MM, hora de Lima), duración (15 a 300 minutos), lugar y categoría. **La categoría es opcional: sin ella, el horario es de todo el club** (un club sin categorías creadas igual puede entrenar). No se repite el mismo día, hora y categoría. Quitar un horario lo desactiva.
- **Las sesiones se generan solas** (`TrainingSession`) para los próximos 28 días al abrir Sesiones o Asistencia, de forma idempotente (clave única horario + instante). Se generan también las de hoy que ya empezaron, para poder pasar lista de una de las 19:00 a las 21:00.
- **Editar un horario** rehace las sesiones que **todavía no empiezan, que nadie movió a mano y sin asistencia**. Lo pasado, lo que ya empezó, lo movido a mano y lo que tiene asistencia se queda como está (`movedManually`). Quitar un horario borra esas mismas sesiones y conserva el historial.
- **Sesión suelta, mover y cancelar.** Una suelta (sin horario) se puede crear en cualquier fecha, también pasada, para anotar un entrenamiento que ya ocurrió. Mover cambia solo esa sesión. **Cancelar** no se permite si ya tiene asistencia; una cancelada se puede restaurar. Una sesión suelta sin asistencia se puede borrar; una de un horario solo se cancela.
- **Pasar lista.** Al abrir una sesión **todos aparecen sin marcar** y solo los jugadores activos de su categoría (o de todo el club si no tiene), más quien ya tenga una marca en ella aunque haya salido o cambiado de categoría. El toque rota: sin marcar, presente, ausente, justificado, sin marcar. **Se guarda al instante, jugador por jugador**, y cada jugador encola sus toques en orden para que dos seguidos no se crucen; si falla, se avisa y se vuelve a leer del servidor. *Marcar los restantes como presentes* es un atajo opcional que solo toca a los que seguían sin marcar y nunca pisa lo marcado.
- **Refinamiento de la regla 18.** Una sesión de **hoy** se puede marcar aunque su hora no haya llegado (el delegado abre la lista un rato antes y no debería toparse con un bloqueo); una de un día que todavía no llega, no, y una cancelada, tampoco.
- **La regla 20 sale sola.** Como las sin marcar no cuentan, un jugador que entra a mitad de temporada no baja el promedio por las sesiones anteriores a menos que el delegado lo marque ausente.
- **Promedios** (`GET asistencia/resumen`, por omisión los últimos 90 días y con filtro por categoría y fechas): el del club y el de cada categoría promedian los porcentajes de sus sesiones **realizadas** (con al menos un presente o un ausente; una cancelada, una sin marcar o con solo justificadas no cuenta); el de cada jugador es presentes sobre presentes más ausentes, con los de menor asistencia primero. La función pura `attendanceSummary` queda lista para el dashboard (entrega 4).
- **Rutas** (todas bajo `/api/clubs/:id/gestion`, permiso de delegado principal, co-delegado o admin; el jugador no entra): `GET/POST lugares`, `PATCH/DELETE lugares/:placeId`, `GET/POST horarios`, `PATCH/DELETE horarios/:scheduleId`, `GET/POST sesiones`, `PATCH/DELETE sesiones/:sessionId`, `GET/POST sesiones/:sessionId/asistencia` y `PUT sesiones/:sessionId/asistencia/:playerId`, `GET asistencia/resumen`. Una sesión, lugar u horario de otro club da `404`.
- **Pantallas.** `/club/gestion` suma **Asistencia** y **Sesiones**. `/club/gestion/sesiones` tiene tres pestañas: *Calendario* (próximos 28 días y últimos 7, con *Pasar lista* y la hoja para mover o cancelar), *Horarios* y *Lugares*; si no hay ningún lugar pide agregar uno primero. `/club/gestion/asistencia` tiene *Sesiones* (para pasar lista) y *Promedios* (el del club, el de cada categoría y la lista por jugador). `/club/gestion/asistencia/:sessionId` es la lista: contador "12 de 18 marcados", un botón grande por jugador y el atajo opcional.
- **Fuera de esta entrega:** que el jugador vea sus sesiones y su asistencia (entrega 3), el dashboard (entrega 4) y los recordatorios (segunda entrega).

## Entrega 3 · Vista del jugador, as-built
Lo que se construyó y en qué se aparta de la propuesta de abajo:

- **Un solo endpoint, sin ningún id: `GET /api/me/club-progreso`.** Siempre es la ficha de quien tiene la sesión, así nadie puede pedir lo de otro jugador (una prueba le pasa `?playerId=` y `?userId=` de un compañero y comprueba que se ignoran). Sin sesión, `401`; sin club, `{ clubs: [] }`. La respuesta lleva `Cache-Control: private, no-store`.
- **Quién lo ve:** un jugador con una ficha **activa** en un club. Un jugador inactivo, un delegado que no es jugador de su club y quien no está en ningún club no ven nada. Con fichas en dos clubes ve cada uno por separado, y las cuotas de uno no pasan al otro.
- **Próximos entrenamientos.** Los de su categoría y los de todo el club (sin categoría), de hoy a 28 días, mientras no hayan terminado. **Las canceladas se ven como "Cancelado"**, para que no vaya. Muestra día, hora, duración, lugar y su dirección. Los horarios semanales llegan solos: la lectura del jugador también genera las sesiones que falten.
- **Mi asistencia** (últimos 90 días): sus presentes, ausentes y justificadas, su porcentaje (las justificadas y las sin marcar no cuentan) y sus últimos 8 entrenamientos realizados. Si a él no lo marcaron en una sesión en que sí se pasó lista, sale **"Sin registrar"**. De la base **solo se lee su propia marca**: las de sus compañeros no llegan ni al servidor de la respuesta.
- **Mis pagos:** el monto que debe (y de eso, lo ya vencido y en cuántos meses), el progreso de meses pagados sobre los exigibles (un mes sin cuota no cuenta), y sus últimos 12 meses con estado, saldo y la fecha del último pago. Un abono anulado vuelve a mostrarse como deuda. **No muestra quién cobró ni los abonos uno por uno**: eso es del delegado. La lectura genera solo **sus** meses (`ensureClubFees` con su ficha), sin tocar los de los demás.
- **Pantallas.** En **Actividad** aparece una tarjeta **Mi club** (para el equipo con el que sale hoy): próximo entrenamiento, asistencia y "Debes S/ X" o "Pagos al día". Lleva a `/jugador/mi-club`, con las tres secciones y, si tiene más de un club, un selector. Si el club no definió cuota, dice que todavía no registra cuotas y no inventa ninguna.
- **El jugador no puede cambiar nada** de esto ni leer lo del club: las rutas `/api/clubs/:id/gestion/**` siguen dando `403` a un jugador (pagos, asistencia, historial y su propia cuota). Una prueba lo recorre.
- **Fuera de esta entrega:** el dashboard del delegado (entrega 4) y los recordatorios (segunda entrega).

## Entrega 4 · Dashboard, as-built
Lo que se construyó y en qué se aparta de la propuesta de abajo:

- **Un endpoint, solo del delegado:** `GET /api/clubs/:id/gestion/dashboard?mes=AAAA-MM&categoria=ID` (principal, co-delegado o admin; el jugador recibe `403`, lo suyo está en `/api/me/club-progreso`). Sin `mes` es el mes en curso; un mes mal escrito o futuro, o una categoría de otro club, dan `400`. La respuesta es `private, no-store`.
- **Qué filtra cada cosa.** El **mes** y la **categoría** filtran todo, con dos excepciones pensadas: **los morosos son la deuda vencida a hoy** (no dependen del mes que se mira) y el **desglose de asistencia por categoría compara a todas** aunque se esté filtrando una. La categoría de un jugador es la de hoy.
- **Métricas:**
  - *Recaudado contra esperado del mes* (sobre las cuotas de ese mes, igual que en Pagos), con el conteo de pagados, parciales, pendientes, sin cuota y vencidos, y lo que falta cobrar. Con cuota del club sin definir, o sin cuotas ese mes, muestra "Sin cuotas" en vez de un 100 % falso.
  - *Cobro por mes*: los últimos 6 meses terminando en el elegido; un mes sin cuotas es un hueco, no un 0.
  - *Morosos*: de la mayor deuda vencida a la menor (`rankDelinquents`: monto, luego meses de atraso, luego nombre); los 8 primeros con el total y el monto por cobrar. Un jugador gratis o al día no aparece.
  - *Asistencia*: promedio del club y por categoría del mes (las mismas reglas de la entrega 2), los jugadores de menor asistencia (solo los que no llegan al 100 %) y la **tendencia semanal** de las últimas 12 semanas (lunes a domingo; una semana sin entrenamientos con asistencia es un hueco, no un 0).
  - *Entrenamientos del mes*: realizados (con alguna marca), cancelados, sin marcar (ya pasó o es hoy y nadie pasó lista) y próximos.
- **Gráficos hechos a mano en SVG, sin librerías, siguiendo la guía de visualización de datos:** una sola serie en un solo verde (`#009B5F`, validado a 3:1 contra el fondo; el verde de marca `#00CA81` se queda en 2:1), columnas de hasta 24 px con la punta redondeada y la base recta, línea de 2 px con puntos de 8 px y aro del color del fondo, rejilla de un pelo, el texto siempre con los tokens de texto, la leyenda solo donde hay dos lecturas (recaudado y esperado). **Tooltip al pasar, tocar o enfocar con el teclado** y **vista de tabla** en cada gráfico para quien no distingue colores. Las comparaciones por nombre (categorías y jugadores) son barras finas con el valor en la punta.
- **Pantalla:** `/club/gestion/dashboard` (primera entrada de Gestión). Filtros en una sola fila arriba (mes con flechas y categorías), una cifra grande (lo recaudado), dos chicas (asistencia y morosos) y las secciones de abajo. Cada sección vacía explica cómo llenarla (definir la cuota, pasar lista) con su botón; no hay datos inventados.
- **Sin migración:** todo se calcula con lo que ya existe.

## Cómo se ve (resumen)
```
Gestión (pestaña del club)
├── Pagos          checklist por mes · cuota estándar · monto propio por jugador
├── Asistencia     pasar lista de una sesión · promedios
├── Sesiones       horarios semanales · sesiones generadas · lugares
└── Dashboard      métricas de cobro y asistencia

Jugador (Mis equipos › su club)
└── Mi progreso    próximas sesiones · mi asistencia · mis pagos y lo que debo
```

## Reglas

### Cuotas
1. El club tiene una **cuota estándar** (`Club.monthlyFee`, en soles con dos decimales) y un **día de vencimiento** (`Club.feeDueDay`, 1 a 28; por defecto 5).
2. Cada jugador puede tener un **monto propio** (`PlayerProfile.monthlyFeeOverride`). Vacío = hereda la estándar. **0 = gratis**: sus meses nacen ya pagados, no cuentan como deuda y se muestran como "Sin cuota".
3. **Primer mes de cobro** (`PlayerProfile.feeStartMonth`, `AAAA-MM`): el mes en que se une al club. El delegado puede **editarlo** (por ejemplo, para no cobrar un mes de prueba).
4. **Los meses se generan solos** y de forma idempotente: al abrir *Pagos*, el servidor crea el cargo (`MemberFee`) de cada ficha activa para cada mes desde su primer mes de cobro hasta el actual. Cada cargo **guarda su monto** (`amountDue`) al crearse, así que cambiar la cuota o el monto propio después **no reescribe el pasado** (S1). El delegado puede corregir el monto de **un mes concreto**.
5. Un mes está **Pagado** cuando lo abonado es mayor o igual a lo que se debe; **Parcial** cuando hay algo abonado pero menos; **Pendiente** cuando no hay nada; **Vencido** si está Pendiente o Parcial y ya pasó el día de vencimiento de ese mes.
6. Un jugador que sale del club o pasa a inactivo **deja de generar cargos nuevos**; su historial se conserva.

### Pagos
7. **Marcar un mes como pagado** crea un abono (`FeePayment`) por **el saldo completo** y con **fecha y hora automáticas**. Para un pago menor, el delegado edita el monto antes de confirmar.
8. Se pueden registrar **varios abonos** a un mismo mes; el mes suma todos.
9. **Trazabilidad:** cada abono guarda quién lo registró (`createdById`) y cuándo. **No se borra**: deshacer lo marca como anulado (`voidedAt`, `voidedById`) y el mes vuelve a calcularse. El delegado ve el historial del mes.
10. No se pueden registrar abonos de más: el monto no supera el saldo del mes (sin saldo a favor en esta versión).

### Lugares y sesiones
11. Un **lugar** (`TrainingPlace`) pertenece al club: nombre y, opcional, dirección o referencia. Se crean, editan y archivan; uno archivado no se borra si ya tiene sesiones.
12. Un **horario** (`TrainingSchedule`) es: categoría, día de la semana, hora de inicio, duración en minutos y lugar. Un club tiene todos los que necesite (martes y jueves a las 19:00, sábado a las 9:00…).
13. Las **sesiones** (`TrainingSession`) se generan desde los horarios para las **próximas 4 semanas** y se completan al abrir *Sesiones*, sin duplicar (única por horario y fecha).
14. Una sesión se puede **cancelar** (queda visible como cancelada y no cuenta para promedios), **mover** (fecha, hora o lugar de esa sola vez) o crear **suelta** (sin horario). Editar un horario cambia solo las sesiones **futuras** que aún no se tocaron a mano.
15. El jugador **vinculado al club** (ficha activa) ve las sesiones de **su categoría**: día, hora, duración y lugar. Quien no está vinculado no ve nada.

### Asistencia
16. Al abrir una sesión, la lista trae a los jugadores activos de su categoría **sin marcar**. Cada toque cambia el estado: Presente → Ausente → Justificado → Sin marcar. Hay un botón para **marcar todos como presentes** como atajo opcional, no por defecto.
17. Se guarda al instante, jugador por jugador, para no perder lo marcado si se corta la conexión. Cada marca guarda quién la hizo y cuándo.
18. Una sesión pasa a **Realizada** cuando tiene al menos una marca. Una sesión futura no se puede marcar.
19. **Porcentaje de asistencia** de un jugador = presentes ÷ (presentes + ausentes) de las sesiones realizadas; las justificadas y las sin marcar **no cuentan** (S6). **Promedio del club o de una categoría** = promedio de esos porcentajes por sesión.
20. Un jugador que entra al club a mitad de temporada **solo cuenta desde su primera sesión** posible (la fecha en que se unió).

### Visibilidad y privacidad
21. **Delegados** (principal y co-delegados) y **admin**: ven y marcan todo del club.
22. **El jugador** ve **solo su ficha**: sus próximas sesiones, su porcentaje y su historial de asistencia, y sus meses con estado, abonos y **el monto que debe**. Nunca ve a otros jugadores, sus montos ni sus deudas.
23. **Nada de esto es público:** ni en la página pública del club, ni en las listas de jugadores, ni en los endpoints de lectura pública. El enmascarado de menores de [009](009-jugadores-provisionales.md) se mantiene.
24. Un jugador con **fichas en dos clubes** ve cada una por separado. Un delegado nunca ve los pagos de la ficha del otro club.

### Dashboard (solo delegados)
25. Métricas, filtrables por **mes** y por **categoría**:
    - **Recaudado vs. esperado** del mes (suma de abonos ÷ suma de cuotas exigibles), con su porcentaje.
    - **Cobro por mes**, últimos 6 meses.
    - **Morosos:** jugadores con meses vencidos, ordenados por monto adeudado y meses de atraso.
    - **Asistencia promedio** del club y por categoría.
    - **Asistencia por jugador**, con los de menor asistencia primero.
    - **Tendencia de asistencia** por semana o mes.
    - **Sesiones** realizadas, canceladas y sin marcar.

## Modelo de datos (propuesta)
`Club.ownerId` y `ClubDelegate` no cambian. Todo es nuevo o son columnas que se agregan.

```prisma
model Club {
  // ...
  monthlyFee  Decimal @default(0) @db.Decimal(10, 2)   // cuota estándar en soles
  feeDueDay   Int     @default(5)                      // día del mes en que vence (1 a 28)
  places      TrainingPlace[]
  schedules   TrainingSchedule[]
  sessions    TrainingSession[]
}

model PlayerProfile {
  // ...
  monthlyFeeOverride Decimal? @db.Decimal(10, 2)       // null = hereda la del club; 0 = gratis
  feeStartMonth      String?                           // "AAAA-MM": primer mes que se le cobra
  fees               MemberFee[]
  attendances        Attendance[]
}

// Un mes de un jugador en un club. Guarda lo que se debía al generarse.
model MemberFee {
  id         String   @id @default(cuid())
  playerId   String
  clubId     String
  month      String                       // "AAAA-MM"
  amountDue  Decimal  @db.Decimal(10, 2)
  createdAt  DateTime @default(now())

  player   PlayerProfile @relation(fields: [playerId], references: [id], onDelete: Cascade)
  club     Club          @relation(fields: [clubId], references: [id], onDelete: Cascade)
  payments FeePayment[]

  @@unique([playerId, month])
  @@index([clubId, month])
}

// Un abono. Nunca se borra: se anula.
model FeePayment {
  id         String    @id @default(cuid())
  feeId      String
  amount     Decimal   @db.Decimal(10, 2)
  paidAt     DateTime  @default(now())
  createdById String
  voidedAt   DateTime?
  voidedById String?

  fee MemberFee @relation(fields: [feeId], references: [id], onDelete: Cascade)
  @@index([feeId])
}

model TrainingPlace {
  id        String   @id @default(cuid())
  clubId    String
  name      String
  address   String?
  archivedAt DateTime?
  createdAt DateTime @default(now())

  club      Club @relation(fields: [clubId], references: [id], onDelete: Cascade)
  @@index([clubId])
}

model TrainingSchedule {
  id          String   @id @default(cuid())
  clubId      String
  categoryId  String
  weekday     Int                        // 0 (domingo) a 6 (sábado)
  startTime   String                     // "19:00", hora de Perú
  durationMin Int
  placeId     String
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())

  sessions TrainingSession[]
  @@index([clubId])
}

model TrainingSession {
  id          String   @id @default(cuid())
  clubId      String
  categoryId  String
  scheduleId  String?                    // null = sesión suelta
  startsAt    DateTime
  durationMin Int
  placeId     String
  status      String   @default("programada")   // programada | cancelada
  movedManually Boolean @default(false)

  attendances Attendance[]
  @@unique([scheduleId, startsAt])
  @@index([clubId, startsAt])
}

model Attendance {
  id         String   @id @default(cuid())
  sessionId  String
  playerId   String
  status     String                      // presente | ausente | justificado (sin fila = sin marcar)
  markedById String
  markedAt   DateTime @default(now())

  session TrainingSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  player  PlayerProfile   @relation(fields: [playerId], references: [id], onDelete: Cascade)
  @@unique([sessionId, playerId])
}
```
Todo importe se maneja como `Decimal`, nunca como `Float`. Es una migración nueva y **no se corre en paralelo desde dos chats contra la misma base** (CLAUDE.md).

## API (propuesta)
Todo bajo `/api/clubs/:id/gestion/*`, salvo lo del jugador. Permiso base: `canManageClub` (dueño, co-delegado o admin). Sin sesión `401`; sin permiso `403`.

| Método y ruta | Quién | Qué hace |
|---|---|---|
| `GET/PATCH /gestion/ajustes` | delegado | Cuota estándar y día de vencimiento |
| `GET /gestion/pagos?mes=AAAA-MM` | delegado | Lista de jugadores con su cargo, abonado, saldo y estado; genera los cargos que falten |
| `PATCH /gestion/jugadores/:playerId/cuota` | delegado | Monto propio y primer mes de cobro |
| `PATCH /gestion/cargos/:feeId` | delegado | Corrige el monto de un mes |
| `POST /gestion/cargos/:feeId/abonos` | delegado | Registra un abono (por defecto, el saldo) |
| `DELETE /gestion/abonos/:paymentId` | delegado | Anula un abono |
| `GET/POST/PATCH/DELETE /gestion/lugares` | delegado | Lugares del club |
| `GET/POST/PATCH/DELETE /gestion/horarios` | delegado | Horarios semanales |
| `GET /gestion/sesiones?desde=&hasta=` | delegado | Sesiones; completa las generadas |
| `POST/PATCH /gestion/sesiones` | delegado | Sesión suelta, cancelar o mover |
| `GET /gestion/sesiones/:id/asistencia` | delegado | Lista de la categoría con su marca |
| `PUT /gestion/sesiones/:id/asistencia/:playerId` | delegado | Marca o limpia a un jugador |
| `GET /gestion/dashboard?mes=&categoria=` | delegado | Métricas |
| `GET /api/me/club-progreso` | el jugador | Sus sesiones, su asistencia y sus pagos, por cada club donde tiene ficha |

## Pantallas (propuesta)
- **Barra del club:** Torneos · Jugadores · Equipo · **Gestión** (nueva). Ajustes pasa a un ícono en el encabezado (S8).
- **Gestión** abre con cuatro entradas: Pagos, Asistencia, Sesiones, Dashboard.
- **Pagos:** selector de mes arriba; lista de jugadores con su cuota, estado (Pagado, Parcial, Pendiente, Vencido, Sin cuota) y un **checkbox grande** a la derecha. Tocar el estado abre el detalle con abonos e historial. *Cuota del club* y *monto propio* se editan desde un ajuste de la pantalla y desde la ficha del jugador.
- **Asistencia:** sesión de hoy primero; lista de la categoría con tres botones por jugador y un contador "12 de 18 marcados". Optimizada para una mano en el celular.
- **Sesiones:** horarios (pestaña) y calendario de las próximas semanas (pestaña); **Lugares** como lista editable desde ahí.
- **Dashboard:** resumen arriba (recaudado vs. esperado, asistencia promedio, morosos) y detalle debajo, con gráficos legibles en celular.
- **Jugador:** en su perfil, la tarjeta **Mi club** con próxima sesión, **% de asistencia** y **progreso de pagos** (meses pagados de los exigibles y el monto que debe).

## Backlog

Prioridad con RICE (alcance en delegados por mes, impacto 0,25 a 3, confianza, esfuerzo en persona-semanas). Es una estimación gruesa para ordenar.

### Entrega 1 · Pagos
**H1 · Definir la cuota** · Perfil: Delegado · RICE ≈ (60×3×0,9)/1 = **162**
Como delegado, quiero definir una cuota estándar y un monto propio por jugador, para cobrar S/ 80 a la mayoría, S/ 60 a algunos y nada a otros.
- Dado un club con cuota estándar S/ 80, cuando agrego a un jugador, entonces su cuota es S/ 80.
- Dado un jugador con monto propio S/ 0, cuando se generan sus meses, entonces aparece como "Sin cuota" y no suma deuda.
- Dado que cambio la estándar a S/ 90, cuando miro un mes ya generado, entonces conserva S/ 80.

**H2 · Marcar pagos como checklist** · Delegado · RICE ≈ (60×3×0,9)/1,5 = **108**
Como delegado, quiero marcar quién pagó cada mes con un toque, para llevar el control sin papel.
- Dado un mes pendiente, cuando lo marco como pagado, entonces se guarda el monto de la cuota y la fecha de hoy.
- Dado un jugador que pagó S/ 40 de S/ 80, cuando registro S/ 40, entonces el mes queda "Parcial" con saldo S/ 40.
- Dado un abono equivocado, cuando lo anulo, entonces el mes vuelve a Pendiente y queda el rastro de quién lo anuló.
- Dado un abono mayor al saldo, cuando intento guardarlo, entonces se rechaza con un mensaje claro.

**H3 · Ver quién debe** · Delegado · RICE ≈ **72**
Como delegado, quiero ver los meses vencidos y lo que se debe por jugador, para saber a quién cobrar.
- Dado el día de vencimiento 5, cuando es el 6 y un jugador no pagó, entonces aparece "Vencido".
- Dado un jugador que entró en octubre, cuando miro septiembre, entonces no le aparece ese mes.

### Entrega 2 · Sesiones y asistencia
**H4 · Lugares y horarios** · Delegado · RICE ≈ **54**
Como delegado, quiero registrar mis lugares y mis horarios semanales, para no volver a crear cada entrenamiento.
- Dado un horario martes 19:00 de 90 minutos, cuando abro Sesiones, entonces veo las próximas 4 semanas ya creadas.
- Dado un lugar con sesiones, cuando intento borrarlo, entonces solo se archiva.
- Dado un co-delegado, cuando entra a Lugares, entonces ve los mismos del delegado principal.

**H5 · Pasar lista** · Delegado · RICE ≈ (60×3×0,8)/1,5 = **96**
Como delegado, quiero marcar la asistencia desde el celular, para saber quién viene.
- Dado una sesión de hoy, cuando la abro, entonces todos los jugadores de la categoría aparecen sin marcar.
- Dado que marco Ausente por error, cuando toco otra vez, entonces pasa a Justificado y luego a Sin marcar.
- Dado una sesión futura, cuando intento marcarla, entonces no se permite.
- Dado que se corta la conexión, cuando vuelvo, entonces lo ya marcado sigue guardado.

**H6 · Promedios de asistencia** · Delegado · RICE ≈ **48**
Como delegado, quiero el promedio total y el de cada jugador, para detectar quién falta.
- Dado un jugador con 8 presentes, 2 ausentes y 3 justificadas, cuando miro su promedio, entonces es 80 %.
- Dado una sesión cancelada, cuando calculo promedios, entonces no cuenta.

### Entrega 3 · Jugador
**H7 · Ver mis sesiones, mi asistencia y mis pagos** · Jugador · RICE ≈ **60**
Como jugador vinculado a un club, quiero ver cuándo entreno y cómo voy con mi asistencia y mis pagos, para estar al día.
- Dado un jugador activo de la categoría Sub-15, cuando abre Mi club, entonces ve las sesiones de Sub-15 con día, hora y lugar.
- Dado un jugador con dos meses vencidos, cuando abre Mis pagos, entonces ve el monto que debe y el progreso por mes.
- Dado otro jugador del mismo club, cuando consulta la API de pagos de su compañero, entonces recibe `403`.
- Dado un jugador que no está vinculado a ningún club, cuando abre su perfil, entonces no aparece la sección.

### Entrega 4 · Dashboard
**H8 · Métricas de gestión** · Delegado · RICE ≈ **36**
Como delegado, quiero un dashboard de cobro y asistencia, para decidir con datos.
- Dado un mes con S/ 1 200 esperados y S/ 900 cobrados, cuando abro el dashboard, entonces veo 75 % recaudado.
- Dado un club sin sesiones realizadas, cuando abro el dashboard, entonces veo un estado vacío que explica cómo empezar.
- Dado un filtro por categoría, cuando lo aplico, entonces todas las métricas se recalculan solo con esa categoría.

### Segunda entrega (fuera de este alcance)
Recordatorios de cobro y de entrenamiento por correo, WhatsApp o notificación; saldo a favor y pagos adelantados; exportar a hoja de cálculo; staff que pase lista.

## Orden recomendado
1. **Pagos** (H1 a H3): es el dolor más grande y se puede usar solo.
2. **Sesiones y asistencia** (H4 a H6).
3. **Vista del jugador** (H7): depende de las dos anteriores.
4. **Dashboard** (H8): necesita datos acumulados para tener sentido.

## Riesgos y decisiones abiertas
- **Dinero y privacidad:** se guarda información sensible de personas, algunas menores. Los endpoints del jugador se prueban con casos que fallen a propósito (leer la ficha de otro) y la deuda no puede filtrarse en ninguna lectura pública.
- **Hora de Perú:** la generación de sesiones y el "mes actual" se calculan en UTC-5, no en la hora del servidor.
- **Fichas en dos clubes:** al ir todo por ficha, el cambio de club no arrastra deuda (S2). Falta decidir si un jugador que sale debiendo se marca de alguna forma; por ahora, no.
- **Cuota estándar por categoría:** no entra. Si más adelante se necesita (Sub-15 paga distinto), se agrega `TeamCategory.monthlyFee` sin romper el modelo.
- **Nombres:** "Gestión" es el nombre de la pestaña; si se prefiere "Mi club", solo cambia el rótulo.
- **Pruebas necesarias:** reglas puras (estado de un mes, porcentaje de asistencia, generación de sesiones) con pruebas unitarias, y pruebas de integración de permisos (delegado, co-delegado, jugador, otro club, sin sesión).
