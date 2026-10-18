# 015 · Gestión del club (cuotas, asistencia, sesiones y dashboard)

**Estado:** 📝 **propuesta, sin implementar.** Las decisiones de abajo las tomó el usuario el 2026-10-18; los **supuestos** están marcados para confirmar antes de programar.
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
