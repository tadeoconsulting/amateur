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
| [pendientes-y-decisiones.md](pendientes-y-decisiones.md) | Lo que falta, decisiones abiertas y limitaciones conocidas |

## Cómo se usa esto

1. **El código y las pruebas son la verdad; estos documentos explican el porqué.** Si un documento y una prueba se contradicen, gana la prueba y el documento tiene un error: corrígelo.
2. **Cada especificación enlaza a las pruebas que la verifican.** Una regla de negocio sin prueba es una promesa; con prueba, es un hecho.
3. **Se actualizan en el mismo PR que cambia el comportamiento.** No después. Un documento desactualizado es peor que no tenerlo.
4. **Lo nuevo se escribe primero.** Para una funcionalidad nueva, la especificación se redacta y se revisa antes de implementarla (ver "Flujo de trabajo" en la constitución).

## Estado de estas especificaciones

Las especificaciones `001`–`007` son **as-built**: describen lo que ya está construido y verificado, extraído del código y de las pruebas, no un plan. Cada una termina con sus **limitaciones conocidas**, que es la parte más útil para decidir qué construir después. Todo lo pendiente se concentra en [pendientes-y-decisiones.md](pendientes-y-decisiones.md).

La `006` se **escribió antes de programar** y después se reescribió como as-built; conserva la sección de decisiones adoptadas que aún esperan confirmación.

Cuando algo dice **"decisión pendiente"** es porque el código toma un camino por omisión que nadie ha confirmado como producto.
