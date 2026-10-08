"use client";

import { useEffect, useId, useRef, useState } from "react";

export type MultiOption = { value: string; label: string; hint?: string };

/**
 * Lista desplegable con varias opciones a la vez, para filtrar tablas. Sin nada elegido no filtra
 * ("todos"). Con más de seis opciones trae un buscador. Se cierra al tocar afuera o con Escape.
 */
export function MultiSelect({
  allLabel,
  noun,
  options,
  selected,
  onChange,
  searchPlaceholder = "Buscar...",
}: {
  /** Lo que dice cuando no hay nada elegido: "Todos los equipos". */
  allLabel: string;
  /** Plural para el resumen: "equipos" → "3 equipos". */
  noun: string;
  options: MultiOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const chosen = new Set(selected);
  const summary =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? `1 ${noun.replace(/s$/, "")}`)
        : `${selected.length} ${noun}`;

  const q = query.trim().toLowerCase();
  const visible = q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q)) : options;

  const toggle = (value: string) => onChange(chosen.has(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={`flex max-w-[260px] cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 font-body text-sm outline-none transition-colors focus:border-brand-500 ${
          selected.length > 0 ? "border-brand-500 bg-brand-50 text-text-primary" : "border-border-primary bg-surface-primary text-text-primary"
        }`}
      >
        <span className="truncate">{summary}</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="shrink-0 text-text-secondary">
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-xl border border-border-primary bg-surface-primary shadow-lg">
          {options.length > 6 && (
            <div className="border-b border-border-primary p-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-2 font-body text-sm text-text-primary outline-none focus:border-brand-500"
              />
            </div>
          )}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="font-body text-xs text-text-secondary">
              {selected.length === 0 ? "Sin filtro" : `${selected.length} seleccionado${selected.length === 1 ? "" : "s"}`}
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={selected.length === 0}
              className="cursor-pointer font-heading text-xs font-bold text-text-primary underline disabled:cursor-default disabled:opacity-40 disabled:no-underline"
            >
              Limpiar
            </button>
          </div>
          <ul id={listId} role="listbox" aria-multiselectable="true" className="max-h-64 overflow-y-auto pb-1">
            {visible.map((o) => (
              <li key={o.value} role="option" aria-selected={chosen.has(o.value)}>
                <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-brand-50">
                  <input type="checkbox" checked={chosen.has(o.value)} onChange={() => toggle(o.value)} className="h-4 w-4 shrink-0 cursor-pointer" />
                  <span className="min-w-0 flex-1 truncate font-body text-sm text-text-primary">{o.label}</span>
                  {o.hint && <span className="shrink-0 font-body text-xs text-text-secondary">{o.hint}</span>}
                </label>
              </li>
            ))}
            {visible.length === 0 && <li className="px-3 py-4 text-center font-body text-sm text-text-secondary">Sin resultados</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
