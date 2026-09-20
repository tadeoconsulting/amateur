# Constitución de Amateur

Los principios que guían cualquier cambio. Están sacados de cómo está construido el proyecto hoy y de los errores que ya se cometieron y corrigieron. Los marcados **(por confirmar)** son prácticas que se siguieron pero que nadie ha declarado como norma: confírmalas o cámbialas.

## 1. Qué es

Plataforma para organizar y seguir torneos de fútbol amateur: organizadores crean torneos y calendarios, los clubes inscriben equipos y jugadores, y se registra el partido en vivo con su marcador y estadísticas.

**Alcance del MVP:** solo fútbol. El enum `Role` incluye `SPONSOR` y `FAN`, pero no tienen ninguna funcionalidad todavía: se avanzan sin validación de investigación de usuarios.

**Perfiles** (un usuario puede tener varios): `JUGADOR`, `CLUB_OWNER` (dueño de un club), `ORGANIZADOR`, `ADMIN`.

## 2. Stack

| Capa | Tecnología |
|---|---|
| Web y API | Next.js 16.3 (App Router), React 19, TypeScript 5 |
| Estilos | Tailwind CSS 4 |
| Datos | PostgreSQL en Neon, Prisma 5 |
| Sesión | `jose` (JWT firmado) en cookie httpOnly; `bcryptjs` para contraseñas |
| Hosting | Vercel (despliegue desde GitHub) |
| Pruebas | `node:test` (sin librerías) |

> **Next 16 no es el Next que conoces.** `middleware` se llama `proxy`, y hay otros cambios. Antes de escribir código de Next, lee la guía relevante en `app/node_modules/next/dist/docs/` (lo pide `app/AGENTS.md`).

## 3. Estructura del código (`app/`)

```
prisma/           schema.prisma, seed.ts (borra todo), make-admin.ts
src/proxy.ts      redirige páginas privadas al login (solo comodidad, ver §4.1)
src/app/
  api/            route handlers: la única puerta a los datos
  (organizador)/  pantallas del organizador (/torneos, /partidos, /jugadores...)
  (club)/club/    pantallas del dueño de club
  (jugador)/jugador/   pantallas del jugador
  (admin)/admin/  panel de administración
  (landing)/      landing y modal de login/registro
  crear-torneo/   asistente de 3 pasos
src/_components/  componentes compartidos
src/_lib/         utilidades (ver reglas abajo)
src/lib/          auth-context (contexto de sesión del cliente)
tests/            integración (contra un servidor) y tests/unit/
```

> Existen `src/_lib` y `src/lib` por herencia; no significan cosas distintas. Unificarlos es deuda menor.

**Reglas para `src/_lib/`:**
- **Lógica pura y compartida** (`fixture.ts`, `match-live.ts`, `tournament-labels.ts`, `match-format.ts`): sin Prisma, sin React y **sin alias `@/`**, porque la usan el servidor, las pantallas y las pruebas unitarias (Node importa el `.ts` directamente). Solo sintaxis de TypeScript borrable (nada de `enum`).
- **Solo servidor:** `auth.ts`, `invite.ts`, `tournament-input.ts`, `prisma.ts`, `session.ts` (este último también lo usa el proxy, por eso no importa Prisma).

## 4. Principios

### 4.1 Seguridad
1. **La seguridad vive en la API, no en la interfaz.** El proxy y los guards de las pantallas son comodidad de navegación; cada route handler valida sesión y permiso por su cuenta.
2. **Toda escritura exige sesión y permiso sobre el recurso concreto** (dueño del torneo, del club, el propio usuario) o `ADMIN`.
3. **El cliente nunca decide quién es.** `organizerId`, `ownerId` e `invitedBy` salen de la sesión; solo un admin puede crear a nombre de otro.
4. **Listas blancas de campos.** Nunca se pasa el body a Prisma. (Un `PATCH` con `data: body` permitía cambiar el dueño de un torneo.)
5. **Los roles se leen de la base en cada request**, no del token: quitar un permiso surte efecto al instante.
6. **Datos personales** (correo, teléfono, fecha de nacimiento, tokens) solo para quien corresponde. Los buscadores devuelven registros reducidos.
7. **Errores de autenticación genéricos** ("Correo o contraseña incorrectos") y comparación de hash aun si el usuario no existe, para no revelar qué correos están registrados.
8. **Ningún secreto en el repositorio.** Se revisa el diff antes de cada commit.

### 4.2 Datos y reglas de negocio
9. **El servidor es la fuente de verdad.** El marcador se deriva de las jugadas en el servidor; la interfaz no calcula reglas.
10. **Lo que toca varias tablas va en una transacción**, y los contadores se incrementan de forma atómica (`increment`), nunca leyendo y escribiendo. (Los goles simultáneos se perdían.)
11. **Un solo nombre por concepto.** Los estados y tipos son listas definidas en un único módulo. (El partido en juego se llamaba `en_curso` y `en_vivo` según la pantalla.)
12. **Validar en el borde** (`tournament-input.ts`, guards de rutas) con mensajes en español, claros y accionables. Las fechas se validan con un chequeo de ida y vuelta: `new Date("2026-02-31")` no falla, devuelve el 3 de marzo.
13. **Los cambios de schema son aditivos** (columnas opcionales o con valor por defecto) para no romper producción. Se aplican con `prisma db push`.

### 4.3 Interfaz
14. **Nada de datos inventados en pantalla.** Si el dato no existe, no se muestra. Las primeras versiones tenían delegados falsos, links falsos y un "75'" fijo; todos eran mentiras que parecían funcionar.
15. **En español**, mobile-first (contenedor de 430 px). El design system está en `design-system/amateur/`.
16. Los estados de carga, error y vacío se diseñan, no se dejan al azar. Los errores de la API se muestran, no se tragan.

### 4.4 Calidad
17. **Toda regla de negocio lleva prueba.** Todo bug corregido lleva la prueba que lo habría detectado.
18. **Se prueba contra una base desechable, nunca contra producción.** Las pruebas de integración escriben datos.
19. Se verifica en un navegador real lo que las pruebas de API no cubren (estado entre pasos, botones tapados, navegación).

## 5. Cómo se prueba

| Comando (desde `app/`) | Qué hace |
|---|---|
| `npm run test:unit` | 64 pruebas de lógica pura. Instantáneas, sin servidor ni base. |
| `npm run test:api` | 108 pruebas de integración contra un servidor en marcha. |
| `npx tsc --noEmit` | Tipos. |
| `npm run lint` | ESLint (hoy: 10 errores y 18 avisos preexistentes, casi todos reglas de React 19). |

`test:auth` es un alias heredado de `test:api` (ejecutan lo mismo).

**Cómo correr las pruebas de integración:** apunta la app a una base desechable (una rama de Neon), levántala en modo producción y ejecuta con `TEST_BASE_URL=http://localhost:PUERTO`. Para las pruebas de admin define `TEST_ADMIN_EMAIL` y `TEST_ADMIN_PASSWORD` (una cuenta con rol `ADMIN` en esa base). Cada prueba crea sus propios usuarios con un sufijo único, así que no dependen del seed. La suite tarda **más de 10 minutos** por la latencia hacia la base.

## 6. Operación

**Entornos:** local, preview (una URL por rama, protegida por Vercel) y producción (`amateur-lemon.vercel.app`).

**Variables de entorno:**

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión de la app (Neon, *pooled*) |
| `DIRECT_URL` | Conexión directa, para `prisma db push` y migraciones |
| `AUTH_SECRET` | Firma de la sesión (≥ 32 caracteres). Sin ella, la app no inicia sesión. |

- `prisma` **no lee `.env.local`**: para usarlo, cargarlo antes (`set -a; . ./.env.local; set +a`).
- `prisma/seed.ts` **borra todo antes de insertar**. Nunca correrlo contra una base con datos reales. Los usuarios del seed tienen un hash inválido: no pueden iniciar sesión, a propósito.
- **Primer administrador:** registrarse en el sitio y correr `npm run db:make-admin -- correo` contra la base correspondiente.
- **Despliegue:** Vercel construye desde GitHub con Root Directory `app` y framework Next.js. **Mezclar en `main` despliega producción.** `postinstall` genera el cliente de Prisma.

## 7. Flujo de trabajo (por confirmar)

- Una rama por funcionalidad, PR contra `main`, mezclado con *merge commit* (no *squash*) para que las ramas apiladas sigan siendo un diff limpio.
- Un PR no se mezcla sin sus pruebas en verde y sin haber revisado el diff en busca de secretos.
- El PR incluye la especificación que corresponda. Para algo nuevo, primero la especificación y su revisión, después el código.
- Los mensajes de commit se escriben en inglés y explican el porqué, no solo el qué.
