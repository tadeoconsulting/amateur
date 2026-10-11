# 011 · Mesa (quien gestiona el partido en vivo)

**Estado:** ✅ implementada (rama `feat/mesa`).
**Origen:** quien lleva el partido en la cancha ("la mesa") no es el organizador. Necesita registrar goles, tarjetas y el resto del partido en vivo, pero **solo** en el torneo que se le asignó y **solo** los días de juego.
**Toca:** [001](001-autenticacion-y-permisos.md) (un perfil nuevo), [004](004-partido-en-vivo.md) (la pantalla en vivo), [010](010-tiempos-del-partido.md) (tiempos), [modelo-de-datos.md](modelo-de-datos.md).

## Decisiones (tomadas por el usuario)
1. **Quién la crea:** el organizador del torneo **y el admin**. Es un tipo de usuario del **panel admin** (Usuarios), como los demás.
2. **Varias mesas por torneo** (por ejemplo, una por cancha); todas con los mismos permisos.
3. **Una mesa es solo mesa:** la cuenta no puede ser además organizador, delegado, jugador ni admin (mismo criterio que ya rige para los administradores).
4. **Zona horaria: hora de Perú (UTC-5)**, por ahora, para todos los torneos.
5. **"Día de la fecha" = día calendario.**
6. **Ventana de acceso:** desde **1 hora antes** del primer partido del día hasta **1 hora después** de que termine el último (detalle abajo).
7. **Fuera de la ventana** puede iniciar sesión, pero solo ve su próximo turno y no puede hacer nada. El permiso se verifica **en el servidor** en cada acción.
8. **Qué puede hacer** (dentro de su ventana, en los partidos de sus torneos): iniciar el partido, finalizar el 1.er tiempo, iniciar el 2.º, finalizar el partido; registrar goles, tarjetas, cambios y penales; ir a tiempo extra y a penales; deshacer jugadas y corregir el minuto de una jugada. **No puede:** reprogramar, cambiar equipos, borrar partidos, **reabrir** un partido finalizado, **corregir el marcador a mano**, ni tocar el torneo, el fixture, las inscripciones, los jugadores o los clubes.
9. **Funciones adicionales** (titulares, asistencia, acta, sanciones, W.O.): **segunda entrega**.
10. **Cada jugada guarda quién la registró** (visible para el organizador y el admin).
11. **La mesa ve los nombres completos** de los jugadores, también de los menores (como el organizador), **nunca el DNI ni la fecha de nacimiento**.
12. **Pantalla:** un inicio mínimo `/mesa` con los partidos del día; de ahí se abre la **misma** pantalla en vivo del organizador.

## Cómo se crea y se asigna
- El perfil es `MESA` (valor nuevo de `Role`). No se puede elegir al registrarse ni sumar desde "Cambiar de perfil".
- **Organizador:** en su torneo, **Mesa** (junto a *Editar torneo*): lista de mesas, **Agregar mesa** (nombre, apellido y correo) y quitar. Si el correo no existe, se crea la cuenta con una **contraseña temporal que se muestra una sola vez** (como al crear un usuario desde el panel admin; la persona la cambia al entrar); si ya es una cuenta de mesa, solo se le asigna el torneo; si es una cuenta con otros perfiles, `409`.
- **Admin:** crea la cuenta desde **Usuarios** (perfil Mesa) y le asigna **torneos** desde ahí; también puede usar la pantalla del organizador.
- Una mesa puede tener **varios torneos**, de organizadores distintos. Quitarla de un torneo le saca el acceso a sus partidos al instante.

## Ventana de acceso
Lógica pura en `_lib/mesa-window.ts` (con pruebas). Por **torneo asignado** y por **día calendario** (hora de Perú) con partidos que tengan hora:
- **Abre** 1 h antes del primer partido del día.
- **Cierra** según cómo esté el día:
  - todos los partidos del día **finalizados** → **1 h después de que terminó el último**;
  - hay alguno **en curso** → sigue abierta hasta 12 h después del último partido programado (tope para que un partido olvidado no deje el acceso abierto);
  - si no, 4 h después de la hora programada del último partido.
- Los partidos **sin hora** no abren ventana. Si reprograman un partido, la ventana se recalcula sola (sale de la fecha y la hora actuales).
- Se evalúan el día de hoy y el de ayer, para un partido que cruce la medianoche.

## Cómo se aplica
- `matchAccess(user, matchId)` (en `_lib/mesa-server.ts`) decide: admin y organizador del torneo → siempre (como hasta ahora); una mesa asignada → **solo con la ventana abierta** (`403` con `code: "fuera_de_horario"` si no). Lo usan las 3 rutas del partido (`/api/matches/:id`, `…/events`, `…/events/:eventId`).
- A la mesa, `PATCH /api/matches/:id` solo le acepta `status` (de programado a en curso y de en curso a finalizado), `period` y `phase`; cualquier otro campo, `403`.
- `GET /api/matches/:id/events` muestra a la mesa (en ventana) los nombres completos y **quién registró** cada jugada solo a quien gestiona el partido; el público no ve esto.
- Un partido solo se puede gestionar si **tiene hora y su día tiene la ventana abierta** (`matchOpenAt`): un partido de otro día, o sin programar, no, aunque sea del mismo torneo.
- `GET /api/mesa/schedule` (solo una mesa): sus torneos, los partidos del día, si la ventana está abierta y su próximo turno.
- Nuevo `Match.finishedAt` (se fija al finalizar; se borra al reabrir) para calcular el cierre; los partidos ya finalizados usan `updatedAt`.

## Pantallas
- `/mesa`: encabezado con su nombre y **Cerrar sesión**, **Cambiar contraseña**, y los partidos de hoy por torneo con **Gestionar** (ventana abierta) o "Tu próximo turno: …" (cerrada).
- `/mesa/torneos/:id/en-vivo/:matchId`: la pantalla en vivo de siempre; su **Volver** lleva a `/mesa`.
- Al iniciar sesión, una cuenta de mesa entra directo a `/mesa`.

## Base de datos
Valor nuevo del enum y tablas/columnas nuevas; en producción **antes** de mergear (ninguna afecta al código anterior):
- `Role`: `MESA` (el `ALTER TYPE … ADD VALUE` va **solo**, fuera de otras sentencias).
- Tabla `TournamentMesa` (torneo, cuenta, quién la asignó; única por torneo+cuenta).
- `Match.finishedAt`, `MatchEvent.recordedById` (opcionales).

SQL para producción (generado con `prisma migrate diff` contra el esquema anterior). Se corre en **dos pasos**: primero solo el `ALTER TYPE`, después el resto.
```sql
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'MESA';

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "finishedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MatchEvent" ADD COLUMN     "recordedById" TEXT;

-- CreateTable
CREATE TABLE "TournamentMesa" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentMesa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentMesa_userId_idx" ON "TournamentMesa"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentMesa_tournamentId_userId_key" ON "TournamentMesa"("tournamentId", "userId");

-- AddForeignKey
ALTER TABLE "TournamentMesa" ADD CONSTRAINT "TournamentMesa_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMesa" ADD CONSTRAINT "TournamentMesa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMesa" ADD CONSTRAINT "TournamentMesa_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

## API
- Organizador del torneo o admin: `GET /api/tournaments/:id/mesa` (lista), `POST` (con `{ firstName, lastName, email }` crea o asigna; con `{ userId }` asigna una cuenta de mesa que ya existe) y `DELETE /api/tournaments/:id/mesa/:userId` (quitar). El `POST` devuelve la `temporaryPassword` solo cuando creó la cuenta.
- Mesa: `GET /api/mesa/schedule`. El resto de la API del partido (`/api/matches/:id`, `…/events`, `…/events/:eventId`) pasa por `matchAccess`.
- Admin: `GET /api/users` trae `mesaTournaments`; `POST /api/users` y `PATCH /api/users/:id` aceptan el perfil `MESA` (solo, no mezclado: `adminRolesError`).

**Verificado a mano** (base de pruebas): crear una mesa desde el torneo (contraseña temporal, una sola vez) y asignarla otra vez (`409`); un correo con otros perfiles `409`; la agenda de la mesa cerrada (próximo turno) y abierta al reprogramar un partido para hoy; iniciar, pasar por el descanso, registrar un gol (queda "por Mesa Prueba") y finalizar; marcador a mano, reprogramar, borrar y reabrir `403`; un partido de otro día del mismo torneo `403 fuera_de_horario`; quitar la mesa corta el acceso al instante; crear una cuenta de mesa y una mezclada (`400`) desde el panel admin; una mesa no puede sumarse otro perfil; pantalla `/mesa` y la pantalla en vivo desde ahí (sin "Reabrir"). **Falta en producción:** una prueba real con una mesa el día de un partido.
