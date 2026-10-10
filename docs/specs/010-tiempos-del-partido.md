# 010 · Tiempos del partido en vivo

**Estado:** ✅ implementada (rama `feat/tiempos-del-partido`).
**Origen:** el organizador solo podía finalizar el partido entero; el cronómetro corría continuo y la cronología separaba el "segundo tiempo" con una regla fija (minuto 45). Un partido son **dos tiempos**.
**Toca:** [004](004-partido-en-vivo.md) (pantalla en vivo), [modelo-de-datos.md](modelo-de-datos.md) (`Match`, `MatchEvent`).

## Decisiones (tomadas por el usuario)
1. **El 2.º tiempo sigue desde los minutos de un tiempo** (con tiempos de 25 minutos arranca en el 25; con el valor por defecto, en el 35), aunque el primero se haya alargado: un gol "26'" es del segundo tiempo.
2. **Descanso:** solo la etiqueta "Descanso" (sin contador de cuánto lleva). El cronómetro queda congelado en lo que duró el primer tiempo.
3. **Se puede finalizar el partido desde cualquier tiempo** (suspensión, abandono), con una confirmación que dice en qué tiempo está ("¿Finalizar en el 1.er tiempo?").
4. **Partidos ya en vivo al desplegar: no se migran.** Siguen con un solo cronómetro y sin botones de tiempo (`period = null`).
5. **Tiempo extra y penales** (eliminatorias) no cambian: siguen siendo una fase aparte. Solo se puede ir a tiempo extra una vez que empezó el 2.º tiempo.

## Cómo funciona
- Al **iniciar** un partido nuevo queda en `primer_tiempo`. En la pantalla en vivo aparece **Finalizar 1.er tiempo** → pasa a `descanso` (se guarda `firstHalfEndedAt`; se ocultan los botones de jugadas) → **Iniciar 2.º tiempo** (`secondHalfStartedAt`). Del descanso se puede **Volver al 1.er tiempo** (el inicio se corre lo que duró el descanso, para que el reloj no salte).
- **Cronómetro** (`matchClock` en `_lib/match-live.ts`, con pruebas): 1.er tiempo desde `startedAt` sin tope; descanso congelado; 2.º tiempo = minutos de un tiempo + lo que lleva. Un descanso de más de 2 horas se da por olvidado, igual que un partido que pasa de la duración prevista más una hora.
- **Cada jugada guarda `half`** (1 o 2): es lo que separa la cronología, porque el minuto solo no alcanza (un gol en el 38' del primero y otro en el 36' del segundo). La cronología pública usa `half`; un partido sin tiempos se corta por los minutos del torneo (45 si no los tiene).
- **Etiquetas públicas:** "Descanso" en lugar de "En vivo" en la ficha, la lista de partidos y el fixture mientras dura. La pantalla de resultado del organizador muestra la fila **Descanso** entre las jugadas de cada tiempo.
- Cada cambio de tiempo publica la novedad en tiempo real, como cualquier otro cambio del partido.

## API
`PATCH /api/matches/:id` con `{ "period": "descanso" | "segundo_tiempo" | "primer_tiempo" }` (solo con el partido `en_curso`; `409` si la transición no es válida o si el partido no tiene tiempos). `GET` del partido trae `period`, `firstHalfEndedAt`, `secondHalfStartedAt`; las jugadas, `half`. Cambiar de fase (tiempo extra) en el 1.er tiempo o el descanso responde `409`.

## Base de datos
Columnas nuevas y opcionales, se crean en producción **antes** de mergear (no afectan al código anterior):
```sql
-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "firstHalfEndedAt" TIMESTAMP(3),
ADD COLUMN     "period" TEXT,
ADD COLUMN     "secondHalfStartedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MatchEvent" ADD COLUMN     "half" INTEGER;
```

**Verificado a mano** (base de pruebas): iniciar → jugada → descanso → volver al 1.er tiempo → descanso → 2.º tiempo (cronómetro en 25:00 y subiendo) → jugada con `half = 2` → finalizar; saltarse el descanso `409`, `period` inválido `400`, partido sin tiempos `409`; "Descanso" en la ficha pública y en el fixture; la cronología del organizador y la pantalla de resultado separan los tiempos; finalizar desde el descanso.
