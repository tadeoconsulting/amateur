# Pendientes y decisiones

Todo lo que falta o que hoy funciona "por omisión". Tres partes: **decisiones de producto** (necesitan que alguien decida), **funcionalidad pendiente** (ordenada) y **deuda técnica y de operación**.

## 1. Decisiones de producto abiertas

El código tomó un camino por omisión en cada una. Confirmarlo o cambiarlo es una decisión de producto, no técnica.

| # | Decisión | Qué hace hoy | Documento |
|---|---|---|---|
| 1 | **¿Qué significa "Penal"?** | Solo deja constancia en la crónica; un penal convertido se registra como gol | [004](004-partido-en-vivo.md) |
| 2 | **¿El dueño aprueba a quienes entran por link?** | Entran directo, sin aprobación, hasta que se revoca el link | [005](005-invitaciones.md) |
| 3 | **¿Los links del club deben vencer?** | No vencen; solo se revocan | [005](005-invitaciones.md) |
| 4 | **¿Cómo se resuelven los empates en eliminación directa?** | **Resuelta e implementada:** tiempo extra y, si sigue, penales (ver [007](007-fixture-eliminacion-copa-relampago.md)) | [007](007-fixture-eliminacion-copa-relampago.md) |
| 5 | **¿Sorteo o el orden de inscripción?** ¿Ida y vuelta? | Orden de inscripción, una sola vuelta | [003](003-fixture.md) |
| 6 | **¿Qué es "Copa" y qué es "Relámpago"?** | **Resuelta e implementada:** Copa = grupos + eliminación; Relámpago = eliminación en un día (ver [007](007-fixture-eliminacion-copa-relampago.md)) | [007](007-fixture-eliminacion-copa-relampago.md) |
| 7 | **¿Qué hace "Asignar un delegado a cada equipo"?** ¿Y "jugadores por equipo"? | Se guardan y no tienen efecto | [002](002-crear-torneo-y-equipos.md) |
| 8 | **¿Dónde se muestran y cómo se usan las bases y los costos?** | Se guardan; ninguna pantalla los muestra | [002](002-crear-torneo-y-equipos.md) |
| 9 | **¿El dueño del club confirma que lo inscriban? ¿El organizador aprueba a quien se inscribe solo?** | **Ambos, sí** (implementado por recomendación, falta tu confirmación): el dueño solicita y el organizador aprueba; al club ajeno se le invita y su dueño acepta | [006](006-solicitudes-de-equipos.md), decisiones A y B |
| 10 | **¿Qué es una sede?** | **Resuelta e implementada:** entidad `Sede` guardada por organizador (nombre, ciudad, dirección, referencia) y reutilizable al crear torneos, con pantalla "Mis sedes" para gestionarlas. `Tournament`/`Match.location` siguen siendo texto libre, no una clave foránea — la sede es solo un atajo para no reescribir la dirección cada vez | [modelo](modelo-de-datos.md) |
| 11 | **Sistema de puntos y desempates** | Fijos: 3/1/0; desempate por diferencia de gol y goles a favor (sin enfrentamiento directo) | [004](004-partido-en-vivo.md) |
| 12 | **¿Cómo se entera un jugador de una invitación?** | **Resuelta e implementada:** badge en la pestaña de "Mis Equipos" (jugador) y "Equipo" (club, para invitaciones de staff); la de un club a un torneo ya tenía badge en "Solicitudes". Sigue sin cubrir a quien recibe una invitación de staff sin tener club propio (decisión explícita, ver funcionalidad pendiente 2). | [005](005-invitaciones.md) |
| 13 | **Alcance geográfico** | Todo asume Perú: departamentos, DNI, moneda `S/` | — |
| 14 | **¿Qué pasa con `FAN` y `SPONSOR`?** | `FAN` sigue sin funcionalidad. `SPONSOR` **tiene un primer alcance implementado**: modelo `Sponsor`/`TournamentSponsor`, admin-only (`/admin/sponsors`), logo visible en la convocatoria pública del torneo — decisión explícita: alta gestionada por el admin (no self-service), sin paquetes ni reportes de alcance todavía. Ninguno de los dos se ofrece al registrarse ni en `/seleccion-perfil`. | [constitución](constitution.md), [001](001-autenticacion-y-permisos.md) |
| 15 | **¿Las páginas `/dev` y `/design-system` deben ser públicas?** | Lo son (no pasan por el proxy). No exponen datos, pero muestran todas las pantallas. | — |
| 16 | **¿Un jugador puede estar en más de un club?** | **Resuelta e implementada (octubre 2026):** sí — una ficha por club, y elige con cuál "sale a la cancha hoy" (Mis equipos y el selector de Actividad). Sumarse a un club no saca de los otros. Un club no puede agregar directo a quien ya está en otro: tiene que invitarlo y él decide. | [modelo de datos](modelo-de-datos.md), [005](005-invitaciones.md) |

## 2. Funcionalidad pendiente

En el orden que parece más útil (cada una debería empezar por su especificación):

1. **Tiempo real para espectadores — implementado solo en la ficha del partido.** `/torneos/:id/partidos/:matchId` recibe cada jugada sin recargar, con Ably (ver [004](004-partido-en-vivo.md), sección "Tiempo real"). Falta:
   - Llevarlo a la previa, a "en vivo" del organizador, a la tabla de posiciones, a los goleadores y a la lista de partidos.
   - **Aprovisionar `ABLY_API_KEY` en Vercel** (Production y Preview): sin ella, todo sigue funcionando, pero nadie recibe nada en vivo. Ver [constitución](constitution.md).
   - **Modelar el costo de Ably contra el Revenue Streams del BMC** antes de acercarse a los picos previstos (100 000 espectadores): a esa escala no es trivial (`docs/arquitectura.md` §8, fuera de este repo).
2. **Notificaciones — cubre organizador, club y jugador; falta un caso de borde.** `/notificaciones` (organizador) muestra las solicitudes reales de un club pidiendo unirse a un torneo. La invitación de un organizador a un club ya vivía en la pestaña "Solicitudes" de `/club/torneos` (con badge); la de un club a un jugador, en "Mis Equipos" del jugador — ahora ambas tienen badge en su tab del bottom nav, y las invitaciones de staff (DT, delegado, asistente) se ven y se aceptan desde "Equipo" del club, también con badge (`/club/notificaciones` ahora redirige ahí; antes era una pantalla vacía fija). **Falta:** alguien invitado como staff que no tiene ningún club propio no ve la invitación en ningún lado (decisión de producto: se aceptó esa limitación por ahora — ver decisión 12); y el organizador sigue sin badge de conteo en su propia campana.
3. **Recuperar y cambiar contraseña; inicio con Google.** Hoy los botones existen y no hacen nada.
4. **Vincular la alineación guardada con `PlayerStats.matchesPlayed` y las asistencias.** Guardar la lista de titulares ya persiste (`MatchLineup`, por partido y por club) y el staff del club ya se puede editar de rol o quitar desde la interfaz — ambos implementados. Falta decidir y construir cómo esa alineación alimenta las estadísticas agregadas del jugador: ¿cuenta como "jugado" solo estar en la lista de titulares, o hace falta registrar entradas/salidas y minutos reales?
5. **Sponsors — primer alcance implementado (decisión 14).** `/admin/sponsors`: alta y edición de sponsors, y de qué torneos auspicia cada uno (checklist de torneos). Su logo se ve en la convocatoria pública del torneo (`/convocatoria/:id`), con link a su sitio. Todo admin-only, sin self-service. Falta, si en algún momento se prioriza: paquetes de auspicio (nombre, precio de referencia, qué incluye) y reportes de alcance reales (requiere instrumentar tracking de vistas, que hoy no existe en la app).

Resueltas e implementadas en este ciclo (quedan fuera de esta lista; el detalle de cada una vive en su commit/PR):
- Entidad `Sede` reutilizable al crear un torneo (decisión 10).
- Deshacer un fixture ya generado, desde la pantalla del torneo.
- Asignar grupos desde la interfaz para el formato `grupos`.
- Editar el minuto de una jugada y deshacer cualquiera, no solo la última.
- Cancelar una invitación personal ya enviada, desde el club.
- Asignar o liberar un jugador entre categorías del mismo club, desde la interfaz.

## 3. Deuda técnica y de operación

### Seguridad
- **Sin límite de intentos** en login y registro. Activar reglas de límite en el firewall de Vercel.
- **Sin protección CSRF** más allá de `SameSite=Lax`.
- La sesión es *stateless*: no se puede invalidar una en particular.

### Operación
- **No hay integración continua.** Nada corre las pruebas ni el `tsc` al abrir un PR; hoy se corren a mano. Es la mejora de mayor retorno. Las pruebas de integración necesitan una base desechable (una rama de Neon por ejecución).
- **Los *previews* de Vercel usan la base de producción** (comparten `DATABASE_URL`). Un preview puede leer y escribir datos reales. Conviene una rama de Neon para *Preview*.
- **La suite de integración tarda más de 10 minutos** (latencia hacia la base, y cada prueba crea sus usuarios). Se puede paralelizar o reducir la preparación.
- `app/README.md` es el de la plantilla de Next; no documenta el proyecto.

### Código
- **Lint:** 10 errores y 18 avisos preexistentes (casi todos `react-hooks/set-state-in-effect` de React 19 y variables sin usar). No rompen nada en ejecución.
- **Estados y formatos como `String`** en la base, no como enum: los valores válidos se hacen cumplir solo en la API.
- **`MatchEvent.teamId` sin relación** con `Club`; sin índices más allá de claves y unicidades.
- **Duplicación de pantallas:** las de "Jugadores" existen casi idénticas en organizador y club; `torneos/[id]/partido` y `partidos/[matchId]` cubren cosas parecidas.
- `src/lib` y `src/_lib` (ver constitución); el alias `test:auth` de `test:api`.
- **El design system del código no coincide con `design-system/amateur/MASTER.md`:** el documento define Fredoka + Nunito y un rosa primario; el código carga Inter, Lexend y Lato. Falta decidir cuál es la fuente de verdad.
- `_lib/api.ts` usa `http://localhost:3000` para las llamadas hechas desde el servidor. Hoy ninguna pantalla lo hace, pero fallaría en producción.
