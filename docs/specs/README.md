# Especificaciones de Amateur

Este directorio explica **qué hace la plataforma y por qué**, para que alguien nuevo (o tú dentro de tres meses) no tenga que reconstruirlo leyendo el código.

## Índice

| Documento | Qué cubre |
|---|---|
| [constitution.md](constitution.md) | Principios, stack, convenciones, cómo se prueba y se despliega |
| [modelo-de-datos.md](modelo-de-datos.md) | Entidades, relaciones e invariantes de la base |
| [001-autenticacion-y-permisos.md](001-autenticacion-y-permisos.md) | Sesiones, roles, permisos por ruta |
| [002-crear-torneo-y-equipos.md](002-crear-torneo-y-equipos.md) | Asistente "Crear torneo" e inscripción de equipos |
| [003-fixture.md](003-fixture.md) | Iniciar un torneo: generación y calendario de partidos |
| [004-partido-en-vivo.md](004-partido-en-vivo.md) | Ciclo de un partido, jugadas, marcador y resultados |
| [005-invitaciones.md](005-invitaciones.md) | Link del club e invitaciones directas a jugadores |
| [006-solicitudes-de-equipos.md](006-solicitudes-de-equipos.md) | Solicitudes e invitaciones de equipos a un torneo, alta de club y convocatoria pública |
| [007-fixture-eliminacion-copa-relampago.md](007-fixture-eliminacion-copa-relampago.md) | Cuadro de eliminación, Copa (grupos + cuadro) y Relámpago, con tiempo extra y penales. API y pantallas implementadas |
| [008-observaciones-octubre-2026.md](008-observaciones-octubre-2026.md) | Seis observaciones del organizador y el admin (octubre 2026): llaves para liga, partidos por torneo y fecha, editar por pestañas, sedes que se propagan, torneos eliminados recuperables |
| [009-jugadores-provisionales.md](009-jugadores-provisionales.md) | Jugadores cargados por el admin sin cuenta (para goleadores), que luego se vinculan a su cuenta o se unen a una ficha existente sin perder datos. **Entregas 1 a 3 implementadas** (carga por el panel o por script, goleadores, asignar cuenta e invitaciones) |
| [010-tiempos-del-partido.md](010-tiempos-del-partido.md) | Finalizar el primer tiempo, descanso con el cronómetro detenido e iniciar el segundo tiempo en el partido en vivo; la cronología pública separa los tiempos con el descanso real |
| [pendientes-y-decisiones.md](pendientes-y-decisiones.md) | Lo que falta, decisiones abiertas y limitaciones conocidas |

## Glosario

- **Delegado** es el nombre que ve la gente del perfil que dirige un equipo: el dueño del club. Por dentro no cambia nada: el rol sigue siendo `CLUB_OWNER`, la columna `Club.ownerId` y las rutas siguen igual, y los documentos y comentarios del código pueden decir "dueño" para referirse a lo mismo. Solo cambió lo que se ve en pantalla (elegir perfil, panel de admin, avisos). Un equipo **temporal** todavía no tiene delegado: figura quien lo cargó (el organizador) hasta que un admin lo oficializa.

## Cómo se usa esto

1. **El código y las pruebas son la verdad; estos documentos explican el porqué.** Si un documento y una prueba se contradicen, gana la prueba y el documento tiene un error: corrígelo.
2. **Cada especificación enlaza a las pruebas que la verifican.** Una regla de negocio sin prueba es una promesa; con prueba, es un hecho.
3. **Se actualizan en el mismo PR que cambia el comportamiento.** No después. Un documento desactualizado es peor que no tenerlo.
4. **Lo nuevo se escribe primero.** Para una funcionalidad nueva, la especificación se redacta y se revisa antes de implementarla (ver "Flujo de trabajo" en la constitución).

## Estado de estas especificaciones

Las especificaciones `001`–`008` son **as-built**: describen lo que ya está construido y verificado, extraído del código y de las pruebas, no un plan. Cada una termina con sus **limitaciones conocidas**, que es la parte más útil para decidir qué construir después. Todo lo pendiente se concentra en [pendientes-y-decisiones.md](pendientes-y-decisiones.md).

La `006` se **escribió antes de programar** y después se reescribió como as-built; conserva la sección de decisiones adoptadas que aún esperan confirmación.

Cuando algo dice **"decisión pendiente"** es porque el código toma un camino por omisión que nadie ha confirmado como producto.
