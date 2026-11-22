# 023 · Delegado: «Equipo» unificado, «Seguimiento» nuevo y «Gestión» más corta

**Estado:** 🟡 **en construcción, solo en local (2026-11-22).** Sin PR hasta que el usuario lo pida.
**Origen:** idea del usuario para el perfil de delegado (club): Jugadores y Equipo tienen muchos puntos en común y pueden ser una sola sección con tabs por dentro; Gestión se mantiene con Pagos y Dashboard; y una opción nueva en la barra, **Seguimiento**, junta el seguimiento del equipo (de inicio, Asistencias y Sesiones).
**Toca:** la navegación y las pantallas del club en `src/app/(club)/`. **Solo se reordena lo que ya existe**: sin API, base de datos ni migración, y sin funciones nuevas.

## Decisiones (tomadas por el usuario, 2026-11-22)
| # | Pregunta | Decisión |
|---|---|---|
| 1 | Sección única | **«Equipo»** con los tabs **Jugadores · Categorías · Planilla · Delegados**. |
| 2 | Gestión | Queda con **Dashboard y Pagos, como tabs**. Asistencia y Sesiones salen de ahí. |
| 3 | Seguimiento | **Solo mover y reordenar** lo que ya existe: tabs **Sesiones** y **Asistencia**, con las pantallas de hoy. |
| 4 | Enlaces viejos | **Nadie los tiene guardados**: las direcciones cambian sin redirecciones. |

## La barra del delegado
Antes: Torneos · Jugadores · Equipo · Gestión · Ajustes. **Ahora: Torneos · Equipo · Seguimiento · Gestión · Ajustes** (siguen siendo cinco). La insignia de invitaciones pendientes se queda en Equipo.

## Pantallas y direcciones
| Sección | Dirección | Tabs |
|---|---|---|
| Equipo | `/club/equipo` (`?tab=jugadores\|categorias\|planilla\|delegados`) | Jugadores (con sus tabs de género, la búsqueda y la invitación) · Categorías · Planilla · Delegados |
| Jugadores de una categoría | `/club/equipo/jugadores/[categoryId]` | — |
| Buscar e invitar jugadores | `/club/equipo/jugadores/buscar` · `/club/equipo/jugadores/invitar` | — |
| Seguimiento | `/club/seguimiento` (`?tab=sesiones\|asistencia`) | Sesiones (con Calendario, Horarios y Lugares) · Asistencia (con sus promedios) |
| Asistencia de una sesión | `/club/seguimiento/asistencia/[sessionId]` | — |
| Gestión | `/club/gestion` (`?tab=dashboard\|pagos`) | Dashboard · Pagos |

- Cada sección tiene **un solo encabezado** (título, notificaciones y ajustes) y sus tabs debajo; las pantallas que antes eran páginas sueltas pasan a ser el contenido de un tab.
- El tab elegido va en la dirección (`?tab=`): se puede volver a él desde una pantalla de detalle y sobrevive a recargar.
- Los tabs usan `SubTabs`, el mismo componente de siempre. Los tabs que ya tenían por dentro (género, Calendario…) se mantienen dentro del contenido.
- Se eliminan `/club/jugadores`, `/club/gestion/asistencia`, `/club/gestion/sesiones`, `/club/gestion/dashboard` y `/club/gestion/pagos` como páginas propias.

## Fuera de alcance
Resumen de asistencia por jugador, pantalla de inicio de Seguimiento con números rápidos, o cualquier función nueva: quedan para una entrega posterior de Seguimiento.

## Pruebas
- Unitarias: la barra del delegado (orden, direcciones, qué ítem queda activo en cada ruta) y que no queden enlaces a las direcciones eliminadas.
- Revisión visual en el navegador, en celular y escritorio, con un delegado de prueba.
