// Orden de filas por columna para las tablas del panel de administración. Lógica pura, sin React.

export type SortDir = "asc" | "desc";
export type SortValue = string | number | null | undefined;

const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

const isEmpty = (v: SortValue) => v === null || v === undefined || v === "";

/**
 * Ordena una copia de `rows` por el valor que da `get`. Texto sin distinguir mayúsculas ni tildes y
 * con números en su orden natural ("Fecha 2" antes de "Fecha 10"); números como números. Los
 * valores vacíos van siempre al final, sea ascendente o descendente. Es estable: lo que empata
 * conserva su orden de entrada.
 */
export function sortRows<T>(rows: readonly T[], get: (row: T) => SortValue, dir: SortDir): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: get(row) }))
    .sort((a, b) => {
      const aEmpty = isEmpty(a.value);
      const bEmpty = isEmpty(b.value);
      if (aEmpty && bEmpty) return a.index - b.index;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      const cmp =
        typeof a.value === "number" && typeof b.value === "number"
          ? a.value - b.value
          : collator.compare(String(a.value), String(b.value));
      return cmp === 0 ? a.index - b.index : cmp * sign;
    })
    .map((x) => x.row);
}
