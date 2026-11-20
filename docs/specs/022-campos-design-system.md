# 022 · Campos, selectores y desplegables: un solo estilo, sincronizado con el design system

**Estado:** 🟡 **en curso (2026-11-20).** Hechos: el estilo único, los componentes, la página del design system y el registro de sincronización. Falta migrar los ámbitos (ver *Entregas*).
**Origen:** el usuario vio que los campos, selectores y desplegables del design system no coincidían con los de la plataforma, y que los de la plataforma tampoco coincidían entre sí.
**Toca:** `src/_components/` (componentes nuevos), `src/app/design-system/`, y los formularios de todos los ámbitos. No cambia la API ni la base de datos.

## Hallazgo (auditoría del 2026-11-20)
- El design system era una maqueta aparte (estilos escritos a mano en cada demo, un selector de fecha con dos `<select>` que no existe en la app).
- Unos **280 controles** con al menos **8 estilos distintos**: organizador (relleno, 8 o 4 px de radio), administración (**contorno**, sin relleno), club y jugador (relleno, letra de 16 px), landing y acceso (relleno gris claro con anillo verde), asistente de torneo (4 px), restablecer y cambiar contraseña (solo línea inferior).
- **37 `<select>` nativos** (21 en administración); solo uno tenía la flecha propia. No había un componente de selector.

## Decisiones (tomadas por el usuario, 2026-11-20)
| # | Pregunta | Decisión |
|---|---|---|
| 1 | Landing y acceso | **Mismo estilo que todos**: no hay excepción para la landing. |
| 2 | Administración | **Se alinea al design system.** |
| 3 | Medidas | **Las del club son las finales**, con variables entre desktop y mobile. |
| 4 | Altura y radio | **Sí**: relleno de 12 px y radio de 8 px para todos. |
| 5 | Contraseña (restablecer y cambiar) | **Sí**, se unifican con el resto (adiós a la línea inferior). |
| 6 | Desplegables | **Picklist propio** (no el `<select>` nativo). |
| 7 | Sincronización | **Todo campo, componente, texto o letra nuevo se documenta en el design system, y el design system se comunica con el sistema en los dos sentidos.** |

## El estilo del campo (`field-styles.ts`)
- **Caja:** radio 8 px, borde de 1 px, relleno de 12 px (`px-3 py-3`) y fondo `bg-btn-regular`. El alto sale del texto: unos 46 px en escritorio y 50 px en el celular.
- **Letra:** DM Sans; **16 px en el celular** y **14 px desde 768 px** (`text-base md:text-sm`). *Supuesto a confirmar: las medidas del club son de celular (16 px); para escritorio se tomó 14 px, la densidad del organizador y de administración.*
- **Estados:** normal (sin borde a la vista), hover (borde `border-primary` y fondo de superficie), foco (borde `text-primary`), error (borde rojo, también en hover y foco) y deshabilitado (opacidad 60 %).
- **Marcador:** `text-text-primary/60`.
- Los colores son tokens del ámbito, así el mismo campo se ve bien en el tema oscuro «Cancha» y en el claro.
- La excepción `campo-14` de la hoja «Agregar partido» (especificación 020) desaparece: ese campo adopta la medida común.

## Componentes (`src/_components/`)
| Componente | Para qué |
|---|---|
| `Label` | La etiqueta (DM Sans, 14 px, 600). Ver 020. |
| `Field` | Etiqueta + control + ayuda o error; conecta `aria-describedby` y `aria-invalid`. |
| `TextField` | `input` de texto, correo, número, fecha, hora…; `invalid`, `icon`. |
| `TextArea` | Área de texto. |
| `Picklist` | El desplegable propio: `combobox` + `listbox` accesibles; ↓ ↑ Inicio Fin Enter Espacio Escape Tab y escribir para saltar; `value` / `onChange(value)` / `options`. Lógica pura en `_lib/picklist.ts`. |
| `PasswordInput` | Contraseña con ojo; usa el mismo campo. |
| `DatePicker` / `TimePicker` | Calendario y hora, con la misma caja. |

`className` en estos componentes es solo para disposición (ancho, márgenes); el aspecto nunca se cambia desde afuera.

## Sincronización con el design system
- `/design-system` se muestra en el tema «Cancha» (con un interruptor para ver el claro) y **usa los componentes reales**; la página de campos y la de botones lo hacen ya. Los tokens se imprimen desde el código (`labelText`, `fieldBox`…).
- `src/app/design-system/registro.ts` clasifica **cada archivo de `src/_components/`** como *documentado*, *pendiente* o *de dominio*. La prueba `tests/unit/design-system-registro.test.mjs` falla si un archivo nuevo no está clasificado, si algo documentado deja de importarse, o si la lista de pendientes crece. Hoy hay **17 piezas pendientes** de mostrarse en el design system (menús, pestañas, hojas, barras…): es la deuda visible y solo puede bajar.
- La regla está escrita en el `CLAUDE.md` del repo.

## Entregas
1. ✅ Estilo único, componentes, `Picklist`, registro y página del design system (campos y botones).
2. ⏳ Migrar los formularios por ámbito, en este orden: organizador → asistente de torneo → club y jugador → administración → landing y acceso. En cada uno: `<input>`/`<textarea>` → `TextField`/`TextArea`, `<select>` → `Picklist`, `Field` donde haya etiqueta, y quitar las constantes de estilo propias.
3. ⏳ Una prueba que falle si aparece un `<input>`, `<select>` o `<textarea>` con estilos propios fuera de los componentes.
4. ⏳ Documentar en el design system las piezas pendientes (menús, pestañas, hojas, barras, tipografía y color con los valores reales).

## Criterios de aceptación
- Un campo, un selector y un desplegable se ven y se comportan igual en el organizador, el administrador, el club, el jugador, el asistente de torneo, la landing y el acceso (cada uno con su tema).
- El design system muestra esos mismos componentes y no tiene copias.
- Agregar un componente de interfaz sin clasificarlo en el registro hace fallar las pruebas.
- Pruebas unitarias: lógica del `Picklist`, registro del design system y, con la entrega 3, ausencia de campos con estilo propio.
