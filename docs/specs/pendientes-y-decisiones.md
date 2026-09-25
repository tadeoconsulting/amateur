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
| 10 | **¿Qué es una sede?** | Es un texto; no se reutiliza entre torneos | [modelo](modelo-de-datos.md) |
| 11 | **Sistema de puntos y desempates** | Fijos: 3/1/0; desempate por diferencia de gol y goles a favor (sin enfrentamiento directo) | [004](004-partido-en-vivo.md) |
| 12 | **¿Cómo se entera un jugador de una invitación?** | Solo al abrir "Mis Equipos"; no hay notificaciones | [005](005-invitaciones.md) |
| 13 | **Alcance geográfico** | Todo asume Perú: departamentos, DNI, moneda `S/` | — |
| 14 | **¿Qué pasa con `FAN` y `SPONSOR`?** | Existen en el enum sin funcionalidad, y no se ofrecen al registrarse ni en `/seleccion-perfil` | [constitución](constitution.md), [001](001-autenticacion-y-permisos.md) |
| 15 | **¿Las páginas `/dev` y `/design-system` deben ser públicas?** | Lo son (no pasan por el proxy). No exponen datos, pero muestran todas las pantallas. | — |
| 16 | **¿"Ingresar como" debe activar un perfil que la cuenta no tenía?** | Sí, sin preguntar (es lo mismo que hace `/seleccion-perfil`) | [001](001-autenticacion-y-permisos.md) |

## 2. Funcionalidad pendiente

En el orden que parece más útil (cada una debería empezar por su especificación):

1. **Tiempo real para espectadores.** Hoy se ve el estado al abrir o recargar. La arquitectura prevista (SSE + Ably, hasta 100 000 espectadores y 5 000 organizadores simultáneos) está en los documentos de arquitectura del proyecto, fuera de este repo.
2. **Recuperar y cambiar contraseña; inicio con Google.** Hoy los botones existen y no hacen nada.
3. **Notificaciones** (decisión 12).
4. **Entidad `Sede`** con pantalla "Mis sedes" funcional (decisión 10).
5. **Regenerar o deshacer el fixture** desde la pantalla. (Editar un torneo ya existe, pero su botón solo aparece cuando el torneo no tiene equipos: ver [002](002-crear-torneo-y-equipos.md).)
6. **Alineaciones y `matchesPlayed`**, y asistencias.
7. **Asignar grupos** desde la interfaz para el formato `grupos`.
8. **Editar el minuto de una jugada** y deshacer cualquiera, no solo la última.
9. **Cancelar una invitación personal.**
10. **Las pantallas del dueño de club** aún usan un club fijo (`club-1`) en algunos lugares.
11. **Dashboard del organizador.** `/dashboard` (el ítem de la barra inferior) hoy solo muestra tres indicadores: torneos activos, equipos inscritos y torneos totales. Faltan las demás secciones, y hay que definir qué datos van (partidos, solicitudes pendientes, goleadores…).
12. **Sponsors.** En "Torneos" hay un título "Sponsors" con un "Ver Datos" que no hace nada. No existe modelo de datos ni pantalla; depende de la decisión 14.

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
