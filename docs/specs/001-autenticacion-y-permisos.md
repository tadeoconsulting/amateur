# 001 · Autenticación y permisos

**Estado:** implementada (as-built).
**Código:** `src/_lib/auth.ts`, `src/_lib/session.ts`, `src/proxy.ts`, `src/lib/auth-context.tsx`, `src/app/api/auth/*`, `src/app/api/users/*`.
**Pruebas:** `tests/auth.test.mjs` (29).

## Objetivo
Que cada persona entre con su cuenta y solo pueda ver y cambiar lo que le corresponde. Antes existía un usuario de demo fijo en el navegador y una API abierta.

## Reglas

### Sesión
1. La sesión es una **cookie `amateur_session`**: `httpOnly`, `SameSite=Lax`, `Secure` en producción, `path=/`, 7 días.
2. Contiene un JWT (HS256) firmado con `AUTH_SECRET` cuyo único dato es el **id de usuario**. Se rechazan tokens con otro algoritmo (incluido `alg: none`), alterados o vencidos.
3. Si `AUTH_SECRET` falta o tiene menos de 32 caracteres, la app **falla en voz alta**; no cae en un valor por defecto.
4. Los **roles se leen de la base en cada request**. Quitar un rol o borrar al usuario surte efecto de inmediato.

### Contraseñas y registro
5. La contraseña tiene entre 8 caracteres y 72 bytes (límite de `bcrypt`). Se guarda con `bcryptjs`, costo 10.
6. El correo se normaliza a minúscula y es único sin importar mayúsculas (`409` si ya existe).
7. **Registrarse siempre crea un `JUGADOR`.** Cualquier `roles` o `role` en el pedido se ignora.
8. Requeridos: `email`, `firstName`, `password`. `lastName` puede ir vacío. La fecha de nacimiento, si viene, debe existir en el calendario y estar entre 1900 y hoy.
9. Registrarse abre la sesión. Con `position` crea el perfil de jugador; con un token de invitación entra al club (ver [005](005-invitaciones.md)).

### Login
10. Un correo inexistente y una contraseña mala dan **el mismo error** (`401`, "Correo o contraseña incorrectos"), y en ambos casos se hace la comparación de hash, para que el tiempo no delate qué correos existen.

### Roles
11. Cada persona activa por su cuenta `ORGANIZADOR`, `CLUB_OWNER` o `JUGADOR` con `POST /api/auth/roles` (se hace desde `/seleccion-perfil`). `ADMIN` da `400`.
12. `ADMIN` se asigna únicamente con `npm run db:make-admin -- correo` (sobre una cuenta ya registrada) o lo cambia otro admin con `PATCH /api/users/:id`.
13. Un admin no puede quitarse su propio rol `ADMIN`, y toda cuenta debe conservar al menos un rol.
14. Entrar al asistente "Crear torneo" activa `ORGANIZADOR` automáticamente (quien llega por el redirect del login no pasó por `/seleccion-perfil`).

### Usuarios
15. `GET /api/users`: el admin ve todo. El resto recibe una **búsqueda reducida**: exige `search` de 2+ letras (si no, `[]`), devuelve como máximo 25 y solo id, nombre, avatar, roles y perfil de jugador (nunca correo, teléfono, fecha de nacimiento).
16. `POST /api/users` es solo de admin. Si no define contraseña se genera una temporal, **se devuelve una sola vez** y no se guarda en claro.
17. `GET/PATCH/DELETE /api/users/:id`: solo la propia persona o un admin. Los `roles` los cambia solo un admin. Nunca se devuelve `passwordHash`. Borrar a alguien con datos asociados da `409`.

### Datos que se protegen
18. Correo y teléfono de jugadores: solo admin. Fecha de nacimiento: la propia persona, el dueño de su club y admin. Tokens de invitación: el dueño del club.
19. **Lecturas públicas** (sin sesión): torneos, partidos, jugadas, tabla de posiciones, goleadores y equipos inscritos. Todo lo demás exige sesión.

### Páginas
20. `src/proxy.ts` redirige a `/?auth=login&next=<ruta>` cuando no hay sesión válida en estas rutas: `/torneos`, `/jugadores`, `/ajustes`, `/partidos`, `/notificaciones`, `/crear-torneo`, `/seleccion-perfil`, `/club`, `/jugador`, `/admin`. **Excepción:** `/jugador/invitacion`, que abre alguien sin cuenta.
21. `next` solo acepta rutas internas (no `//sitio.com`). Es **solo comodidad**: la seguridad real está en la API.
22. `/login` y `/registro` redirigen al modal de la landing. `/admin` muestra "Sin acceso" a quien no es admin.

## Permisos por endpoint

`—` = sin sesión. "Dueño" = organizador del torneo, dueño del club, o la propia persona según el recurso. **ADMIN puede todo lo que puede un dueño.**

| Recurso | Endpoint | Quién |
|---|---|---|
| Cuenta | `POST /api/auth/register`, `/login`, `/logout` | — |
| | `GET /api/auth/me` | — (devuelve `user: null` sin sesión) |
| | `POST /api/auth/roles` | sesión |
| Usuarios | `GET /api/users` | sesión (reducido salvo admin) |
| | `POST /api/users` | ADMIN |
| | `GET/PATCH/DELETE /api/users/:id` | la propia persona o ADMIN |
| Torneos | `GET /api/tournaments`, `/:id`, `/:id/teams`, `/standings`, `/scorers` | — |
| | `POST /api/tournaments` | rol ORGANIZADOR |
| | `PATCH/DELETE /api/tournaments/:id` | organizador del torneo |
| | `POST /api/tournaments/:id/teams` | organizador del torneo, o dueño del club que se inscribe |
| | `DELETE /api/tournaments/:id/teams/:clubId` | ídem |
| | `POST/DELETE /api/tournaments/:id/fixture` | organizador del torneo |
| Partidos | `GET /api/matches`, `/:id`, `/:id/events` | — |
| | `POST /api/matches` | organizador del torneo |
| | `PATCH /api/matches/:id`, `POST /:id/events`, `DELETE /:id/events/:eventId` | organizador del torneo del partido |
| Clubes | `GET /api/clubs`, `/:id`, `/:id/categories`, `/:id/staff` | sesión |
| | `GET /api/clubs/:id/players` | sesión (fecha de nacimiento solo el dueño) |
| | `POST /api/clubs` | rol CLUB_OWNER |
| | `PATCH /api/clubs/:id`, `POST` categories, staff, players | dueño del club |
| | `GET/POST /api/clubs/:id/invite-link`, `GET/POST /:id/invite` | dueño del club |
| Jugadores | `GET /api/players` | sesión (correo y teléfono solo ADMIN) |
| | `GET /api/players/:id` | sesión (fecha de nacimiento: propio, dueño del club, ADMIN) |
| | `PATCH /api/players/:id` | posición y dorsal: el propio jugador o el dueño de su club. Club, categoría y estado: solo el dueño del club (o quien inscribe a un jugador libre) |
| Invitaciones | `GET /api/invitations/:token` | — |
| | `POST /:token/accept`, `/decline`, `GET /api/invitations/mine` | sesión |
| Admin | `GET /api/admin/stats` | ADMIN |

## Pantallas
Modal de login y registro en la landing (con contraseña); `/seleccion-perfil` activa el rol elegido; los tres "Cerrar sesión" (organizador, club, jugador) cierran la sesión; el contexto `useAuth()` expone `user`, `loading`, `login`, `register`, `logout`, `addRole`, `refresh`.

## Limitaciones conocidas
- **Sin límite de intentos** en login ni registro (fuerza bruta). Conviene activar las reglas de límite del firewall de Vercel.
- **Sin recuperar ni cambiar contraseña.** El enlace "Olvidé mi contraseña" y el botón "Continuar con Google" no hacen nada.
- **Sin protección CSRF más allá de `SameSite=Lax`.**
- **La sesión es *stateless*:** "Cerrar sesión" borra la cookie del navegador, pero un token robado sirve hasta que vence (7 días) o se borre al usuario. No hay renovación.
- Registrarse con un correo ya usado revela que existe (`409`). Es el costo habitual de un registro con mensajes claros.
- Los 15 usuarios del seed no pueden entrar (hash inválido, a propósito).
