# 014 · Co-delegados (varios delegados en un mismo equipo)

**Estado:** 📝 **propuesta, pendiente de aprobación.** Nada implementado todavía.
**Origen:** pedido del usuario (2026-10-18): poder sumar co-delegados al mismo equipo, con las mismas funciones que el delegado.
**Toca:** [001](001-autenticacion-y-permisos.md) (permisos del club), [005](005-invitaciones.md) y [006](006-solicitudes-de-equipos.md) (invitaciones y solicitudes que llegan al delegado), [009](009-jugadores-provisionales.md) (invitación de delegado de un equipo temporal, que **no** cambia), [modelo-de-datos.md](modelo-de-datos.md).

## Objetivo
Que un equipo pueda tener más de una persona gestionándolo con los mismos permisos (planilla, categorías, jugadores, inscripciones, solicitudes de torneo), sin que el delegado principal tenga que compartir su cuenta.

## Decisiones (tomadas por el usuario, 2026-10-18)
| # | Pregunta | Decisión |
|---|---|---|
| 1 | ¿Cómo se suma un co-delegado? | **Invitación por enlace o por correo.** Vale para quien ya tiene cuenta y para quien se registra al aceptar. |
| 2 | ¿Quién agrega o quita co-delegados? | **El delegado principal y el admin.** Un co-delegado no suma ni quita a otros. |
| 3 | ¿Qué NO puede hacer un co-delegado? | **Dar de baja (eliminar) el club, transferirlo a otra persona y cambiar el contacto público del delegado.** Todo lo demás, igual que el principal. |
| 4 | ¿Cuántos y en cuántos clubes? | **Un club por persona y hasta 3 co-delegados** por equipo (4 delegados con el principal). |
| 5 | ¿Quién es el contacto público? | **Solo el delegado principal.** Los organizadores y el resto ven su nombre, teléfono y correo, como hoy. |
| 6 | ¿A quién le llegan las invitaciones y solicitudes de torneo y de jugadores? | **A todos los delegados del club** (principal y co-delegados). |
| 7 | ¿Qué pasa si cambia el delegado principal (Oficializar o un admin)? | **Los co-delegados se quedan.** |

## Cómo está hoy (para entender el alcance)
- Un club tiene **un solo dueño**: `Club.ownerId`. Es el "delegado" que ven las pantallas (el rol interno sigue siendo `CLUB_OWNER`, ver el glosario del README).
- Los permisos del delegado se comprueban contra ese campo en unos 12 lugares (ver *Dónde se comprueba*). El comprobador central es `canManageClub` (`_lib/auth.ts`), pero varias rutas comparan `ownerId` directamente.
- `StaffMember` y `StaffInvitation` (delegado, asistente, DT) son **informativos**: no dan permisos. No se usan para esto.
- La invitación de delegado que ya existe (`DelegateInvitation`, especificación 009) es **solo para equipos temporales y solo la crea un admin**: quien la acepta pasa a ser el dueño. Es otro caso y **no se toca**.
- `DELETE /api/clubs/:id` ya es **solo para admin**, y transferir el club solo lo hace un admin (Oficializar o el cambio de dueño del panel). Eso ya cumple la decisión 3 para esas dos acciones.
- `PATCH /api/clubs/:id` deja hoy a quien gestiona el club editar `name`, `shortName`, `logoUrl`, `color` **y también** `delegadoNombre`, `delegadoTel` y `delegadoEmail`. Esto último hay que restringirlo (decisión 3).

## Modelo de datos
Dos tablas nuevas; `Club.ownerId` **no cambia** y sigue siendo el delegado principal, así que el contacto público, "Oficializar" y el panel de admin siguen igual.

```prisma
// Un co-delegado de un equipo: gestiona el club con los mismos permisos que el dueño, salvo los de la decisión 3.
model ClubDelegate {
  id          String   @id @default(cuid())
  clubId      String
  userId      String
  invitedById String
  createdAt   DateTime @default(now())

  club      Club @relation(fields: [clubId], references: [id], onDelete: Cascade)
  user      User @relation("ClubDelegateUser", fields: [userId], references: [id], onDelete: Cascade)
  invitedBy User @relation("ClubDelegateInviter", fields: [invitedById], references: [id], onDelete: Cascade)

  @@unique([clubId, userId])
  @@unique([userId]) // un club por persona (decisión 4)
  @@index([clubId])
}

// Invitación para ser co-delegado. Mismo patrón que DelegateInvitation (enlace secreto, 7 días, una sola vez), pero la
// crea el delegado principal o un admin, y sirve para equipos con delegado (no temporales).
model CoDelegateInvitation {
  id           String    @id @default(cuid())
  clubId       String
  email        String?   // con correo: solo esa cuenta puede aceptarla; sin correo: quien tenga el enlace
  token        String    @unique
  status       String    @default("pending") // pending | accepted | cancelled (vencida = pending con fecha pasada)
  invitedById  String
  acceptedById String?
  acceptedAt   DateTime?
  expiresAt    DateTime
  createdAt    DateTime  @default(now())
  // relaciones a Club y User como DelegateInvitation
  @@index([clubId])
}
```

- Una migración **aditiva** (dos tablas nuevas, sin tocar las existentes). Como siempre: el SQL se aplica en producción **antes** del merge, y nunca en paralelo desde dos chats.
- Cabe un máximo de 3 `ClubDelegate` por club; las invitaciones pendientes y vigentes **cuentan** para ese tope (si no, se podrían repartir 10 enlaces).
- `@@unique([userId])` garantiza que un co-delegado lo sea de un solo club. Que además no sea dueño de otro lo comprueba el código (como hoy con `sessionOwnedClubs`).

## Permisos
Un solo comprobador nuevo, **`isClubDelegate(user, clubId)`**: verdadero para el dueño del club o para un `ClubDelegate` de ese club. `canManageClub` lo usa (más el admin) y reemplaza las comparaciones sueltas de `ownerId`.

| Acción | Principal | Co-delegado | Admin |
|---|:-:|:-:|:-:|
| Planilla, categorías, jugadores, invitaciones de jugadores, solicitudes de jugadores | ✅ | ✅ | ✅ |
| Inscribir el equipo, responder invitaciones y enviar solicitudes a torneos | ✅ | ✅ | ✅ |
| Cambiar nombre, siglas, logo y color del club | ✅ | ✅ | ✅ |
| Cambiar el **contacto público** (`delegadoNombre/Tel/Email`) | ✅ | ❌ | ✅ |
| **Eliminar** el club | ❌ | ❌ | ✅ (como hoy) |
| **Transferir** el club (Oficializar o cambiar de dueño) | ❌ | ❌ | ✅ (como hoy) |
| Invitar o quitar co-delegados | ✅ | ❌ | ✅ |
| Salirse del equipo | — | ✅ (a sí mismo) | — |

- Un equipo **temporal** (sin delegado) no admite co-delegados: se pueden sumar cuando un admin lo oficializa.
- Los co-delegados **no** se ven afectados si cambia el principal (decisión 7). Si el nuevo principal ya era co-delegado de ese club, su fila de `ClubDelegate` se elimina (pasa a ser el dueño).
- El contacto público sigue saliendo de `Club.owner` / `delegado*`: **solo el principal**.

### Dónde se comprueba (lo que hay que cambiar)
`_lib/auth.ts` (`canManageClub`), `api/clubs/route.ts` (filtro `ownerId` y el listado propio), `api/clubs/[id]/route.ts` (el `PATCH` y su restricción de contacto), `api/tournaments/[id]/teams/route.ts` (dos comprobaciones), `api/tournaments/[id]/teams/[clubId]/route.ts`, `api/tournaments/[id]/requests/route.ts`, `api/tournament-requests/[id]/[action]/route.ts`, `api/tournament-requests/mine/route.ts` (el filtro `club.ownerId`), `api/player-join-requests/[id]/[action]/route.ts`, `api/matches/[id]/events/route.ts` y `_lib/minor-visibility-server.ts` (menores con nombre completo para el delegado del club), `_lib/scorers-server.ts`, `_lib/use-my-club.ts` y `_components/convocatoria-view.tsx` (el club de quien tiene la sesión).

## API
| Ruta | Quién | Qué hace |
|---|---|---|
| `GET /api/clubs/:id/delegates` | cualquier delegado del club o admin | El principal, los co-delegados y (solo para el principal y el admin) las invitaciones vigentes con su enlace. |
| `POST /api/clubs/:id/co-delegate-invitations` | principal o admin | Crea la invitación (`{ email? }`). `409` si el equipo es temporal o ya está en el tope. Con correo, lo envía. |
| `DELETE /api/clubs/:id/co-delegate-invitations/:invitationId` | principal o admin | Cancela una invitación pendiente. |
| `DELETE /api/clubs/:id/delegates/:userId` | principal o admin; o el propio co-delegado | Quita al co-delegado. Se puede usar sobre uno mismo para salirse. |
| `GET /api/co-delegate-invitations/:token` | público | Resumen de la invitación (equipo, quién invita, vigencia), como la de delegado. |
| `POST /api/co-delegate-invitations/:token/accept` | con sesión o creando la cuenta | Acepta. Con sesión: cuerpo vacío. Sin sesión: `{ firstName, lastName, password, email? }`, igual que la de delegado. |
| `GET /api/clubs?delegateId=` | sesión | Los clubes donde la persona es principal o co-delegada (el filtro `ownerId` se mantiene: solo principales). |

Reglas de **aceptar** (`409` con `code`, como las demás invitaciones): vencida o cancelada; usada; el correo de la invitación no es el de la sesión; la persona **ya es delegada o co-delegada de otro club** (un club por persona); el club llegó a 3 co-delegados; el equipo pasó a ser temporal o ya no existe. Al aceptar se le da el perfil de delegado (`CLUB_OWNER`) y se crea el `ClubDelegate`, todo en una transacción. Un enlace se usa una sola vez: si dos personas lo abren a la vez, solo una lo consigue.

## Pantallas
- **Equipo → Delegados** (delegado): lista al principal (marcado como "Principal") y a los co-delegados; el principal ve "Invitar co-delegado" (enlace para copiar o correo), las invitaciones pendientes (cancelar, reenviar) y "Quitar" en cada co-delegado. Un co-delegado ve la lista sin esos botones y con "Salir del equipo".
- **Aceptar:** `/delegado/co-delegado/{token}`, parecida a la de delegado de equipo temporal: con sesión acepta con un botón; sin sesión crea la cuenta en el mismo paso.
- **Ajustes del club:** los campos de contacto público se muestran de solo lectura a un co-delegado, con la explicación de que los cambia el delegado principal.
- **Admin → Clubes:** en el detalle del club, los co-delegados con la opción de quitarlos y de invitar.
- **Inicio y torneos del delegado:** sin cambios visibles; la pantalla del club se arma con `delegateId` en lugar de `ownerId`.

## Avisos
Las solicitudes e invitaciones de torneo y las solicitudes de jugadores se listan **por club**, así que, al filtrar por "mis clubes" (principal o co-delegado), llegan a todos sin más cambios. Los correos que hoy se mandan al contacto del club siguen yendo **solo al principal** (decisión 5). *Por confirmar al implementar:* si hay algún aviso que hoy se envíe por correo a otro destinatario, anotarlo aquí.

## Entregas
1. **Modelo, permisos y API:** migración, `isClubDelegate`, restricción de contacto en el `PATCH`, invitaciones, aceptar, quitar y salir, y los ~12 cambios de comprobación. Pruebas unitarias y de integración.
2. **Pantallas del delegado y del admin:** sección Delegados, página de aceptar y el contacto de solo lectura.

## Pruebas
- **Unitarias:** `isClubDelegate` (principal, co-delegado, otro club, admin), el tope de 3 con invitaciones pendientes, y las reglas de aceptar (un club por persona, correo distinto, vencida, usada).
- **Integración:** un co-delegado puede gestionar planilla, solicitudes e inscripciones; **no** puede cambiar el contacto, eliminar el club, transferirlo ni invitar o quitar co-delegados; el principal y el admin sí invitan y quitan; un co-delegado se sale solo; el cuarto co-delegado y el equipo temporal responden `409`; una persona con otro club no puede aceptar; ninguna ruta que antes exigía ser dueño queda abierta a un tercero.
- **Pantallas:** verificadas a mano en celular y escritorio contra una base local.

## Fuera de alcance
- Que una persona sea delegada de **varios** clubes (decisión 4).
- Dar permisos parciales a un co-delegado (todos tienen los mismos).
- Cambiar quién es el principal desde la app del delegado (hoy lo hace solo un admin).
- Convertir en co-delegados a los miembros de `StaffMember`.
