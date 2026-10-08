# Modelo de datos

Fuente: `app/prisma/schema.prisma`. Aquí solo lo que el esquema no dice: **para qué sirve cada cosa y qué reglas deben cumplirse siempre**.

## Mapa

```
User ──< UserRole                     (un usuario, varios roles)
User ──1 PlayerProfile >── Club        (un jugador pertenece a UN club o a ninguno)
User ──< Club (ownerId)                (un usuario puede ser dueño de varios clubes)
User ──< Tournament (organizerId)
Club ──< TeamCategory, StaffMember
Club ──< TournamentTeam >── Tournament (inscripción de un club en un torneo)
Club ──< TournamentRequest >── Tournament (solicitud del club o invitación del organizador)
Tournament ──< Match >── Club (local y visitante)
Match ──< MatchEvent >── PlayerProfile
PlayerProfile ──< PlayerStats >── Tournament   (estadísticas por jugador y torneo)
Club ──< PlayerInvitation                (invitaciones personales)
```

## Entidades y reglas

### User / UserRole
- `email` es único y se guarda en minúscula. Las búsquedas por correo son insensibles a mayúsculas.
- `passwordHash` es un hash de `bcryptjs`. Un valor que no es un hash válido (como `$2b$10$placeholder` del seed) **nunca** autentica.
- Un usuario debería tener al menos un rol: lo hace cumplir la API (registro y quitar rol), no la base de datos. `(userId, role)` sí es único en la base.
- Roles: `ADMIN`, `ORGANIZADOR`, `CLUB_OWNER`, `JUGADOR`, `SPONSOR`, `FAN`. Los dos últimos no tienen funcionalidad todavía.
- **Un administrador es solo administrador:** `ADMIN` no se combina con ningún otro rol (lo hacen cumplir la API de usuarios y de activar perfiles, `_lib/admin-roles.ts`). Entra por `/admin/login`; el login público lo rechaza. `npm run db:make-admin` deja una cuenta solo con `ADMIN` (y se niega si ya tiene torneos, clubes o equipos); `npm run db:remove-admin` le quita el rol a una cuenta con otros perfiles.
- **Eliminar una cuenta** (`DELETE /api/users/:id`, un admin o la propia persona; nunca la de un admin ni la propia desde el panel): se lleva sus fichas de jugador (con estadísticas y alineaciones; en las jugadas queda el registro sin jugador), su pertenencia a staff, las invitaciones y solicitudes que creó y sus roles. **No se elimina** si dirige equipos u organiza torneos: hay que resolver eso antes (`_lib/delete-user.ts`).
- **Cambiar el correo** (`PATCH /api/users/:id` con `email`, solo un admin): es el correo de acceso; se valida el formato y no puede coincidir con otra cuenta (sin distinguir mayúsculas). La contraseña no cambia.
- `organizerSlug`: primer tramo de la URL pública de sus torneos (`/{organizerSlug}/{slug}`). Único; se asigna al crear su primer torneo, a partir de la organización (o de su nombre si no tiene), con sufijo `-2`, `-3`… si ya existe, y nunca es una pantalla de la app (`_lib/slug.ts › RESERVED_SLUGS`). No cambia aunque se edite la organización.

### Club
- `ownerId` es obligatorio: todo club tiene un dueño, incluso un equipo temporal (su dueño es el organizador que lo creó).
- `isTemporary`: equipo creado por un organizador para su torneo, sin delegado ni métricas. No aparece en la búsqueda de la comunidad y solo lo puede inscribir su creador (o un admin). Al quitarlo del torneo se borra.
- **Oficializar:** un admin puede pasar un equipo temporal a un delegado con cuenta propia (`POST /api/clubs/:id/oficializar`): cambia el `ownerId`, quita `isTemporary` y da el rol `CLUB_OWNER`. No admite un administrador ni un dueño que ya dirige otro equipo (la app del club trabaja con un equipo por cuenta). El equipo sigue inscrito en sus torneos.
- **Eliminar un equipo** (`DELETE /api/clubs/:id`, solo un admin): no se puede si tiene partidos en algún torneo (primero hay que eliminar el torneo). Sin partidos se va con sus categorías, staff, invitaciones, solicitudes e inscripciones; sus jugadores quedan sin equipo, con su ficha y su cuenta.
- `inviteToken`: link para compartir; único; `null` hasta que se genera; secreto; rotarlo revoca el anterior.
- `delegado*`: datos de contacto del delegado del club (texto libre).

### PlayerProfile
- **Un usuario puede jugar en varios clubes: tiene una ficha (`PlayerProfile`) por club.** `(userId, clubId)` es único. Además puede tener una ficha "libre" (`clubId` null: solo la posición, todavía sin equipo, p. ej. la del registro); al sumarse a un club se usa esa ficha en vez de crear otra. Que haya una sola libre lo cuida el código (`_lib/invite.ts › joinClub`), no la base: en Postgres los `NULL` no chocan en un índice único.
- `categoryId`, `number` y las estadísticas son **de cada ficha** (de cada club). La posición es de la persona: se aplica a todas sus fichas.
- `User.activeClubId`: con qué equipo "sale a la cancha" hoy (el que muestra Actividad). Sin relación a propósito: si ya no es uno de sus equipos, se ignora y se usa el más antiguo (`_lib/player-clubs.ts › resolveActiveClubId`).
- `clubId` es opcional (ficha libre).
- `status` por defecto `"activo"`.

### PlayerStats
- Único por `(playerId, tournamentId)`. Cuenta `goals`, `yellowCards`, `redCards` (las actualizan las jugadas del partido). `assists` y `matchesPlayed` existen pero **nadie los actualiza todavía**.

### Tournament
| Campo | Regla |
|---|---|
| `format` | `liga`, `grupos`, `copa`, `relampago`, `eliminacion` (ver [002](002-crear-torneo-y-equipos.md)) |
| `status` | `draft`, `inscripcion`, `en_curso`, `finalizado` |
| `maxTeams` | entero 2–256; `minTeams` opcional, ≤ `maxTeams` |
| `startDate` / `endDate` | fechas reales; `endDate` ≥ `startDate` |
| `slug` | Segundo tramo de la URL pública (`/{organizerSlug}/{slug}`): sale del nombre al crearlo, con sufijo `-2`, `-3`… si el organizador ya tiene uno igual (único por `(organizerId, slug)`). No cambia al renombrarlo. `null` en torneos anteriores hasta correr `npm run db:backfill-slugs`; mientras tanto se usa `/convocatoria/{id}`. |
| `location` | texto libre: la sede ("nombre, dirección"). **No existe una entidad Sede.** |
| `modality`, `gender`, `minutesPerHalf`, `playersPerTeam`, `assignDelegates`, `registrationFee`, `refereeFee`, `rules` | Datos del asistente. Todos opcionales; los torneos anteriores no los tienen. |

Ciclo de vida: `inscripcion` → `en_curso` (al generar el fixture) → `finalizado` (al terminar su último partido). Detalle en [003](003-fixture.md) y [004](004-partido-en-vivo.md).

### TournamentTeam
- Único por `(tournamentId, clubId)`. `groupName` solo aplica a torneos de formato `grupos`.

### TournamentRequest
- Solicitud de un club para entrar a un torneo (`kind: request`) o invitación del organizador a un club (`kind: invite`). `status`: `pending`, `accepted`, `declined`, `cancelled`.
- **Una fila por par** `(tournamentId, clubId)`: volver a pedir tras un rechazo o una cancelación reabre la misma fila. Aceptar crea el `TournamentTeam` en la misma transacción.
- Índice por `(clubId, status)`. Se borra en cascada con el torneo o el club. Detalle en [006](006-solicitudes-de-equipos.md).

### Match
| Campo | Regla |
|---|---|
| `status` | `programado`, `en_curso`, `finalizado` |
| `homeScore`, `awayScore` | `null` mientras no empezó; nunca `null` en un partido `en_curso` o `finalizado` |
| `date` + `time` | Día (medianoche UTC) y hora de reloj de la cancha (`"HH:MM"`, 24 h, sin zona) |
| `time = ""` | **Partido sin programar** (fixture manual). Su `date` es provisoriamente la fecha de inicio del torneo. |
| `matchday` | Número de fecha, desde 1 |
| `startedAt` | Se fija al empezar; de ahí sale el cronómetro |

### MatchEvent
- `type`: `gol`, `tarjeta_amarilla`, `tarjeta_roja`, `sustitucion`, `penal`.
- `teamId` no tiene relación declarada con `Club` (se valida en la API que sea uno de los dos equipos del partido).
- Se borra en cascada con el partido.

### PlayerInvitation
- Invitación personal (a un correo). `status`: `pending`, `accepted`, `declined`. Vence a los 7 días. `token` único.
- El link general del club **no** usa esta tabla (usa `Club.inviteToken`).

## Reglas que cruzan entidades

1. Solo se inscriben o quitan equipos mientras el torneo está en `draft` o `inscripcion`, y hay cupo.
2. Un torneo con partidos no se puede reiniciar si algún partido ya empezó o tiene jugadas.
3. El torneo pasa a `finalizado` cuando **todos** sus partidos están `finalizado`, y vuelve a `en_curso` si se reabre uno.
4. Las tablas de posiciones cuentan solo partidos `finalizado`, por eso un partido terminado nunca tiene marcador vacío.
5. Un jugador con un club no se puede llevar a otro sin su consentimiento.

## Deuda del modelo (ver también [pendientes](pendientes-y-decisiones.md))
- Los estados y formatos son `String`, no enums de base de datos: los valores válidos se hacen cumplir en la API, no en Postgres.
- Sin entidad `Sede`: cada torneo y cada partido guardan un texto.
- Sin índices declarados más allá de las claves y las unicidades.
- `MatchEvent.teamId` sin relación con `Club`.
