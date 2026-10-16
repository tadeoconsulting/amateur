# Instrucciones para Claude en este repo

## Validar antes de trabajar (varios chats en paralelo)

El usuario puede tener dos o más chats abiertos del mismo proyecto. Antes de editar, commitear o abrir un PR, validar:

1. **Dónde estoy:** `git branch --show-current`, `git worktree list` y `git status`. Avisar si el chat comparte carpeta con otro (misma ruta, sin worktree propio) o si hay cambios sin commitear que no son de esta tarea.
2. **Una tarea, una rama, un PR.** Si el trabajo es de otro tema que el de la rama actual, proponer una rama nueva (idealmente en su propio worktree) en vez de mezclarlo.
3. **No cambiar de rama** (`checkout`/`switch`) en una carpeta compartida sin avisar: otro chat podría estar parado ahí.
4. **Commits acotados:** agregar archivos por nombre, nunca `git add -A`, para no llevarse cambios de otro chat.
5. **Antes de abrir o mergear un PR:** comparar con `main` y avisar si otra rama abierta toca los mismos archivos. Los más propensos a conflicto son `package-lock.json`, `prisma/schema.prisma` y `prisma/migrations/`.
6. **Migraciones de Prisma:** nunca correrlas en paralelo desde dos chats contra la misma base. Confirmar con el usuario que ningún otro chat las está usando.
7. **Producción:** no tocar SQL ni datos de producción mientras otro chat prepara un merge. Pedir confirmación explícita.

Si algo de lo anterior no se puede validar, decirlo y preguntar antes de seguir.

## Notion: solo el board de Amateur

Para tareas, pendientes y observaciones del proyecto, consultar únicamente el espacio **Amateur** de Notion (boards "[Amateur] Observaciones", "[Amateur] Tareas" y "[Amateur] Data"). No buscar, leer ni analizar el "[Backlog] General" (Operations) ni otros espacios, aunque aparezcan en los resultados de búsqueda. Si algo parece estar solo ahí, avisar al usuario en vez de abrirlo.
