# 006 · Solicitudes e invitaciones de equipos a un torneo

**Estado:** implementada (as-built). API y pruebas verificadas; pantallas verificadas en el navegador solo donde se indica en "Limitaciones".
**Escrita como propuesta y luego implementada:** las decisiones A–E adoptaron las recomendaciones de la propuesta; **siguen pendientes de confirmación explícita** (ver más abajo).
**Código:** `src/_lib/tournament-request.ts` (reglas puras), `src/_lib/enrollment.ts` (bloqueo del torneo), `src/app/api/tournaments/[id]/requests/route.ts`, `src/app/api/tournament-requests/mine/route.ts`, `src/app/api/tournament-requests/[id]/[action]/route.ts`, `src/app/api/tournaments/[id]/teams/route.ts`; pantallas en `src/app/(organizador)/torneos/[id]/{page.tsx,_components/requests-panel.tsx,agregar-equipo/*}`, `src/app/(club)/club/{page.tsx,torneos/page.tsx,torneos/buscar/page.tsx}` y `src/app/convocatoria/[id]/*`.
**Pruebas:** `tests/solicitudes.test.mjs` (17, API), `tests/unit/tournament-request.test.mjs` (10). Se actualizaron `torneos`, `auth` y `live`, que inscribían clubes ajenos directo.
**Sustituye a:** el pendiente nº 1 de [pendientes-y-decisiones.md](pendientes-y-decisiones.md) y resuelve la decisión 9.
**Toca:** [002](002-crear-torneo-y-equipos.md) (inscribir equipos), [modelo-de-datos.md](modelo-de-datos.md).

## Objetivo
Que un equipo y un organizador **se pongan de acuerdo** antes de que el equipo entre a un torneo, en las dos direcciones:

- **Solicitud:** un club pide entrar a un torneo; el organizador acepta o rechaza.
- **Invitación:** el organizador invita a un club de la comunidad; el dueño del club acepta o rechaza.

Además, reemplazar el link falso de "Invitar por WhatsApp" (`amateur.IA40Za.com`) por uno real, para equipos que todavía no están en Amateur.

## Por qué hacía falta
Antes de implementarla había tres huecos que se veían en el código:

1. La pestaña **Solicitudes** e **Invitados** del torneo están vacías y no hay nada que las llene.
2. El club tiene una pestaña **Solicitudes** y una pantalla **Buscar torneo** que son maquetas con datos inventados (`const solicitudes = []`, `searchResults` fijo).
3. **El dueño de un club puede inscribirse solo** en cualquier torneo abierto (`POST /api/tournaments/:id/teams` acepta a `canManageClub`), sin que el organizador lo apruebe. Con este diseño es un agujero: cualquiera con un club se cuela hasta llenar el cupo.

## Cómo funciona (resumen)

```
                  ┌──────── solicitud (club → torneo) ────────┐
   Club owner ────┤ crea                       acepta/rechaza ├──── Organizador
                  └───────────────────────────────────────────┘
                  ┌──────── invitación (torneo → club) ───────┐
   Club owner ────┤ acepta/rechaza                     crea   ├──── Organizador
                  └───────────────────────────────────────────┘
                       aceptar = se crea el TournamentTeam
```

Las dos direcciones son **la misma entidad** con un campo `kind`. La contraparte es quien decide; quien creó puede cancelar.

## Modelo (`TournamentRequest`)

```prisma
model TournamentRequest {
  id           String    @id @default(cuid())
  tournamentId String
  clubId       String
  kind         String    // "request" (el club pide entrar) | "invite" (el organizador invita)
  status       String    @default("pending") // pending | accepted | declined | cancelled
  createdById  String
  createdAt    DateTime  @default(now())
  resolvedAt   DateTime?

  tournament Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  club       Club       @relation(fields: [clubId], references: [id], onDelete: Cascade)
  createdBy  User       @relation(fields: [createdById], references: [id])

  @@unique([tournamentId, clubId])
  @@index([clubId, status])
}
```

- **Cambio aditivo:** una tabla nueva y relaciones inversas en `Tournament`, `Club` y `User`. No modifica datos. Se aplica con `db push` a la rama de pruebas y luego a producción.
- **Una fila por par (torneo, club).** Si una solicitud fue rechazada o cancelada, volver a pedir **reabre la misma fila** (vuelve a `pending`, puede cambiar el `kind`). Se pierde el historial de intentos; es un costo aceptado para no necesitar un índice único parcial, que Prisma no soporta.
- Estados como `String`, igual que el resto del modelo (los valores válidos los hace cumplir la API).

## Reglas

### Crear (`POST /api/tournaments/:id/requests`, cuerpo `{ clubId }`)
1. Requiere sesión. El `kind` **lo decide quién llama**, no el cuerpo:
   - dueño del club (`canManageClub`) → `request`;
   - organizador del torneo o admin → `invite`.
   - Alguien que es **ambas cosas** (organiza el torneo y es dueño del club) no necesita un acuerdo consigo mismo: `409` "inscríbelo directo".
   - Cualquier otro: `403`. Torneo o club inexistente: `404`.
2. El torneo debe estar **abierto** (`draft` o `inscripcion`) y **con cupo** (`409`). Que haya más pendientes que cupos es válido; el cupo se comprueba de nuevo al aceptar.
3. Un **equipo temporal** no se solicita ni se invita (`400`): es privado de su organizador y se inscribe directo.
4. Si el club **ya está inscrito**: `409`.
5. Si ya hay una **pendiente** del mismo `kind`: `200` con `alreadyPending: true` y la misma fila (idempotente, como las invitaciones a jugadores). Si hay una pendiente del **kind contrario** (el club pidió y el organizador también invitó, o al revés): `409` con `requestId`, indicando que hay que aceptar esa.
6. Si la fila existe y no está pendiente: se **reabre** (`201`).

### Resolver
Tres acciones sobre una solicitud `pending`. Cada una es una ruta `POST` (mismo estilo que `invitations/:token/accept`).

| Acción | `kind: request` (club → torneo) | `kind: invite` (torneo → club) |
|---|---|---|
| `accept` | organizador del torneo o admin | dueño del club |
| `decline` | organizador del torneo o admin | dueño del club |
| `cancel` | dueño del club | organizador del torneo o admin |

7. Otra persona: `403`. Solicitud que no existe: `404`. Que no esté `pending`: `409`.
8. **`accept` crea la inscripción y marca la solicitud en una sola transacción**: vuelve a comprobar que el torneo sigue abierto (`409`), que hay cupo (`409`) y que el club no está inscrito (`409`), crea el `TournamentTeam` (sin grupo) y pone `accepted` + `resolvedAt`. Es **seguro con aceptaciones simultáneas**: `withOpenTournament` bloquea la fila del torneo (`SELECT … FOR UPDATE`) y comprueba estado y cupo dentro de la misma transacción. Con 1 cupo y 5 aceptaciones a la vez entra exactamente 1 (hay una prueba; quitando el bloqueo, entraron 4). **`POST /teams` usa el mismo mecanismo**, con lo que también dejó de tener la condición de carrera que tenía (contaba y luego creaba, sin transacción).
9. `decline` y `cancel` ponen `declined` / `cancelled` + `resolvedAt`. Se permiten aunque el torneo ya haya empezado.
10. **Un torneo que empieza no toca sus solicitudes:** siguen `pending`, pero no se pueden aceptar (`409`) y las pantallas avisan que el torneo ya empezó y desactivan **Aceptar**. Es lo más simple y no acopla esto al fixture.
11. Quitar un equipo del torneo (`DELETE /teams/:clubId`) **no modifica** la solicitud. Al haber una fila por par, el club puede volver a solicitar (regla 6).

### Leer
12. `GET /api/tournaments/:id/requests?kind=&status=` — organizador o admin. Devuelve cada solicitud con el resumen del club (`id`, `name`, `shortName`, `color`, `logoUrl`, delegado) y quién la creó. Es lo que llena las pestañas del organizador.
13. `GET /api/tournament-requests/mine?tournamentId=` (filtro opcional) — con sesión: las solicitudes e invitaciones **de los clubes de quien llama**, pendientes, con el resumen del torneo (`name`, `category`, `startDate`, `location`, `format`, `modality`, cupos ocupados/máximos) y el nombre del organizador. Es lo que llena la pestaña del club.

### Cambio en la inscripción directa (`POST /api/tournaments/:id/teams`)
14. **Deja de aceptar a un dueño de club que inscribe el suyo:** `403` con `code: "request_required"` y el mensaje "Solicita unirte al torneo" (decisión A). El organizador y el admin siguen inscribiendo directo con `clubId` o `newClub`.
15. **El organizador tampoco inscribe directo a un club de otro dueño** (decisión B): `403` con `code: "invite_required"` y el mensaje "Invita al equipo". Solo entran directo un equipo **temporal**, uno **propio** o cualquiera si quien llama es admin. La pantalla no hace esta llamada: usa `POST /requests`.

## El link de "Invitar por WhatsApp"
Para el equipo que **todavía no está en Amateur**. El link es la **convocatoria pública** del torneo: `/convocatoria/:tournamentId`.

- **No es un secreto ni un token:** la información del torneo ya es pública (`GET /api/tournaments/:id`). Y como entrar exige aprobación, un link abierto no permite colarse. No hay nada que revocar.
- La página muestra el resumen del torneo, sus cupos libres y el estado. Según quién la abra:
  - **Sin sesión:** "Inicia sesión o regístrate para solicitar unirte" (vuelve a esta página tras entrar).
  - **Con sesión y sin club:** debe crear su club primero (rol `CLUB_OWNER`; `POST /api/clubs` ya existe) y vuelve.
  - **Con sesión y club:** botón **Solicitar unirme**, con el estado si ya lo pidió, ya está inscrito o no hay cupo. Si gestiona varios clubes, elige con cuál.
- La tarjeta de `agregar-equipo` muestra este link real y *Compartir* usa el mismo componente que el link del club (`InviteLinkCard`: menú del sistema en el celular, copiar en la computadora).

> **Alta de club:** `POST /api/clubs` existía pero **ninguna pantalla lo usaba** (solo la de admin): quien elegía "Equipo de fútbol" caía en `/club`, que no tenía página. Se creó `/club`: sin equipo muestra el formulario **Crea tu equipo**; con equipo redirige al destino. Acepta `?next=` (solo rutas internas) para volver a la convocatoria.

## Pantallas

**Organizador — detalle del torneo en convocatoria**
- *Solicitudes:* clubes que pidieron entrar (`kind=request`, `pending`), con **Aceptar** y **Rechazar**. Un contador en la pestaña. Al aceptar, el equipo aparece en *Inscritos* sin recargar; si no hay cupo, se muestra el error.
- *Invitados:* clubes invitados (`kind=invite`), con su estado (pendiente, aceptada, rechazada, cancelada) y **Cancelar invitación** en las pendientes.
- *Agregar equipo → Buscar:* para un club de otro dueño el botón pasa de **Agregar** a **Invitar** (decisión B); muestra si ya está invitado o ya solicitó.

**Club — `/club/torneos`**
- Pestaña *Solicitudes* con datos reales (`/mine`): invitaciones pendientes con **Rechazar / Aceptar**, y solicitudes propias con **Cancelar solicitud**. Solo pendientes. Ya existe la maqueta.
- *Buscar torneo* (`/club/torneos/buscar`): torneos reales en `inscripcion` con cupo (`GET /api/tournaments?status=inscripcion`), filtro por nombre en el cliente, **Solicitar** por tarjeta, con el estado ("Solicitud enviada", "Ya inscrito", "Sin cupo").

**Alta de club — `/club`:** nombre (1–80), nombre corto (hasta 12, se sugiere de las 3 primeras letras), color entre 8 con contraste suficiente para las iniciales blancas, y vista previa del avatar. El error aparece junto al campo; el botón muestra progreso y se desactiva mientras envía. Activa el rol `CLUB_OWNER` al enviar (no al mirar la pantalla).

**Público — `/convocatoria/:id`:** resumen del torneo, cupos con barra de progreso, bases y costos (que antes ninguna pantalla mostraba) y una barra de acción fija abajo que cambia según quién la abra: sin sesión (iniciar sesión o crear cuenta, ambas vuelven aquí), sin club (crear equipo), con club (solicitar, ver "solicitud enviada" y cancelar, "ya inscrito", "sin cupos" o "te invitaron"), organizador del torneo (administrar) o inscripciones cerradas. Con varios clubes, un selector. Tiene título y descripción propios para la vista previa de WhatsApp.

## Pruebas
`tests/solicitudes.test.mjs` (17) cubre, contra un servidor real:

- **Crear:** dueño → `request`, organizador → `invite`; sin sesión `401`, ajeno `403`, datos inválidos `400`, inexistentes `404`; quien es ambas cosas `409`; temporal `400`; ya inscrito, sin cupo o torneo empezado `409`; repetir es idempotente; el tipo contrario pendiente devuelve `409` con `requestId`; tras un rechazo se reabre la misma fila (incluso cambiando de tipo).
- **Resolver:** cada celda de la tabla de permisos (quién sí y quién `403`); aceptar crea la inscripción; rechazar y cancelar no; una ya resuelta `409`; acción inexistente `404`; aceptar con el torneo lleno o empezado `409` **sin dejar nada a medias** y la solicitud sigue pendiente; quitar el equipo permite volver a solicitar.
- **Concurrencia:** 1 cupo y 5 solicitudes aceptadas a la vez, entra exactamente 1.
- **Inscripción directa cerrada:** organizador a club ajeno y dueño a sí mismo, ambos `403` con su `code`.
- **Leer:** el organizador lista con filtros y no ve el correo de nadie; un ajeno o el dueño del club `403`; `/mine` devuelve solo las pendientes de los clubes de quien llama, con el resumen del torneo.

`tests/unit/tournament-request.test.mjs` (10) fija la tabla de permisos, las acciones y las etiquetas sin servidor. Se agregaron también `time-ago` (3) y `safe-next` (2).

Se **verificó que la prueba de concurrencia detecta el problema**: al quitar el bloqueo, falla (aceptaron 4 solicitudes para 1 cupo).

## Decisiones adoptadas (por confirmar)

Se implementó la **recomendación** de cada una. Si alguna no es lo que quieres, cambiarla es acotado.

| # | Decisión | Recomendación | Alternativa y su costo |
|---|---|---|---|
| **A** | ¿Un dueño de club puede inscribirse solo? | **No: debe solicitar** y el organizador aprueba. | Sí, directo: no hace falta la pestaña *Solicitudes*, pero el organizador pierde el control del cupo. |
| **B** | ¿El organizador puede agregar directo a un club de **otro** dueño? | **No: se le invita** y el dueño acepta (salvo equipo temporal o club propio). Es lo que sugieren las maquetas (*Invitados*, *Rechazar/Aceptar*). | Sí, directo (como hoy): más ágil para ligas que arman todo por teléfono, pero *Invitados* deja de tener sentido y un club queda inscrito sin saberlo. |
| **C** | ¿El link de WhatsApp es la convocatoria pública, sin token? | **Sí**, simple y sin revocación, porque igual hay aprobación. | Link con token revocable por torneo: más control, una columna más y una pantalla de gestión. |
| **D** | ¿Se conserva el historial de intentos? | **No**: una fila por par y se reabre. | Una fila por intento: historial completo, pero hay que garantizar en código que solo haya una pendiente por par. |
| **E** | ¿Hay lista de espera cuando no hay cupo? | **No**: no se puede solicitar sin cupo, y al aceptar se vuelve a comprobar. | Lista de espera: un estado más y reglas de orden. |

A y B cambiaron comportamiento que ya funcionaba y tenía pruebas (se actualizaron). Revertir B, por ejemplo, es quitar una condición en `POST /teams` y volver a mostrar **Agregar** en vez de **Invitar**.

## Fuera de alcance
- **Notificaciones:** el organizador y el dueño se enteran al abrir su pestaña (mismo límite que las invitaciones a jugadores, decisión 12). Un contador en la pestaña es lo único que se propone.
- **Mensaje o motivo** en la solicitud; **cuotas o pagos** de inscripción (`registrationFee` sigue sin usarse).
- **Asignar grupo** al aceptar: el equipo entra sin grupo, como hoy.
- **Solicitar por categoría** o por más de un equipo de un mismo club.
- **Historial** de solicitudes resueltas en las pantallas.

## Limitaciones conocidas
- **Las pantallas de organizador, club y el alta de club no se recorrieron en el navegador con sesión iniciada.** Verificados: la API completa (pruebas), los tipos (`tsc`), el lint de lo nuevo y la convocatoria pública sin sesión, incluido el modal de login con su `next`. Falta el recorrido visual de las pantallas con sesión.
- **No hay notificaciones:** cada parte se entera al abrir su pestaña. El organizador ve un contador de solicitudes pendientes en la pestaña *Solicitudes*; el dueño del club, uno de invitaciones en la suya.
- **Un club con varios equipos:** solo la convocatoria deja elegir con cuál solicitar. El resto del área de club usa el primero (como el resto de la app).
- **Sin historial** en las pantallas: el club solo ve pendientes; el organizador ve todas las invitaciones (con su estado) pero solo las solicitudes pendientes.
- **Un torneo que empieza deja sus solicitudes pendientes** (no se pueden aceptar; se pueden rechazar o cancelar).
- La búsqueda de torneos del club filtra en el navegador por nombre o sede; no hay filtros por categoría ni fecha.
- Se conserva la tarjeta "Buscar equipo" con su texto anterior.
- La suite de integración depende de una base remota lenta: cada prueba tarda entre 5 y 40 segundos, y no conviene correr varias suites en paralelo (saturan el pool de conexiones).
