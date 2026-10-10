# 009 · Jugadores provisionales

**Estado:** 📝 propuesta (definida con el usuario, sin implementar).
**Origen:** el torneo Clausura 2026 de La Ensenada tiene 11 equipos temporales y su lista de jugadores. Se necesita **la tabla de goleadores** con nombres, sin esperar a que cada jugador cree una cuenta, y sin perder esos datos cuando después la creen.
**Toca:** [modelo-de-datos.md](modelo-de-datos.md) (`PlayerProfile`), [004](004-partido-en-vivo.md) (jugadas y goleadores), [001](001-autenticacion-y-permisos.md) (permisos de admin).

## El problema
Hoy un jugador es siempre una **cuenta** (correo único y contraseña): el equipo solo suma cuentas que ya existen (`POST /api/clubs/:id/players` pide un `userId`). Un equipo temporal no tiene jugadores, así que sus goles se registran sin jugador y no salen en goleadores. Inventar correos para crear cuentas rebota correos, duplica personas cuando se registran de verdad, y crea cuentas de menores a sus espaldas.

## Decisiones (tomadas por el usuario)
1. **La lista trae:** nombres, apellidos, club, DNI y fecha de nacimiento. Sin camiseta, posición ni correo.
2. **Solo el admin** carga los jugadores provisionales y los asigna a una cuenta. Organizadores y clubes solo pueden **vincular jugadores ya creados** (cuentas), como hoy.
3. **Solo el admin** une perfiles (cuando la cuenta ya tenía ficha).
4. **Lo público es el nombre y la posición.** Si el jugador no tiene posición, no se muestra. El DNI y la fecha de nacimiento nunca son públicos.

## Qué es un jugador provisional
Un `PlayerProfile` **sin cuenta**: `userId` vacío, con sus propios `firstName`, `lastName`, `dni`, `birthDate` y la posición (opcional). Pertenece a un equipo (`clubId`). Todo lo demás —jugadas, estadísticas por torneo, alineaciones— ya cuelga del perfil, no de la cuenta; por eso **asignarle una cuenta no pierde nada**: al perfil se le pone el `userId` y es el mismo perfil.

## Entrega 1 · Cargar y ver goleadores
- **Carga masiva (admin):** en el panel, el admin elige el torneo y pega o sube la lista (CSV/Excel: nombres, apellidos, club, DNI, fecha de nacimiento). El *club* se busca entre los equipos inscritos en ese torneo, sin distinguir mayúsculas ni tildes.
- **Validación antes de guardar:** se muestra un resumen y no se guarda nada si hay filas inválidas. Se rechazan o avisan: club que no coincide, DNI repetido en el archivo o ya cargado en ese equipo, fecha ilegible, nombres vacíos. Si ya existe una **cuenta con ese DNI**, se avisa para vincularla en vez de crear un provisional.
- **Registro de jugadas:** al registrar un gol o una tarjeta, el organizador elige entre los jugadores del equipo, **provisionales incluidos**, y verá solo su nombre (y posición, si tiene).
- **Goleadores:** la tabla pública muestra *nombre y apellidos* y el club; si el jugador tiene posición, se agrega junto al club.
- **Equipos oficiales:** si el equipo ya tiene delegado (oficializado), este ve a sus provisionales en su plantilla con la etiqueta "Provisional", de solo lectura.
- **Privacidad:** el DNI y la fecha de nacimiento solo los ven el admin (y, para sus jugadores, el delegado que ya los veía hoy); ninguna API pública los devuelve.

## Entrega 2 · Asignar cuenta y unir perfiles (solo admin)
- **Asignar cuenta:** en la ficha del provisional, el admin busca la cuenta por correo o DNI y la vincula. Si no existe, la crea desde el admin (ya genera una contraseña temporal) o espera a que la persona se registre. Se copia el DNI y la fecha de nacimiento a la cuenta solo si están vacíos ahí; si difieren, **se avisa y no se pisa nada**. Luego se muestra el nombre de la cuenta.
- **Unir perfiles:** si esa cuenta **ya tiene ficha en el mismo equipo** (o una ficha libre), el admin ve la advertencia y confirma "Unir": en una sola transacción, las jugadas, alineaciones y estadísticas del provisional pasan a la ficha real (los goles del mismo torneo se suman) y el provisional se elimina. Si la cuenta tiene fichas en otros equipos, no hay conflicto.
- **Organizadores y clubes** no ven estas acciones.

## Lo que implica construir
- **Base de datos:** `PlayerProfile.userId` pasa a ser opcional, más `firstName`, `lastName`, `dni`, `birthDate` (todas opcionales). Las columnas se agregan en producción **antes** de mergear (como `deletedAt`).
- **Código:** hay lugares que asumen `perfil.user` (goleadores, jugadas, alineaciones, listas del club, tabla de equipos); pasarán a leer el nombre del perfil cuando no hay cuenta.
- **Pruebas:** la lógica pura del archivo (normalizar club, validar filas, detectar duplicados) y la unión de perfiles, con pruebas unitarias; el resto, a mano contra la base de pruebas.

## Preguntas abiertas
- ¿Quién entrega la lista al admin y en qué formato (Excel o CSV)? Se asume una fila por jugador, fecha como dd/mm/aaaa.
- ¿Un provisional puede estar en dos equipos? Se asume que **no**: un DNI, un equipo, hasta tener cuenta.
- ¿La posición la agrega alguien después? Se asume que sí, por el admin (o el delegado, si el equipo es oficial).
