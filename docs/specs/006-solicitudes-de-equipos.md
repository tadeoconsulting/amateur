# 006 · Solicitudes e invitaciones de equipos a un torneo

**Estado:** ⏳ **propuesta, sin implementar.** Se revisa antes de escribir código (ver "Decisiones que hay que confirmar").
**Sustituye a:** el pendiente nº 1 de [pendientes-y-decisiones.md](pendientes-y-decisiones.md) y resuelve la decisión 9.
**Toca:** [002](002-crear-torneo-y-equipos.md) (inscribir equipos), [modelo-de-datos.md](modelo-de-datos.md).

## Objetivo
Que un equipo y un organizador **se pongan de acuerdo** antes de que el equipo entre a un torneo, en las dos direcciones:

- **Solicitud:** un club pide entrar a un torneo; el organizador acepta o rechaza.
- **Invitación:** el organizador invita a un club de la comunidad; el dueño del club acepta o rechaza.

Además, reemplazar el link falso de "Invitar por WhatsApp" (`amateur.IA40Za.com`) por uno real, para equipos que todavía no están en Amateur.

## Por qué hace falta
Hoy hay tres huecos que se ven en el código:

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
8. **`accept` crea la inscripción y marca la solicitud en una sola transacción**: vuelve a comprobar que el torneo sigue abierto (`409`), que hay cupo (`409`) y que el club no está inscrito (`409`), crea el `TournamentTeam` (sin grupo) y pone `accepted` + `resolvedAt`. Debe ser **seguro con aceptaciones simultáneas**: con un cupo libre y dos aceptaciones a la vez, solo una gana (aislamiento `Serializable` o bloqueo de la fila del torneo). *Nota:* `POST /teams` hoy tiene la misma condición de carrera (cuenta y luego crea, sin transacción); conviene arreglarla junto con esto.
9. `decline` y `cancel` ponen `declined` / `cancelled` + `resolvedAt`. Se permiten aunque el torneo ya haya empezado.
10. **Un torneo que empieza no toca sus solicitudes:** siguen `pending`, pero no se pueden aceptar (`409`) y las pantallas las muestran como "Torneo cerrado". Es lo más simple y no acopla esto al fixture.
11. Quitar un equipo del torneo (`DELETE /teams/:clubId`) **no modifica** la solicitud. Al haber una fila por par, el club puede volver a solicitar (regla 6).

### Leer
12. `GET /api/tournaments/:id/requests?kind=&status=` — organizador o admin. Devuelve cada solicitud con el resumen del club (`id`, `name`, `shortName`, `color`, `logoUrl`, delegado) y quién la creó. Es lo que llena las pestañas del organizador.
13. `GET /api/tournament-requests/mine` — con sesión: las solicitudes e invitaciones **de los clubes de quien llama**, pendientes, con el resumen del torneo (`name`, `category`, `startDate`, `location`, `format`, `modality`, cupos ocupados/máximos) y el nombre del organizador. Es lo que llena la pestaña del club.

### Cambio en la inscripción directa (`POST /api/tournaments/:id/teams`)
14. **Deja de aceptar a un dueño de club que inscribe el suyo:** `403` con el mensaje "Solicita unirte al torneo" (ver decisión A). El organizador y el admin siguen inscribiendo directo con `clubId` o `newClub`.
15. Si el organizador inscribe directo a un club de otro dueño (decisión B), ese club recibe una **invitación** en vez de quedar inscrito, salvo que sea temporal o suyo.

## El link de "Invitar por WhatsApp"
Para el equipo que **todavía no está en Amateur**. El link es la **convocatoria pública** del torneo: `/convocatoria/:tournamentId`.

- **No es un secreto ni un token:** la información del torneo ya es pública (`GET /api/tournaments/:id`). Y como entrar exige aprobación, un link abierto no permite colarse. No hay nada que revocar.
- La página muestra el resumen del torneo, sus cupos libres y el estado. Según quién la abra:
  - **Sin sesión:** "Inicia sesión o regístrate para solicitar unirte" (vuelve a esta página tras entrar).
  - **Con sesión y sin club:** debe crear su club primero (rol `CLUB_OWNER`; `POST /api/clubs` ya existe) y vuelve.
  - **Con sesión y club:** botón **Solicitar unirme**, con el estado si ya lo pidió, ya está inscrito o no hay cupo. Si gestiona varios clubes, elige con cuál.
- La tarjeta de `agregar-equipo` muestra este link real y *Compartir* usa el mismo componente que el link del club (`InviteLinkCard`: menú del sistema en el celular, copiar en la computadora).

> Dependencia por verificar: el alta de un club desde la interfaz. `POST /api/clubs` existe y exige `CLUB_OWNER`, pero **no se ha confirmado que haya una pantalla** que un recién llegado pueda usar. Si no la hay, es parte de este trabajo o un paso previo.

## Pantallas

**Organizador — detalle del torneo en convocatoria**
- *Solicitudes:* clubes que pidieron entrar (`kind=request`, `pending`), con **Aceptar** y **Rechazar**. Un contador en la pestaña. Al aceptar, el equipo aparece en *Inscritos* sin recargar; si no hay cupo, se muestra el error.
- *Invitados:* clubes invitados (`kind=invite`), con su estado (pendiente, aceptada, rechazada, cancelada) y **Cancelar invitación** en las pendientes.
- *Agregar equipo → Buscar:* para un club de otro dueño el botón pasa de **Agregar** a **Invitar** (decisión B); muestra si ya está invitado o ya solicitó.

**Club — `/club/torneos`**
- Pestaña *Solicitudes* con datos reales (`/mine`): invitaciones pendientes con **Rechazar / Aceptar**, y solicitudes propias con **Cancelar solicitud**. Solo pendientes. Ya existe la maqueta.
- *Buscar torneo* (`/club/torneos/buscar`): torneos reales en `inscripcion` con cupo (`GET /api/tournaments?status=inscripcion`), filtro por nombre en el cliente, **Solicitar** por tarjeta, con el estado ("Solicitud enviada", "Ya inscrito", "Sin cupo").

**Público — `/convocatoria/:id`:** ver arriba.

## Pruebas por escribir
Un archivo `tests/solicitudes.test.mjs` (integración, rama de pruebas). Como mínimo:

- Crear: dueño → `request`; organizador → `invite`; ajeno `403`; sin sesión `401`; ambas cosas `409`; temporal `400`; ya inscrito `409`; sin cupo `409`; torneo empezado `409`; club/torneo inexistente `404`.
- Idempotencia: repetir → `200` `alreadyPending`; kind contrario → `409` con `requestId`; reabrir tras rechazada/cancelada → `201`.
- Resolver: cada celda de la tabla de permisos (quién sí, quién `403`); no pendiente `409`; `accept` crea el `TournamentTeam` y `accepted`; `accept` sin cupo o con torneo cerrado `409` **sin dejar nada a medias**.
- **Concurrencia:** con 1 cupo y 5 solicitudes aceptadas a la vez, exactamente 1 gana y el torneo nunca supera `maxTeams`.
- Cancelar y rechazar; quitar el equipo y volver a solicitar.
- `GET` del organizador (solo el suyo, filtros) y `/mine` (solo mis clubes; no filtra datos de otros).
- Regresión: **actualizar** la prueba `quien no es organizador ni dueño del club no puede inscribir` (hoy afirma que el dueño se inscribe solo, `201`; pasa a `403`).
- Unitarias: si se extrae una función pura de las transiciones permitidas, sin servidor.

Después: `tsc`, `lint` sobre lo tocado, y una pasada real en el navegador de las tres pantallas (organizador, club, convocatoria).

## Decisiones que hay que confirmar

| # | Decisión | Recomendación | Alternativa y su costo |
|---|---|---|---|
| **A** | ¿Un dueño de club puede inscribirse solo? | **No: debe solicitar** y el organizador aprueba. | Sí, directo: no hace falta la pestaña *Solicitudes*, pero el organizador pierde el control del cupo. |
| **B** | ¿El organizador puede agregar directo a un club de **otro** dueño? | **No: se le invita** y el dueño acepta (salvo equipo temporal o club propio). Es lo que sugieren las maquetas (*Invitados*, *Rechazar/Aceptar*). | Sí, directo (como hoy): más ágil para ligas que arman todo por teléfono, pero *Invitados* deja de tener sentido y un club queda inscrito sin saberlo. |
| **C** | ¿El link de WhatsApp es la convocatoria pública, sin token? | **Sí**, simple y sin revocación, porque igual hay aprobación. | Link con token revocable por torneo: más control, una columna más y una pantalla de gestión. |
| **D** | ¿Se conserva el historial de intentos? | **No**: una fila por par y se reabre. | Una fila por intento: historial completo, pero hay que garantizar en código que solo haya una pendiente por par. |
| **E** | ¿Hay lista de espera cuando no hay cupo? | **No**: no se puede solicitar sin cupo, y al aceptar se vuelve a comprobar. | Lista de espera: un estado más y reglas de orden. |

A y B cambian comportamiento que hoy funciona y tiene pruebas; por eso se piden antes de tocar código.

## Fuera de alcance
- **Notificaciones:** el organizador y el dueño se enteran al abrir su pestaña (mismo límite que las invitaciones a jugadores, decisión 12). Un contador en la pestaña es lo único que se propone.
- **Mensaje o motivo** en la solicitud; **cuotas o pagos** de inscripción (`registrationFee` sigue sin usarse).
- **Asignar grupo** al aceptar: el equipo entra sin grupo, como hoy.
- **Solicitar por categoría** o por más de un equipo de un mismo club.
- **Historial** de solicitudes resueltas en las pantallas.

## Orden de trabajo sugerido (cada paso, un PR)
1. Modelo + API de crear, resolver y leer + `tests/solicitudes.test.mjs` + el arreglo de la condición de carrera en `POST /teams` + el cambio de la regla 14.
2. Pantallas del organizador (*Solicitudes*, *Invitados*, botón **Invitar**).
3. Pantallas del club (pestaña *Solicitudes*, *Buscar torneo*).
4. Convocatoria pública, el link real y, si hace falta, el alta de club.
