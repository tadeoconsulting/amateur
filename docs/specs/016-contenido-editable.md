# 016 · Contenido editable: Centro de ayuda, Términos y condiciones y Políticas

**Estado:** ✅ **Implementada** (octubre 2026). Las decisiones 1 a 4 las tomó el usuario; las demás (S1 a S5) son supuestos razonables, marcados como tales, que se pueden cambiar.
**Código:** `prisma/schema.prisma` (`ContentItem`, enum `ContentKind`) y su migración; `src/_lib/content.ts` (reglas puras y validación), `src/_lib/content-defaults.ts` (el texto de siempre, de respaldo), `src/_lib/content-server.ts` (lectura); `src/app/api/admin/contenido/[kind]/route.ts`; editor en `src/app/(admin)/admin/contenido/**`; páginas públicas `src/app/{ayuda,terminos,privacidad}/page.tsx`.
**Origen:** observaciones 43 y 44 del board (decisiones abiertas "Términos y condiciones: cómo y dónde se administran" y "Centro de ayuda: dónde se realiza la experiencia"). El usuario resolvió el 2026-10-29: **editables desde el admin, un editor aparte por tipo de sección, y comunes a toda la plataforma**.
**Toca:** [001](001-autenticacion-y-permisos.md) (ruta de admin), [modelo-de-datos.md](modelo-de-datos.md).

## Objetivo
Que el texto legal y la ayuda dejen de vivir en el código. El administrador los edita sin pedir un cambio de código, y lo que escribe se ve igual en todas partes donde se enlazan (landing, registro y los ajustes de organizador, delegado y jugador).

## Decisiones
| # | Tema | Decisión |
|---|---|---|
| 1 | Dónde se administra | **Desde el panel de admin**, no desde archivos del repositorio. |
| 2 | Alcance | **Común a toda la plataforma**: una sola versión de cada documento, la misma para cualquier perfil. |
| 3 | Tipos | **Tres, cada uno con su propio editor:** Centro de ayuda, Términos y condiciones y Políticas de privacidad. |
| 4 | Quién edita | Solo un **ADMIN**. |
| S1 | Formato | Texto plano: una sección = título (opcional) + texto con párrafos separados por una línea en blanco. **Sin HTML ni Markdown**, así lo escrito nunca puede inyectar nada en la página. |
| S2 | Estructura | Cada documento es una **lista ordenada de secciones**. En *Términos* y *Políticas*, una sección sin título es el párrafo de apertura. En *Ayuda*, cada sección es una **pregunta con su respuesta** y pertenece a una **categoría** (las pestañas). |
| S3 | Guardado | El editor guarda **el documento entero de una vez** ("Guardar y publicar"): crear, editar, reordenar y quitar secciones se ven juntos o no se ven. Sin borradores ni historial de versiones. |
| S4 | Respaldo | Mientras un tipo no tenga secciones guardadas, la página pública muestra **el texto de partida** (`content-defaults.ts`), para que nunca quede vacía. El editor **llega precargado con ese texto** (con un aviso) y, al publicar, pasa a ser el del admin. **"Volver al texto de partida"** borra lo guardado. |
| S5 | Revisión legal | El texto de Términos y Políticas que se carga de partida es genérico: **debe revisarlo alguien legal** antes de darlo por definitivo (en particular, los datos de menores). Esta funcionalidad lo vuelve editable; no lo valida. |

## Modelo
`ContentItem`: `id`, `kind` (`AYUDA` | `TERMINOS` | `POLITICAS`), `category` (solo Ayuda; `null` en los otros), `title` (puede ser vacío salvo en Ayuda), `body`, `position` (orden dentro del tipo), `updatedAt`, `updatedById`. Único por `(kind, position)`.

### Reglas de validación (`content.ts`, función pura)
- Hasta **100 secciones** por tipo; título hasta **200**; texto hasta **5000**; categoría hasta **60** caracteres. Se recortan los espacios de los bordes.
- **Ayuda:** categoría, pregunta y respuesta son obligatorias. Las categorías salen de las secciones, en el orden en que aparecen.
- **Términos y Políticas:** el texto es obligatorio; el título es opcional y no lleva categoría.
- Un tipo desconocido da `404`; un cuerpo mal formado, `400` con el motivo.

## API
| Ruta | Quién | Qué hace |
|---|---|---|
| `GET /api/admin/contenido/:kind` | ADMIN | Las secciones guardadas del tipo, en orden, más `usingDefaults` si no hay ninguna (y entonces devuelve el texto de respaldo para precargar el editor). |
| `PUT /api/admin/contenido/:kind` | ADMIN | Reemplaza **todas** las secciones del tipo por las enviadas, en una transacción. Enviar la lista vacía las borra y la página vuelve al texto de respaldo. |

`:kind` es `ayuda`, `terminos` o `politicas`. Las páginas públicas (`/ayuda`, `/terminos`, `/privacidad`) leen directo de la base, sin API pública ni cuenta.

## Pantallas
- **Admin → Contenido** (`/admin/contenido`): tres pestañas, una por tipo. Lista de secciones con título, texto, y (en Ayuda) categoría; botones para **subir, bajar, quitar y agregar**; **Guardar y publicar** (deshabilitado sin cambios) y **Descartar cambios**. Aviso de cambios sin guardar al cambiar de pestaña y al cerrar o recargar la página.
- **Públicas:** mismo diseño de hoy (marco móvil, acordeón por categorías en Ayuda), con el texto de la base. El texto se muestra con sus saltos de línea y nada más.
- **Enlaces:** los ajustes del organizador pasan de `#` a `/ayuda`, `/terminos` y `/privacidad`, y los del club suman Políticas (los del jugador ya los tenían).
- **Texto de partida:** se corrigieron las tildes, se cambió "dueño de club" por "delegado", y se **quitó** la promesa de que las modificaciones "serán notificadas a los usuarios", porque esa notificación no existe. Las preguntas de ayuda se pusieron al día (ya no menciona el formato "grupos"; indica que las bases son opcionales al crear un torneo).

## Fuera de alcance
Historial de versiones y "volver a una versión anterior"; borradores; idiomas; búsqueda dentro del Centro de ayuda; texto con formato (negritas, enlaces, imágenes); aviso a los usuarios cuando cambian los Términos o las Políticas (hoy el texto genérico dice que se notificará; esa notificación **no** existe todavía).

## Pruebas
- Unitarias de `content.ts`: validación por tipo, límites, categorías en orden, recorte de espacios.
- Integración: 401 sin sesión y 403 para no administradores; guardar y leer; el texto guardado aparece en la página pública; la lista vacía devuelve el respaldo; reemplazar no deja secciones viejas.
- Pantalla verificada en un navegador contra una base local.
