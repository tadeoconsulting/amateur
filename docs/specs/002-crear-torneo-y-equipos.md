# 002 · Crear torneo y agregar equipos

**Estado:** implementada (as-built).
**Código:** `src/app/crear-torneo/*`, `src/_lib/tournament-input.ts`, `src/_lib/tournament-labels.ts`, `src/app/api/tournaments/route.ts`, `.../[id]/route.ts`, `.../[id]/teams/*`, `src/app/(organizador)/torneos/*`.
**Pruebas:** `tests/torneos.test.mjs` (20), y los permisos de torneos y clubes en `tests/auth.test.mjs`.

## Objetivo
Que un organizador cree un torneo con todo lo necesario, lo abra a inscripción y sume equipos (existentes de la comunidad o temporales).

## El torneo

### Formatos y estados
| `format` | Etiqueta | Lo elige el asistente como |
|---|---|---|
| `liga` | Liga | Formato de Liga |
| `eliminacion` | Eliminación | Eliminación directa |
| `copa` | Copa | Formato Copa |
| `relampago` | Relámpago | Relámpago |
| `grupos` | Grupos | *(no está en el asistente; existe en torneos anteriores)* |

Un valor desconocido se muestra como "Eliminación". La lista y las etiquetas viven **solo** en `tournament-labels.ts`.

`status`: `draft`, `inscripcion`, `en_curso`, `finalizado`. Los torneos creados por el asistente nacen en **`inscripcion`**.

### Validación (`parseTournamentFields`, la misma para crear y editar)
| Campo | Regla |
|---|---|
| `name` | 1–120 caracteres |
| `format`, `status` | de las listas de arriba |
| `maxTeams` | entero 2–256 · `minTeams`: entero 2–256, no mayor que `maxTeams` |
| `startDate`, `endDate` | fechas reales (`2026-02-31` se rechaza); `endDate` no anterior a `startDate` |
| `location` | 1–200 caracteres |
| `category` | hasta 60 · `modality`: `5 vs 5`…`11 vs 11` · `gender`: `Femenino`, `Masculino`, `Mixto` |
| `minutesPerHalf` | entero 1–90 · `playersPerTeam`: entero 1–50 |
| `assignDelegates` | booleano · `registrationFee`, `refereeFee`: hasta 60 caracteres |
| `rules` | lista de hasta 50 textos de hasta 500 caracteres |

Al **crear** son obligatorios `name`, `format`, `maxTeams`, `startDate` y `location`. Los campos desconocidos se ignoran (no se puede escribir `id`, `createdAt` ni `organizerId`). Los opcionales aceptan `null`.

### Crear y editar
1. `POST /api/tournaments` exige rol `ORGANIZADOR`. **El organizador es quien crea**; solo un admin puede crear a nombre de otro.
2. `PATCH /api/tournaments/:id` lo hace el organizador. **No se puede bajar `maxTeams` por debajo de los equipos ya inscritos** (`400`). Un pedido sin campos da `400`.
3. `GET /api/tournaments?organizerId=` filtra; "Mis torneos" pide solo los de la persona con sesión.

## El asistente (3 pasos)
Vive en `/crear-torneo`. Los datos se conservan al ir y volver entre pasos (contexto en el layout) y se descartan al salir o recargar. Al entrar, se activa el rol `ORGANIZADOR` si la persona no lo tenía.

| Paso | Obligatorio para continuar |
|---|---|
| 1 · Información | nombre, fecha de inicio y sede |
| 2 · Modalidad | modalidad, tipo de competencia y **al menos 2 equipos**. Género y categoría son opcionales. |
| 3 · Bases | nada. Minutos, jugadores, delegado, costos y condiciones son opcionales. |

"Crear torneo" envía todo con `status: "inscripcion"`, muestra la confirmación con las bases y lleva al torneo nuevo. Un `0` en minutos o jugadores significa "sin definir" (se envía `null`). La sede se guarda como el texto `"nombre, dirección"` en `location`.

## Agregar equipos

### Reglas de la inscripción (`POST /api/tournaments/:id/teams`)
1. Solo con el torneo en `draft` o `inscripcion` (`409` si ya empezó) y con cupo (`409` "ya tiene todos sus equipos").
2. Inscribe el **organizador** (o admin), o el **dueño de un club** para inscribir el suyo. Otra persona: `403`.
3. Un club que no existe: `404`. Uno ya inscrito: `409`.
4. Con `{ groupName }` se asigna el grupo (solo tiene efecto en formato `grupos`).

### Equipo temporal (`{ newClub: { name, shortName, color? } }`)
5. Lo crea **solo el organizador del torneo**. Un dueño de club que lo intenta recibe `403`.
6. `name` 1–80, `shortName` 1–12, `color` con formato `#RRGGBB` o ausente.
7. El club y la inscripción se crean **en una transacción**. Su dueño es quien lo creó y `isTemporary` es `true`.
8. **No aparece en la búsqueda de la comunidad** (`GET /api/clubs` lo excluye salvo que se pida `ownerId` igual al propio) y **nadie más puede inscribirlo** en otro torneo (`403`).

### Quitar (`DELETE /api/tournaments/:id/teams/:clubId`)
9. Lo hace el organizador; el dueño de un club puede retirar el suyo, pero no el de otro (`403`).
10. Solo con el torneo abierto (`409`) y si el equipo **no tiene partidos** en ese torneo (`409`).
11. Un equipo temporal se **borra por completo** al quitarlo (si nada más depende de él).

## Pantallas
- **Detalle del torneo en convocatoria:** pestaña *Inscritos* con la lista y "Quitar", el contador `n/máx`, "Agregar equipo" mientras haya cupo, y **"Iniciar torneo" con 2 equipos o más**. *Solicitudes* e *Invitados* muestran un texto vacío.
- **Buscar equipo:** clubes reales de la comunidad con su delegado; "Agregar" y "Quitar" guardan; se ve el contador y se deshabilita si no hay cupo o el torneo empezó.
- **Crear equipo:** formulario de equipo temporal; al terminar vuelve al torneo.

## Limitaciones conocidas
- **Las sedes no se guardan:** hay que recrearlas en cada torneo. La pantalla "Mis sedes" de ajustes no está conectada. No existe una entidad `Sede`.
- **La búsqueda de dirección no tiene buscador:** se puede usar el texto escrito. El mapa es un marcador de posición y "Usar mi ubicación actual" guarda un texto fijo.
- **Se guardan pero ninguna pantalla los muestra ni tienen efecto:** `rules`, `registrationFee`, `refereeFee`, `assignDelegates`, `playersPerTeam` y el `gender` del torneo. Solo `modality` (en "Mis torneos") y `minutesPerHalf` (duración del horario y del partido en vivo) se usan.
- **"Definir edad"** en la categoría no pregunta la edad.
- **No hay forma de asignar grupos** desde la interfaz (formato `grupos`): solo por API.
- **"Editar torneo"** no hace nada; el torneo solo se edita por API.
- **La tarjeta "Invitar por WhatsApp" de agregar equipos** muestra un link inventado (`amateur.IA40Za.com`). Hacerla real necesita un modelo de solicitudes de equipos (ver [pendientes](pendientes-y-decisiones.md)).
- **"Omitir este paso"** sale del asistente y descarta lo escrito; no guarda borradores.
- Al inscribir un club, su dueño **no confirma** (el organizador lo agrega directo) y un dueño **puede inscribirse solo** sin aprobación del organizador. La propuesta que lo cambia está en [006](006-solicitudes-de-equipos.md).
