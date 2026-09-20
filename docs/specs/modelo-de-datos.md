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

### Club
- `ownerId` es obligatorio: todo club tiene un dueño, incluso un equipo temporal (su dueño es el organizador que lo creó).
- `isTemporary`: equipo creado por un organizador para su torneo, sin delegado ni métricas. No aparece en la búsqueda de la comunidad y solo lo puede inscribir su creador (o un admin). Al quitarlo del torneo se borra.
- `inviteToken`: link para compartir; único; `null` hasta que se genera; secreto; rotarlo revoca el anterior.
- `delegado*`: datos de contacto del delegado del club (texto libre).

### PlayerProfile
- `userId` es único: **un usuario tiene un solo perfil de jugador, y por tanto un solo club a la vez**.
- `clubId` es opcional (jugador libre). `categoryId` y `number` son del club actual: **al cambiar de club se borran**.
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
| `location` | texto libre: la sede ("nombre, dirección"). **No existe una entidad Sede.** |
| `modality`, `gender`, `minutesPerHalf`, `playersPerTeam`, `assignDelegates`, `registrationFee`, `refereeFee`, `rules` | Datos del asistente. Todos opcionales; los torneos anteriores no los tienen. |

Ciclo de vida: `inscripcion` → `en_curso` (al generar el fixture) → `finalizado` (al terminar su último partido). Detalle en [003](003-fixture.md) y [004](004-partido-en-vivo.md).

### TournamentTeam
- Único por `(tournamentId, clubId)`. `groupName` solo aplica a torneos de formato `grupos`.

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
