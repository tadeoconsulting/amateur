"use client";

import { useMemo, useState } from "react";
import { sortRows, type SortDir, type SortValue } from "@/_lib/sort";

type Sort = { key: string; dir: SortDir } | null;

/**
 * Orden por columna de una tabla. `accessors` da, para cada columna, el valor por el que se ordena
 * (defínelo fuera del componente para que sea estable). Sin tocar ninguna columna se conserva el
 * orden con que llegan las filas; al tocar una se ordena ascendente y al volver a tocarla,
 * descendente.
 */
export function useSort<T>(rows: T[] | null | undefined, accessors: Record<string, (row: T) => SortValue>) {
  const [sort, setSort] = useState<Sort>(null);

  const sorted = useMemo(() => {
    if (!rows || !sort) return rows;
    const get = accessors[sort.key];
    return get ? sortRows(rows, get, sort.dir) : rows;
  }, [rows, sort, accessors]);

  const toggle = (key: string) => setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  return { sorted, sort, toggle };
}

function SortIcon({ dir }: { dir: SortDir | null }) {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M5 1L9 6H1L5 1z" fill="currentColor" className={dir === "asc" ? "opacity-100" : "opacity-30"} />
      <path d="M5 13L1 8h8L5 13z" fill="currentColor" className={dir === "desc" ? "opacity-100" : "opacity-30"} />
    </svg>
  );
}

const ALIGN = { left: "text-left", center: "text-center", right: "text-right" } as const;
const JUSTIFY = { left: "justify-start", center: "justify-center", right: "justify-end" } as const;

/** Encabezado de columna que ordena la tabla al tocarlo. */
export function SortTh({
  label,
  sortKey,
  sort,
  onToggle,
  align = "left",
}: {
  label: string;
  sortKey: string;
  sort: Sort;
  onToggle: (key: string) => void;
  align?: keyof typeof ALIGN;
}) {
  const dir = sort?.key === sortKey ? sort.dir : null;
  return (
    <th
      aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}
      className={`px-4 py-3 font-heading text-xs font-semibold uppercase tracking-wider text-text-secondary ${ALIGN[align]}`}
    >
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        className={`inline-flex w-full cursor-pointer items-center gap-1.5 uppercase tracking-wider transition-colors hover:text-text-primary ${JUSTIFY[align]} ${dir ? "text-text-primary" : ""}`}
      >
        {label}
        <SortIcon dir={dir} />
      </button>
    </th>
  );
}
