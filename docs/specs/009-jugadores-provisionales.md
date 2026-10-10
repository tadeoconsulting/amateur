# 009 · Jugadores provisionales

**Estado:** 🟡 **Entrega 1 implementada** (as-built, abajo); la entrega 2 (asignar cuenta y unir perfiles) sigue como propuesta.
**Origen:** el torneo Clausura 2026 de La Ensenada tiene 11 equipos temporales y su lista de jugadores. Se necesita **la tabla de goleadores** con nombres, sin esperar a que cada jugador cree una cuenta, y sin perder esos datos cuando después la creen.
**Toca:** [modelo-de-datos.md](modelo-de-datos.md) (`PlayerProfile`), [004](004-partido-en-vivo.md) (jugadas y goleadores), [001](001-autenticacion-y-permisos.md) (permisos de admin).

## El problema
Hoy un jugador es siempre una **cuenta** (correo único y contraseña): el equipo solo suma cuentas que ya existen (`POST /api/clubs/:id/players` pide un `userId`). Un equipo temporal no tiene jugadores, así que sus goles se registran sin jugador y no salen en goleadores. Inventar correos para crear cuentas rebota correos, duplica personas cuando se registran de verdad, y crea cuentas de menores a sus espaldas.

## Decisiones (tomadas por el usuario)
1. **La lista trae:** nombres, apellidos, club, DNI y fecha de nacimiento. Sin camiseta, posición ni correo. Llega como **archivo JSON** y esta vez se carga **directo con un script**, sin pantalla de carga masiva.
2. **Solo el admin** carga los jugadores provisionales y los asigna a una cuenta. Organizadores y clubes solo pueden **vincular jugadores ya creados** (cuentas), como hoy.
3. **Solo el admin** une perfiles (cuando la cuenta ya tenía ficha).
4. **Lo público es el nombre y la posición.** Si el jugador no tiene posición, no se muestra. El DNI y la fecha de nacimiento nunca son públicos.
5. **Un provisional está en un solo equipo**; para estar en dos necesita cuenta vinculada (un DNI provisional existe una sola vez en toda la plataforma).
6. **Los delegados ven a sus provisionales** (solo lectura).
7. **Los organizadores asignan goles y tarjetas** a los provisionales al registrar un partido, como a cualquier jugador.

## Qué es un jugador provisional
Un `PlayerProfile` **sin cuenta**: `userId` vacío, con sus propios `firstName`, `lastName`, `dni`, `birthDate` y la posición (opcional). Pertenece a un equipo (`clubId`). Todo lo demás —jugadas, estadísticas por torneo, alineaciones— ya cuelga del perfil, no de la cuenta; por eso **asignarle una cuenta no pierde nada**: al perfil se le pone el `userId` y es el mismo perfil.

## Entrega 1 · Cargar y ver goleadores (implementada)

### Cómo se carga
**Lo más simple: pegar las filas de la hoja de cálculo**, sin crear ningún archivo (así tampoco queda un archivo con DNIs en el disco). Se copian las filas de Excel o Google Sheets y se corre (`prisma/cargar-jugadores.ts`):

`pbpaste | npm run db:cargar-jugadores -- --torneo organizador/torneo --archivo - [--aplicar]`

También acepta un archivo (`--archivo ruta.csv` o `.json`).
- **Filas:** nombres, apellidos, club, DNI y fecha de nacimiento. La primera fila puede ser el **encabezado** (en cualquier orden y con variantes: *Nombre*, *Equipo*, *Fecha de nacimiento*...); si no hay encabezado, las columnas se leen en ese orden. Separadas por tabulación (lo que pega una hoja), `;` o `,` (CSV, con comillas si hace falta). En el JSON: `{ "equipo": "LGK", "jugadores": [{ nombres, apellidos, club, dni, fechaNacimiento }] }` (o la lista).
- **Sin `--aplicar` solo simula**: muestra la base a la que apunta (el servidor, sin contraseña), cuántas filas leyó, cuántos jugadores crearía por equipo, los ya cargados y los problemas, y no escribe nada.
- **Con `--aplicar` guarda, pero solo si no hay ningún problema** (todo o nada); si hay, hay que corregir las filas y volver a correr. **Correrlo dos veces no duplica** (lo ya cargado en ese mismo equipo se omite).
- El *club* de cada fila (o el `equipo` del JSON si falta) se busca **entre los equipos inscritos en ese torneo**, por nombre o abreviatura, sin distinguir mayúsculas ni tildes.
- **Validaciones** (cada una avisa la fila, sin contar el encabezado): nombres y apellidos no vacíos; DNI de 8 dígitos (con 7 avisa que la hoja pudo quitar un 0 inicial: en la hoja, la columna del DNI debe tener formato *Texto*); fecha `AAAA-MM-DD` o `DD/MM/AAAA` (**día primero**; el resumen avisa cuántas filas usan esa forma) de un día que existe, pasado y posterior a 1900; club que coincide con un solo equipo del torneo; **DNI repetido en lo pegado** (se marcan todas sus filas); **DNI que ya tiene cuenta** (se avisa para vincularlo, no se duplica); **DNI ya cargado como provisional en otro equipo**.
- **Lógica pura** en `src/_lib/provisional-import.ts` (`parseTable`, `planImport`; con `tests/unit/provisional-import.test.mjs`); el script solo lee la entrada y la base.
- **Datos personales:** los DNIs y fechas de nacimiento (posiblemente de menores) **nunca van al repositorio** —ni en archivos, ni en pruebas, ni en la documentación—: las pruebas usan datos inventados. Si se usa un archivo, va fuera del repo o en `datos-privados/` (git lo ignora).
- **Producción:** se corre desde una terminal normal, con `set -a; . ./.env.local; set +a`, y **después** de agregar las columnas (ver abajo) y de mergear el código.

### Qué cambia en la plataforma
- **Base de datos:** `PlayerProfile.userId` pasa a ser opcional y se agregan `firstName`, `lastName`, `dni` (único) y `birthDate`. SQL para producción (se corre **antes** de mergear; el código anterior sigue funcionando con él):
  ```sql
  ALTER TABLE "PlayerProfile" ALTER COLUMN "userId" DROP NOT NULL;
  ALTER TABLE "PlayerProfile" ADD COLUMN IF NOT EXISTS "firstName" TEXT, ADD COLUMN IF NOT EXISTS "lastName" TEXT, ADD COLUMN IF NOT EXISTS "dni" TEXT, ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3);
  CREATE UNIQUE INDEX IF NOT EXISTS "PlayerProfile_dni_key" ON "PlayerProfile"("dni");
  ```
- **`playerIdentity`** (`_lib/player-identity.ts`, con pruebas): el nombre de un jugador sale de su cuenta si la tiene y, si no, de su perfil. Lo usan la lista de jugadores de un club, las jugadas, la ficha de un jugador y los goleadores.
- **Registro de jugadas:** `GET /api/clubs/:id/players` (la lista que usa el organizador al registrar un gol o una tarjeta, y el delegado para sus titulares) incluye a los provisionales, ordenados por apellido, con `provisional: true`. `POST /api/matches/:id/events` los acepta sin cambios (solo exige que el jugador sea del equipo de la jugada).
- **Goleadores:** la tabla pública muestra *nombre y apellidos*, el club y, **solo si tiene, la posición** ("Alfa FC · Delantero").
- **Delegado:** en *Jugadores* aparece **Sin categoría** (con su cantidad) cuando el club tiene jugadores sin categoría —los provisionales no traen—; cada provisional lleva la etiqueta **Provisional** (sin tilde de verificado) y **no tiene casilla**: no se puede mover ni liberar. En el servidor, `PATCH /api/players/:id` sobre un provisional responde `403` salvo para un admin. El delegado ve su fecha de nacimiento (como la de sus demás jugadores); **el DNI no sale de ninguna API**.
- **Búsqueda de la comunidad** (`GET /api/players`): no incluye provisionales (no hay a quién invitar).
- **Lo que no hay todavía:** ninguna pantalla para ver o editar un provisional como admin (la posición, por ejemplo, se corrige por `PATCH /api/players/:id` o en la base); eso entra con la entrega 2.

## Entrega 2 · Asignar cuenta y unir perfiles (solo admin)
- **Asignar cuenta:** en la ficha del provisional, el admin busca la cuenta por correo o DNI y la vincula. Si no existe, la crea desde el admin (ya genera una contraseña temporal) o espera a que la persona se registre. Se copia el DNI y la fecha de nacimiento a la cuenta solo si están vacíos ahí; si difieren, **se avisa y no se pisa nada**. Luego se muestra el nombre de la cuenta.
- **Unir perfiles:** si esa cuenta **ya tiene ficha en el mismo equipo** (o una ficha libre), el admin ve la advertencia y confirma "Unir": en una sola transacción, las jugadas, alineaciones y estadísticas del provisional pasan a la ficha real (los goles del mismo torneo se suman) y el provisional se elimina. Si la cuenta tiene fichas en otros equipos, no hay conflicto.
- **Organizadores y clubes** no ven estas acciones.

## Lo que implica construir
- **Base de datos:** `PlayerProfile.userId` pasa a ser opcional, más `firstName`, `lastName`, `dni`, `birthDate` (todas opcionales). Las columnas se agregan en producción **antes** de mergear (como `deletedAt`).
- **Código:** hay lugares que asumen `perfil.user` (goleadores, jugadas, alineaciones, listas del club, tabla de equipos); pasarán a leer el nombre del perfil cuando no hay cuenta.
- **Pruebas:** la lógica pura del archivo (normalizar club, validar filas, detectar duplicados) y la unión de perfiles, con pruebas unitarias; el resto, a mano contra la base de pruebas.

## Preguntas resueltas
- **Formato de la lista:** primero JSON; luego se pasó a **filas pegadas desde la hoja de cálculo** (más simple y sin archivos). La fecha se acepta como AAAA-MM-DD o DD/MM/AAAA.
- **¿Un provisional en dos equipos?** No: un DNI, un equipo, hasta tener cuenta.
- **La posición** no viene en la lista; se agrega después (un admin, hoy por `PATCH`) y recién entonces se muestra.
