# 002 · Crear torneo y agregar equipos

**Estado:** implementada (as-built).
**Código:** `src/app/crear-torneo/*` (incluye `tournament-to-wizard.ts`), `src/app/(organizador)/torneos/[id]/editar/*`, `src/app/(admin)/admin/torneos/_components/tournament-modal.tsx`, `src/_lib/tournament-input.ts`, `src/_lib/tournament-labels.ts`, `src/app/api/tournaments/route.ts`, `.../[id]/route.ts`, `.../[id]/teams/*`, `src/app/(organizador)/torneos/*`.
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

### Editar un torneo (`/torneos/[id]/editar`)
Reutiliza los tres pasos de `/crear-torneo`, cargados con lo que el torneo ya tiene (`tournament-to-wizard.ts` convierte el torneo al estado del asistente). Cambia solo lo que corresponde: "Edita tu torneo" en vez de "Crea tu primer torneo", "Cancelar" (vuelve al torneo) en vez de "Omitir este paso", y "Guardar cambios", que envía `PATCH /api/tournaments/:id` con los mismos campos que al crear, **sin `status`** (editar no cambia el estado).

- Rigen las mismas obligaciones que al crear. Un torneo antiguo al que le falta la modalidad, o con formato `grupos` (que el asistente ya no ofrece), pide elegirlas antes de guardar.
- La sede se reconstruye del texto `location`, cortando en la primera `", "`.
- Puede guardar el organizador del torneo o un admin. Otra persona ve el error de la API (`403`) al guardar, no antes.
- El acceso en pantalla es el botón **"Editar torneo"** de "Invita tu primer equipo" (torneo en convocatoria sin equipos). Con equipos no hay botón; la ruta funciona igual por URL.

## Agregar equipos

### Reglas de la inscripción (`POST /api/tournaments/:id/teams`)
1. Solo con el torneo en `draft` o `inscripcion` (`409` si ya empezó) y con cupo (`409` "ya tiene todos sus equipos").
2. **Inscribe directo solo el organizador** (o admin), y solo equipos **temporales**, **propios** o, si es admin, cualquiera. Un club de **otro dueño** entra por invitación aceptada (`403` con `code: "invite_required"`) y el dueño de un club entra por solicitud aprobada (`403` con `code: "request_required"`): ver [006](006-solicitudes-de-equipos.md). Otra persona: `403`. El cupo y el estado se comprueban con el torneo bloqueado, así que dos inscripciones simultáneas nunca superan `maxTeams`.
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
- **Detalle del torneo en convocatoria:** pestaña *Inscritos* con la lista y "Quitar", el contador `n/máx`, "Agregar equipo" mientras haya cupo, y **"Iniciar torneo" con 2 equipos o más**. *Solicitudes* (con contador de pendientes) e *Invitados* muestran las solicitudes y las invitaciones reales, con Aceptar/Rechazar y Cancelar invitación ([006](006-solicitudes-de-equipos.md)).
- **Buscar equipo:** clubes reales de la comunidad con su delegado. La acción depende del club: **Invitar** (de otro dueño), **Agregar** (propio), **Aceptar** (pidió unirse), **Cancelar** (ya invitado) o **Quitar** (inscrito). Se ve el contador y se deshabilita si no hay cupo o el torneo empezó.
- **Crear equipo:** formulario de equipo temporal; al terminar vuelve al torneo.
- **Panel de admin (`/admin/torneos`):** cada fila tiene **Editar**, que abre un formulario en ventana con todos los campos menos el organizador (un torneo no cambia de dueño por acá). El mismo formulario crea torneos a nombre de un organizador elegido. Solo aquí se puede cambiar el **estado** a mano (Borrador, Inscripción, En curso, Finalizado).

## Limitaciones conocidas
- **Las sedes no se guardan:** hay que recrearlas en cada torneo. La pantalla "Mis sedes" de ajustes no está conectada. No existe una entidad `Sede`.
- **La búsqueda de dirección no tiene buscador:** se puede usar el texto escrito. El mapa es un marcador de posición y "Usar mi ubicación actual" guarda un texto fijo.
- **Se guardan pero ninguna pantalla los muestra ni tienen efecto:** `rules`, `registrationFee`, `refereeFee`, `assignDelegates`, `playersPerTeam` y el `gender` del torneo. Solo `modality` (en "Mis torneos") y `minutesPerHalf` (duración del horario y del partido en vivo) se usan.
- **"Definir edad"** en la categoría no pregunta la edad.
- **No hay forma de asignar grupos** desde la interfaz (formato `grupos`): solo por API.
- **"Editar torneo" tiene un solo acceso en pantalla:** solo aparece en un torneo en convocatoria sin equipos (ver arriba). Con equipos hay que abrir `/torneos/[id]/editar` a mano o usar el panel de admin.
- **"Omitir este paso"** sale del asistente y descarta lo escrito; no guarda borradores.
