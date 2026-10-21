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
13. **Los cambios de schema son aditivos** (columnas opcionales o con valor por defecto) para no romper producción, y **van con su migración** (`prisma/migrations`): ver "Migraciones" en la sección 6.

### 4.3 Interfaz
14. **Nada de datos inventados en pantalla.** Si el dato no existe, no se muestra. Las primeras versiones tenían delegados falsos, links falsos y un "75'" fijo; todos eran mentiras que parecían funcionar.
15. **En español**, mobile-first (contenedor de 430 px). El design system está en `design-system/amateur/`. Todo campo de contraseña usa `PasswordInput` (`_components/password-input.tsx`, con el ojo para verla u ocultarla), nunca un `<input type="password">` suelto.
16. Los estados de carga, error y vacío se diseñan, no se dejan al azar. Los errores de la API se muestran, no se tragan.

### 4.4 Calidad
17. **Toda regla de negocio lleva prueba.** Todo bug corregido lleva la prueba que lo habría detectado.
18. **Se prueba contra una base desechable, nunca contra producción.** Las pruebas de integración escriben datos.
19. Se verifica en un navegador real lo que las pruebas de API no cubren (estado entre pasos, botones tapados, navegación).

## 5. Cómo se prueba

| Comando (desde `app/`) | Qué hace |
|---|---|
| `npm run test:unit` | Pruebas de lógica pura (más de 300). Instantáneas, sin servidor ni base. |
| `npm run test:api` | Pruebas de integración (más de 160) contra un servidor en marcha. Con una base local tardan unos 25 segundos; contra Neon, más de 15 minutos por la latencia. Corren en la CI (job `integracion`). Las de `admin` solo corren si se definen `TEST_ADMIN_EMAIL` y `TEST_ADMIN_PASSWORD`. |
| `npx tsc --noEmit` | Tipos. |
| `npm run lint` | ESLint (hoy: 9 errores y 13 avisos preexistentes, casi todos reglas de React 19). |
| `npm run lint:ci` | Lo que corre la CI: falla si hay **más** errores o avisos que los de `app/.lint-baseline.json`, y también si hay menos (hay que bajar la línea base en el mismo PR). |

`test:auth` es un alias heredado de `test:api` (ejecutan lo mismo).

**Cómo correr las pruebas de integración:** lo más rápido es una base Postgres local desechable (la CI usa un Postgres 16 propio): `npx prisma migrate deploy` sobre ella, `npm run build`, levanta la app con `npx next start -p PUERTO` y ejecuta con `TEST_BASE_URL=http://localhost:PUERTO npm run test:api`. Para las pruebas de admin, `TEST_ADMIN_EMAIL` (termina en `@test.amateur`) y `TEST_ADMIN_PASSWORD` definidos, y la cuenta se crea con `node scripts/crear-admin-de-prueba.mjs` (necesita `DATABASE_URL` apuntando a localhost: se niega a correr contra cualquier otra base). Cada prueba crea sus propios usuarios con un sufijo único, así que no dependen del seed. Una rama de Neon también sirve, pero es unas 40 veces más lenta.

**Cuando cambies un comportamiento que ya tiene prueba, actualiza la prueba en el mismo PR**: la CI la corre y el PR no se mezcla en rojo.

## 6. Operación

**Entornos:** local, preview (una URL por rama, protegida por Vercel) y producción (`amateur-lemon.vercel.app`).

**Los *previews* no tocan nada de producción.** Cada servicio externo tiene su propia configuración en el entorno *Preview* de Vercel:

| Servicio | En producción | En un preview |
|---|---|---|
| Base de datos | rama `production` de Neon | rama `preview` de Neon, creada **solo con el esquema** (sin datos: no hay personas reales ni menores). Se llena registrando cuentas de prueba |
| `AUTH_SECRET` | el de producción | otro distinto: una sesión de un entorno no vale en el otro |
| Correo (`RESEND_API_KEY`, `EMAIL_FROM`) | activo | sin configurar: ningún correo sale (las invitaciones se comparten por link) |
| Tiempo real (`ABLY_API_KEY`) | activo | sin configurar: no hay empuje en vivo y no se publica en los canales reales |

- **Las migraciones de un PR se aplican solas a la base de preview** en cada build (`app/scripts/construir-vercel.mjs`, declarado en `app/vercel.json`), así un PR que cambia el esquema se prueba tal cual. Solo lo hace si el entorno tiene `PREVIEW_DATABASE_OK=1` **y** la base tiene la tabla marca `_entorno_preview` (producción no la tiene): un preview mal configurado nunca migra producción. En producción el build es el de siempre (`npm run build`) y el SQL se sigue aplicando a mano, antes del merge.
- La rama `preview` acumula las migraciones de todos los PR abiertos. Si se ensucia (dos PR con cambios incompatibles, datos raros), se borra y se recrea: `neonctl branches create --project-id spring-darkness-82691326 --name preview --parent production --schema-only`, luego `npx prisma migrate resolve --applied 0_init` y la tabla marca (`CREATE TABLE "_entorno_preview" ("nombre" TEXT PRIMARY KEY); INSERT INTO "_entorno_preview" VALUES ('preview');`) con las URL nuevas en Vercel.
- Las imágenes subidas desde un preview siguen yendo al almacén de Vercel Blob compartido (aceptado: son archivos, no datos de personas).

**Variables de entorno:**

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión de la app (Neon, *pooled*) |
| `DIRECT_URL` | Conexión directa, para `prisma db push` y migraciones |
| `AUTH_SECRET` | Firma de la sesión (≥ 32 caracteres). Sin ella, la app no inicia sesión. |
| `ABLY_API_KEY` | Tiempo real de la ficha del partido ([004](004-partido-en-vivo.md)). Opcional: sin ella, la app funciona igual, solo sin empuje en vivo. |

- `prisma` **no lee `.env.local`**: para usarlo, cargarlo antes (`set -a; . ./.env.local; set +a`).
- `prisma/seed.ts` **borra todo antes de insertar**. Nunca correrlo contra una base con datos reales. Los usuarios del seed tienen un hash inválido: no pueden iniciar sesión, a propósito.
- **Primer administrador:** registrarse en el sitio y correr `npm run db:make-admin -- correo` contra la base correspondiente.
- **Integración continua (`.github/workflows/ci.yml`):** cada PR a `main` corre tres verificaciones: **verificar** (`tsc`, `lint:ci`, pruebas unitarias y `build`), **migraciones** (aplica `prisma/migrations` sobre un Postgres vacío y exige que el resultado sea idéntico a `schema.prisma`) e **integracion** (levanta la app contra un Postgres desechable y corre las pruebas de la API de punta a punta). `main` se protege exigiendo que estén en verde.
- **Migraciones (Prisma):** el esquema ya no se aplica con `db push` en producción. Cada cambio de `schema.prisma` lleva su carpeta en `prisma/migrations`:
  1. Edita `schema.prisma` y corre `npm run db:nueva-migracion -- nombre-corto` (compara contra `origin/main` y escribe el SQL; no toca ninguna base). Revísalo y commitéalo en el mismo PR.
  2. Prueba contra la base de pruebas: `npx prisma db push` (o `npm run db:aplicar-migraciones`).
  3. **Antes de mergear**, aplícalo en producción con la `DIRECT_URL` de producción cargada: `npm run db:aplicar-migraciones`. Es el mismo orden de siempre (la base primero, el código después).
  4. `npm run db:deriva` (con la `DIRECT_URL` de una base cargada) dice si esa base se parece a `schema.prisma`; sirve para auditar producción.
  - La migración `0_init` es la línea base: describe el esquema que producción ya tenía. En cada base que ya existía (producción y pruebas) se marca una sola vez como aplicada: `npx prisma migrate resolve --applied 0_init`.
- **Dependencias:** Dependabot está activo (alertas y actualizaciones de seguridad) y `.github/dependabot.yml` abre cada lunes un PR con las actualizaciones menores y de parche agrupadas. Las versiones **mayores** (Next, React, Prisma, TypeScript, ESLint) se actualizan a mano. Antes de mergear una actualización: `tsc`, lint, pruebas unitarias y `npm run build`. `npm audit --omit=dev` debe quedar en 0; los avisos que quedan en herramientas de desarrollo (lint) no se despliegan.
- **Despliegue:** Vercel construye desde GitHub con Root Directory `app` y framework Next.js. **Mezclar en `main` despliega producción.** `postinstall` genera el cliente de Prisma.

## 7. Flujo de trabajo (por confirmar)

- Una rama por funcionalidad, PR contra `main` y mezclado con *squash*. No se apilan ramas: si un PR depende de otro, se espera a que el primero esté mezclado (borrar la rama base cierra los PR que dependen de ella).
- Un PR no se mezcla sin la CI en verde (`verificar` y `migraciones`) y sin haber revisado el diff en busca de secretos y de datos personales reales (el repositorio es público).
- El PR incluye la especificación que corresponda. Para algo nuevo, primero la especificación y su revisión, después el código.
- Los mensajes de commit se escriben en inglés y explican el porqué, no solo el qué.
