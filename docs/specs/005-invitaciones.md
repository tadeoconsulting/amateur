# 005 · Invitaciones a jugadores

**Estado:** implementada (as-built).
**Código:** `src/_lib/invite.ts`, `src/app/api/invitations/*`, `src/app/api/clubs/[id]/{invite,invite-link,players}/route.ts`, `src/app/api/auth/register/route.ts`, `src/_components/invite-link-card.tsx`, `src/_lib/use-my-club.ts`, `src/app/jugador/invitacion/page.tsx`, `src/app/(jugador)/jugador/equipos/page.tsx`.
**Pruebas:** `tests/invitaciones.test.mjs` (17).

## Objetivo
Que un club sume jugadores de dos maneras: compartiendo un **link por WhatsApp** (para quien todavía no tiene cuenta) o **invitando directamente** a un jugador de la comunidad.

## Dos clases de invitación
| | Link del club | Invitación personal |
|---|---|---|
| Identificada por | `Club.inviteToken` | `PlayerInvitation.token` |
| Para quién | Cualquiera que lo abra | Una cuenta con un correo concreto |
| Usos | Muchos | Uno |
| Vence | No; **se revoca** generando uno nuevo | A los 7 días |

Ambas son un **token secreto** en la URL. Se resuelven igual (`resolveInvitation`).

## Reglas

### Link del club
1. `GET /api/clubs/:id/invite-link` devuelve el link del club y **lo genera la primera vez**; pedirlo de nuevo devuelve el mismo. `POST` genera uno nuevo y **revoca el anterior**. Solo el dueño del club (`403` al resto, `401` sin sesión).
2. El token tiene 24 caracteres aleatorios (18 bytes, base64url). El link es `/jugador/invitacion?token=…`.

### Vista previa pública (`GET /api/invitations/:token`)
3. Sin sesión. Devuelve solo `{ kind, club: { id, name, shortName, color, logoUrl } }` y, en una invitación personal, el correo al que iba dirigida. No expone datos del dueño.
4. Un token inexistente o revocado: `404`. Una invitación personal ya usada o vencida: `410`.

### Aceptar (`POST /api/invitations/:token/accept`)
5. Requiere sesión. Una invitación **personal solo la acepta la cuenta con ese correo** (`403` a cualquier otra, aunque tenga el token).
6. Suma a la persona al club como jugador: le da el rol `JUGADOR` y crea o actualiza su perfil. Con `position` la guarda.
7. **Un jugador pertenece a un solo club.** Si ya está en el mismo, responde `200` con `already: true`. Si está en **otro**, responde `409` con `currentClub` y **no lo mueve**; solo lo hace si el pedido se repite con `replace: true`. Al cambiar de club se pierden la categoría y el dorsal.
8. Aceptar una invitación personal la marca `accepted`; volver a usarla da `410`.

### Rechazar (`POST /api/invitations/:token/decline`)
9. Solo para invitaciones personales y solo la cuenta destinataria. La marca `declined`. El link del club no se rechaza (`400`).

### Invitación directa (`POST /api/clubs/:id/invite`)
10. Solo el dueño del club. Acepta `{ email }` o `{ userId }`. Con `userId` **el servidor busca el correo**: el buscador de jugadores no necesita mostrar el de nadie.
11. Si esa persona ya es del club: `409`. Si ya tiene una invitación pendiente y vigente a ese club: `200` con `alreadyInvited: true` y el mismo token (no se crea otra). Un `userId` inexistente: `404`. Sin `email` ni `userId`: `400`.
12. `GET /api/invitations/mine` lista las invitaciones pendientes y vigentes de la cuenta con sesión, con el nombre de quien invitó.

### Registrarse con una invitación
13. `POST /api/auth/register` con `clubToken` **valida el token antes de crear la cuenta**: uno revocado, vencido o usado responde `404`/`410` y **no crea nada**. (Antes un token malo se ignoraba en silencio y la persona quedaba registrada sin club.)
14. Con una invitación personal, el correo del registro debe ser el invitado (`400`). Al registrarse entra al club y la invitación queda `accepted`.

### Otras
15. `POST /api/clubs/:id/players` (el dueño suma a alguien) **ya no mueve** a un jugador que está en otro club: `409` ("invítalo para que decida"). Antes hacía un `upsert` que le cambiaba el club sin su consentimiento.

## Pantallas
- **"Invitar" del club y del organizador** (`/club/jugadores/invitar`, `/jugadores/invitar`): la tarjeta **Invitar por WhatsApp** muestra el link real del club de quien tiene la sesión (si gestiona varios, el primero). *Compartir* abre el menú del sistema en el celular y copia el link en la computadora. *Generar un link nuevo* pide confirmación en el mismo lugar. Sin club, avisa que primero hay que crear uno.
- **Búsqueda de jugadores:** *Invitar* envía una invitación directa real y muestra si ya estaba invitado o ya es miembro.
- **`/jugador/invitacion?token=…`** (pública):
  - Sin token, o con uno inválido, revocado, vencido o usado: pantalla "Esta invitación no sirve".
  - Con una invitación válida y **sin sesión:** formulario de registro con el club real y su color; el correo de una invitación personal viene fijo. Pide contraseña (mínimo 8). Enlace "Inicia sesión" que vuelve a esta página.
  - **Con sesión:** solo confirma ("Unirme a…"); si ya está en otro club, avisa lo que perderá y pide confirmar.
  - Al terminar: "¡Bienvenido!" y lleva a "Mis Equipos".
- **"Mis Equipos"** (jugador): muestra **su** club (antes listaba todos los de la base) y las **invitaciones pendientes** con Aceptar y Rechazar.

## Limitaciones conocidas
- **No hay notificaciones.** Un jugador invitado directamente se entera al abrir "Mis Equipos".
- **El link del club no vence:** el único control es revocarlo. Quien lo tenga puede unirse hasta entonces, sin aprobación del dueño. *Decisión pendiente:* ¿el dueño aprueba a los que entran por link?
- **Una invitación personal no se puede cancelar** desde el producto (existe `GET /api/clubs/:id/invite` para listarlas, pero no hay endpoint para retirarlas).
- **El vencimiento a los 7 días está implementado pero no tiene prueba**: la API no permite fijar una fecha pasada.
- Quien entra queda **sin categoría ni dorsal**; el dueño los asigna después.
- **La tarjeta "Invitar por WhatsApp" de agregar equipo** es otro flujo (equipos que piden entrar a un torneo) y ya es real: ver [006](006-solicitudes-de-equipos.md).
- No se probó *Compartir* en un navegador real: abre el menú nativo del sistema, que bloquea la automatización.
